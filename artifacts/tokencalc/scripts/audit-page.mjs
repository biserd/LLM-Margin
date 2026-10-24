import lighthouse from "lighthouse";
import puppeteer from "puppeteer";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.argv[2] || "https://llmmargin.com/";
const label = process.argv[3] || "audit";
if (!/^[a-z0-9-]+$/.test(label)) throw new Error("Use a simple report label");
if (
  !["llmmargin.com", "localhost", "127.0.0.1"].includes(new URL(url).hostname)
)
  throw new Error("Unexpected audit host");
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const result = await lighthouse(url, {
    port: Number(new URL(browser.wsEndpoint()).port),
    output: ["html", "json"],
    onlyCategories: ["performance", "accessibility", "agentic-browsing"],
    formFactor: "mobile",
    maxWaitForLoad: 45000,
    logLevel: "error",
  });
  if (result.lhr.runtimeError)
    throw new Error(JSON.stringify(result.lhr.runtimeError));
  const dir = new URL("../../../tests/reports/", import.meta.url);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL(`${label}.html`, dir), result.report[0]);
  await writeFile(new URL(`${label}.json`, dir), result.report[1]);
  const a = result.lhr.audits;
  console.log(
    JSON.stringify({
      agentAccessibilityTree: a["agent-accessibility-tree"]?.score,
      agentAccessibilityDetails: a["agent-accessibility-tree"]?.displayValue,
    }),
  );
  console.log(
    JSON.stringify(
      {
        url,
        version: result.lhr.lighthouseVersion,
        performance: result.lhr.categories.performance.score,
        accessibility: result.lhr.categories.accessibility.score,
        metrics: Object.fromEntries(
          [
            "first-contentful-paint",
            "largest-contentful-paint",
            "speed-index",
            "total-blocking-time",
            "cumulative-layout-shift",
          ].map((id) => [id, a[id]?.numericValue]),
        ),
        accessibilityFailures: result.lhr.categories.accessibility.auditRefs
          .map((r) => a[r.id])
          .filter((r) => r.score === 0)
          .map((r) => ({ id: r.id, title: r.title, items: r.details?.items })),
        unusedJs: a["unused-javascript"]?.details?.items,
        unusedCss: a["unused-css-rules"]?.details?.items,
        requests: a["network-requests"]?.details?.items
          ?.filter((r) =>
            ["Script", "Stylesheet", "Font"].includes(r.resourceType),
          )
          .map((r) => ({
            url: r.url,
            bytes: r.transferSize,
            type: r.resourceType,
          })),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
