import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import serve from "serve-handler";

const quote = "/ai-service-pricing-calculator";
const guide = "/blog/how-to-price-ai-support-chatbot";
const routes = ["/", quote, "/pricing", "/blog", guide, "/compare"];
const navigation = [
  { path: "/pricing", link: 'nav a[href="/pricing"]' },
  { path: "/blog", link: 'footer a[href="/blog"]' },
  { path: guide, link: `main a[href="${guide}"]` },
];
const built = process.argv.includes("--dist");
const root = new URL("../../../", import.meta.url);
const config = JSON.parse(await readFile(new URL("wrangler.jsonc", root), "utf8"));
const production = new URL(config.vars.APP_BASE_URL).origin;
const report = { status: "unchecked", checked: 0, issues: [], errors: [] };

function readDocument(html) {
  const doc = html === undefined ? document : new DOMParser().parseFromString(html, "text/html");
  const values = (selector, attribute) => Array.from(doc.head.querySelectorAll(selector), (element) =>
    (attribute ? element.getAttribute(attribute) : element.textContent)?.replace(/\s+/g, " ").trim() ?? "");
  return {
    heading: doc.querySelector("main h1")?.textContent?.replace(/\s+/g, " ").trim(),
    head: {
      title: values("title"),
      description: values('meta[name="description" i]', "content"),
      canonical: values('link[rel~="canonical" i]', "href"),
    },
  };
}

function verifyHead(path, mode, actual, source) {
  const url = new URL(path, production).href;
  report.checked += 1;
  for (const [field, values] of Object.entries(actual)) {
    const expected = field === "canonical" ? url : source[field][0];
    if (values.length === 1 && values[0] && values[0] === expected) continue;
    report.issues.push({
      code: `rendered-${field}`,
      mode,
      url,
      expected: expected ?? null,
      actual: values,
    });
  }
}

async function settledHead(page) {
  await page.waitForSelector("main h1", { visible: true });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 });
  return (await page.evaluate(readDocument)).head;
}

async function inspect(browser, origin) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(20000);
  // Keep anonymous QA activity out of analytics without intercepting app asset loads.
  const session = await page.createCDPSession();
  await session.send("Network.enable");
  await session.send("Network.setBlockedURLs", {
    urls: ["*googletagmanager.com/*", "*google-analytics.com/*", "*cloudflareinsights.com/*"],
  });
  const sourceByRoute = new Map();

  async function open(path) {
    const target = new URL(path, origin).href;
    const response = await page.goto(target, { waitUntil: "domcontentloaded" });
    if (response?.status() !== 200 || page.url() !== target) {
      report.issues.push({
        code: "rendered-document",
        mode: "direct",
        url: new URL(path, production).href,
        expected: "HTTP 200 at the requested URL",
        actual: [`HTTP ${response?.status() ?? "unknown"} at ${page.url()}`],
      });
      return false;
    }
    const source = await page.evaluate(readDocument, await response.text());
    sourceByRoute.set(path, source);
    verifyHead(path, "direct", await settledHead(page), source.head);
    return true;
  }

  for (const path of routes) {
    try {
      console.log(`Checking rendered SEO on ${path}`);
      await open(path);
    } catch (error) {
      report.errors.push({ mode: "direct", path, reason: error.message });
    }
  }

  let target = quote;
  try {
    const response = await page.goto(new URL(quote, origin).href, { waitUntil: "domcontentloaded" });
    if (response?.status() !== 200 || !sourceByRoute.has(quote)) {
      throw new Error("The quote calculator could not be opened for in-app navigation");
    }
    await settledHead(page);
    const documentStart = await page.evaluate(() => performance.timeOrigin);
    for (const { path, link } of navigation) {
      target = path;
      const source = sourceByRoute.get(path);
      if (!source?.heading) throw new Error("No page heading from the direct load for this route");
      await page.locator(link).click();
      // The route heading and its metadata commit together. Background requests
      // can outlast that commit on production and need not block this check.
      await page.waitForFunction((pathname, heading) => location.pathname === pathname &&
        document.querySelector("main h1")?.textContent?.replace(/\s+/g, " ").trim() === heading,
      {}, path, source.heading);
      const actual = (await page.evaluate(readDocument)).head;
      if (await page.evaluate(() => performance.timeOrigin) !== documentStart) {
        throw new Error("The link loaded a new document instead of exercising client-side routing");
      }
      verifyHead(path, "navigation", actual, source.head);
    }
  } catch (error) {
    report.errors.push({ mode: "navigation", path: target, reason: error.message });
  }
}

let browser;
let server;
try {
  let origin = production;
  if (built) {
    const dist = fileURLToPath(new URL("../dist/public/", import.meta.url));
    server = createServer((req, res) => serve(req, res, {
      public: dist,
      directoryListing: false,
      trailingSlash: false,
    }));
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  browser = await puppeteer.launch({
    headless: true,
    executablePath,
    channel: executablePath ? undefined : "chrome",
    protocolTimeout: 15000,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  await inspect(browser, origin);
} catch (error) {
  report.errors.push({ mode: "runner", reason: error.message });
} finally {
  await browser?.close();
  server?.close();
}

report.status = report.issues.length ? "failed" : report.errors.length ? "unchecked" : "passed";
const destination = new URL(`.seo-work/rendered${built ? "-built" : ""}.json`, root);
await mkdir(new URL("./", destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Rendered SEO: ${report.status}; ${report.checked} views checked, ${report.issues.length} findings, ${report.errors.length} incomplete checks.`);
for (const finding of report.issues) {
  console.error(`${finding.mode} ${finding.url}: ${finding.code}; expected ${JSON.stringify(finding.expected)}, found ${JSON.stringify(finding.actual)}`);
}
for (const error of report.errors) {
  console.error(`${error.mode} ${error.path ?? ""}: ${error.reason}`);
}
process.exitCode = report.issues.length ? 1 : report.errors.length ? 2 : 0;
