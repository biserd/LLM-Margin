import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import handler from "serve-handler";
import puppeteer from "puppeteer";
import { ALL_ROUTES } from "./seo-routes.mjs";

function resolveChromium() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env.ProgramFiles || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    ];
    return candidates.find((candidate) => candidate && existsSync(candidate));
  }
  try {
    const found = execSync("command -v chromium || command -v chromium-browser || command -v google-chrome", {
      encoding: "utf8",
      shell: "/bin/bash",
    }).trim();
    if (found) return found;
  } catch {}
  return undefined;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist", "public");

const ROUTES = ALL_ROUTES;

const rawBase = process.env.BASE_PATH || "/";
const basePath = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

function makeServer() {
  return http.createServer((req, res) => {
    let url = req.url || "/";
    if (basePath && url.startsWith(basePath)) {
      url = url.slice(basePath.length) || "/";
    }
    req.url = url;
    return handler(req, res, {
      public: distDir,
      rewrites: [{ source: "**", destination: "/index.html" }],
    });
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address().port);
    });
  });
}

async function main() {
  console.log(`[prerender] dist: ${distDir}`);
  console.log(`[prerender] basePath: "${basePath || "/"}"`);

  await fs.access(path.join(distDir, "index.html"));

  const server = makeServer();
  const port = await listen(server);
  const origin = `http://127.0.0.1:${port}`;
  console.log(`[prerender] static server on ${origin}${basePath || ""}`);

  const executablePath = resolveChromium();
  console.log(`[prerender] chromium: ${executablePath || "(puppeteer bundled)"}`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    for (const route of ROUTES) {
      const url = `${origin}${basePath}${route}`;
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setRequestInterception(true);
      page.on("request", async (interceptedRequest) => {
        const requestUrl = new URL(interceptedRequest.url());
        if (requestUrl.origin === origin) {
          await interceptedRequest.continue();
        } else {
          await interceptedRequest.abort();
        }
      });

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        // Wait for actual page content inside the lazy-loaded route, not just
        // the <main> shell (which renders before the Suspense fallback resolves).
        await page.waitForSelector("main h1", { timeout: 15000 });
        // Give React a tick to flush title/meta hoisting and any final renders.
        await new Promise((r) => setTimeout(r, 350));

        const html = await page.content();

        const outDir =
          route === "/"
            ? distDir
            : path.join(distDir, route.replace(/^\//, ""));
        await fs.mkdir(outDir, { recursive: true });
        const outFile = path.join(outDir, "index.html");
        await fs.writeFile(outFile, html, "utf8");
        console.log(
          `[prerender] ${route.padEnd(20)} → ${path.relative(distDir, outFile)}`,
        );
      } catch (err) {
        console.error(`[prerender] FAILED ${route}: ${err.message}`);
        throw err;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`[prerender] done — ${ROUTES.length} routes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
