import puppeteer from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const base = process.env.TEST_BASE_URL || "http://localhost:8788";
if (
  !["localhost", "127.0.0.1", "llmmargin.com"].includes(new URL(base).hostname)
)
  throw new Error("Unexpected test host");
const output = new URL("../../../tests/screenshots/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const page = await browser.newPage(),
    errors = [],
    scripts = new Set();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.resourceType() === "script" && new URL(r.url()).origin === base)
      scripts.add(r.url());
  });
  await page.setRequestInterception(true);
  let signedIn = false;
  page.on("request", (r) => {
    if (new URL(r.url()).origin !== base) return r.abort();
    if (new URL(r.url()).pathname === "/api/auth/me")
      return r.respond({
        status: signedIn ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(
          signedIn
            ? { user: { id: "test-only", email: "test@example.invalid" } }
            : { error: "Not signed in" },
        ),
      });
    return r.continue();
  });
  for (const width of [390, 1440]) {
    await page.setViewport({ width, height: 900 });
    await page.goto(base, { waitUntil: "load" });
    assert.equal(
      await page.$eval("#root", (el) => el.dataset.staticPage),
      "home",
    );
    const audit = await new AxePuppeteer(page).analyze();
    assert.deepEqual(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.equal(
      await page.$eval(
        'nav [data-testid="button-get-pro"]',
        (el) => el.tagName,
      ),
      "A",
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`home-accessible-${width}.png`, output)),
      fullPage: true,
    });
    if (width === 390) {
      await page.click("nav summary");
      assert.ok(await page.$eval("nav details", (el) => el.open));
      assert.deepEqual(
        (await new AxePuppeteer(page).analyze()).violations.map((v) => v.id),
        [],
      );
    }
  }
  const scriptBytes = (
    await Promise.all(
      [...scripts].map(
        async (url) => (await (await fetch(url)).arrayBuffer()).byteLength,
      ),
    )
  ).reduce((a, b) => a + b, 0);
  assert.ok(
    scriptBytes < 15000,
    `Homepage loads ${scriptBytes} first-party JS bytes; app runtime should be absent`,
  );
  signedIn = true;
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="button-sign-in"]')?.textContent ===
      "Account",
  );
  assert.equal(
    await page.$eval('[data-testid="button-sign-in"]', (el) => el.textContent),
    "Account",
  );
  assert.equal(
    await page.$eval('[data-testid="button-sign-in"]', (el) =>
      el.getAttribute("href"),
    ),
    "/account",
  );
  signedIn = false;
  // Native navigation must reach the full interactive calculator.
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click('main a[href="/ai-service-pricing-calculator"]'),
  ]);
  await page.waitForSelector("#quote-platformCost");
  await page.waitForFunction(
    () => !!window.document.querySelector('[data-testid="quote-retainer"]'),
  );
  const axCalculator = await new AxePuppeteer(page)
    .withRules(["link-name", "nested-interactive"])
    .analyze();
  assert.deepEqual(
    axCalculator.violations.map((v) => v.id),
    [],
  );
  const noJs = await browser.newPage();
  await noJs.setJavaScriptEnabled(false);
  await noJs.setViewport({ width: 390, height: 900 });
  await noJs.goto(base, { waitUntil: "domcontentloaded" });
  assert.match(
    await noJs.$eval("main h1", (el) => el.textContent),
    /Price your AI service/,
  );
  assert.ok(
    await noJs.$eval(
      'main a[href="/ai-service-pricing-calculator"]',
      (el) => el.getBoundingClientRect().height > 0,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        accessibility: "no axe violations on mobile, desktop or expanded menu",
        firstPartyJsBytes: scriptBytes,
        signedInAccountLink: "pass",
        nativeNavigation: "pass",
        noJavaScriptHomepage: "pass",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
