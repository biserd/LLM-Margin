// Non-mutating production smoke checks. POSTs only call stateless calculations.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const base = process.env.TEST_BASE_URL || "https://llmmargin.com";
if(!["llmmargin.com","www.llmmargin.com","localhost","127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Unexpected verification host");
let count=0;
async function get(path,accept) {
  const r=await fetch(base+path,{headers:accept?{Accept:accept}:{},signal:AbortSignal.timeout(30000)});
  assert.equal(r.status,200,`${path}: ${r.status}`);count++;return r;
}
for(const path of ["/","/ai-service-pricing-calculator","/pricing","/agents","/margin-calculator","/tools"]) {
  const r=await get(path,"text/html");assert.match(r.headers.get("Content-Type"),/text\/html/);assert.match(r.headers.get("Link"),/api-catalog/);assert.match(r.headers.get("Content-Signal"),/ai-input=yes/);
  const html=await r.text();assert.match(html,/<h1/);if(path==="/") assert.match(html,/Price your AI service/);
}
for(const path of ["/openapi.json","/.well-known/api-catalog","/.well-known/agent-card.json","/.well-known/mcp/server-card.json","/.well-known/oauth-authorization-server","/.well-known/oauth-protected-resource","/.well-known/oauth-protected-resource/agent","/.well-known/agent-skills/index.json","/.well-known/webmcp.json"]) await (await get(path)).json();
const md=await get("/","text/markdown");assert.match(md.headers.get("Content-Type"),/text\/markdown/);assert.match(md.headers.get("Vary"),/Accept/);assert.match(await md.text(),/Price your AI service/);
assert.ok((await (await get("/","application/json")).json()).agents.length>=1);
assert.match(await (await get("/auth.md")).text(),/PKCE/);
assert.match(await (await get("/robots.txt")).text(),/Content-Signal:/);
assert.match(await (await get("/sitemap.xml")).text(),/ai-service-pricing-calculator/);
const index=await (await get("/.well-known/agent-skills/index.json")).json();
const skill=await (await get(new URL(index.skills[0].url).pathname)).text();assert.equal(index.skills[0].digest,"sha256:"+createHash("sha256").update(skill).digest("hex"));
assert.equal((await fetch(base+"/agent/quotes")).status,401);
assert.equal((await fetch(base+"/api/quotes")).status,401);
const privatePage=await get("/quote/00000000-0000-0000-0000-000000000000","text/html");assert.match(privatePage.headers.get("X-Robots-Tag"),/noindex/);assert.match(privatePage.headers.get("Cache-Control"),/no-store/);
async function post(path,body) {const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream"},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,`${path}: ${r.status}`);count++;return r.json();}
assert.equal((await post("/api/estimate",{})).minimumRetainer,1500);
const mcp=await post("/mcp",{jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"estimate_ai_service",arguments:{}}});assert.equal(JSON.parse(mcp.result.content[0].text).minimumRetainer,1500);
const a2a=await post("/a2a",{jsonrpc:"2.0",id:1,method:"message/send",params:{message:{kind:"message",role:"user",messageId:crypto.randomUUID(),parts:[{kind:"data",data:{}}]}}});assert.equal(a2a.result.parts[0].data.minimumRetainer,1500);
assert.equal((await (await get("/api/healthz")).json()).status,"ok");
console.log(JSON.stringify({host:base,checkedResponses:count,publicPages:"pass",discovery:"pass",markdown:"pass",privateGates:"pass",restMcpA2a:"pass",payments:"not exercised"},null,2));
