import puppeteer from "puppeteer";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base=process.env.TEST_BASE_URL || "http://localhost:8788";
if(!["localhost","127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Use the isolated local test Worker.");
const output=new URL("../../../tests/screenshots/",import.meta.url);await fs.mkdir(output,{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe"});
try {
  const page=await browser.newPage(),errors=[];
  page.setDefaultNavigationTimeout(90000);
  page.on("pageerror",e=>errors.push(e.message));
  await page.setRequestInterception(true);
  page.on("request",r=>new URL(r.url()).origin===base ? r.continue() : r.abort());
  await page.evaluateOnNewDocument(()=>{
    window.testTools={};
    Object.defineProperty(document,"modelContext",{value:{registerTool:tool=>{window.testTools[tool.name]=tool;},unregisterTool:name=>{delete window.testTools[name];}}});
  });
  await page.setViewport({width:1440,height:1000});
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.waitForSelector("main h1");assert.match(await page.$eval("main h1",el=>el.textContent),/Price your AI service/);
  await page.screenshot({path:new URL("home-desktop.png",output).pathname.replace(/^\/([A-Z]:)/,"$1"),fullPage:true});
  await page.goto(base+"/ai-service-pricing-calculator",{waitUntil:"domcontentloaded"});
  await page.waitForSelector('[data-testid="quote-retainer"]');
  await page.waitForFunction(()=>!!window.testTools?.estimate_ai_service);
  assert.match(await page.$eval('[data-testid="quote-retainer"]',el=>el.textContent),/1,500/);
  const tool=await page.evaluate(async()=>JSON.parse((await window.testTools.estimate_ai_service.execute({})).content[0].text));assert.equal(tool.minimumRetainer,1500);
  await page.$eval("#quote-platformCost",el=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;setter.call(el,"150");el.dispatchEvent(new Event("input",{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('[data-testid="quote-retainer"]').textContent.includes("1,800"));
  await page.reload({waitUntil:"domcontentloaded"});await page.waitForFunction(()=>document.querySelector('[data-testid="quote-retainer"]')?.textContent.includes("1,800"));
  await page.screenshot({path:new URL("quote-desktop.png",output).pathname.replace(/^\/([A-Z]:)/,"$1"),fullPage:true});
  await page.setViewport({width:390,height:844});await page.screenshot({path:new URL("quote-mobile.png",output).pathname.replace(/^\/([A-Z]:)/,"$1"),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"Mobile page overflows horizontally");
  await page.goto(base+"/pricing",{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>document.querySelector("main")?.textContent.includes("$29"));
  await page.goto(base+"/quote/00000000-0000-0000-0000-000000000000",{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>document.querySelector("main")?.textContent.includes("private saved quote"));
  assert.deepEqual(errors,[]);console.log("Browser smoke passed: homepage, calculator, WebMCP, draft recovery, mobile layout, pricing, private quote gate.");
} finally { await browser.close(); }
