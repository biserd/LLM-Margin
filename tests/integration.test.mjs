import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash, randomUUID } from "node:crypto";
const base=process.env.TEST_BASE_URL || "http://localhost:8788";
if(!["localhost","127.0.0.1"].includes(new URL(base).hostname)) throw new Error("This suite must never run against production.");
const cookieFor=id=>{const data=`${id}.${Date.now()+3600000}`;return `lm_session=${data}.${createHmac("sha256","local-test-session-secret-not-for-production").update(data).digest("base64url")}`;};
const a=cookieFor("test-user-a"),b=cookieFor("test-user-b");
async function call(path,{method="GET",body,cookie,headers={}}={}) {
  return fetch(base+path,{method,redirect:"manual",headers:{...(body?{"Content-Type":"application/json"}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});
}
async function createQuote(cookie=a,input={}) { const r=await call("/api/quotes",{method:"POST",cookie,body:{input}});assert.equal(r.status,201,await r.clone().text());return r.json(); }
async function webhook(type,object) {
  const body=JSON.stringify({id:`evt_${randomUUID()}`,object:"event",type,data:{object}}),timestamp=Math.floor(Date.now()/1000);
  const signature=createHmac("sha256","whsec_local_test_only").update(`${timestamp}.${body}`).digest("hex");
  return fetch(base+"/api/stripe/webhook",{method:"POST",headers:{"Content-Type":"application/json","Stripe-Signature":`t=${timestamp},v1=${signature}`},body});
}
test("Cloudflare Worker quote and agent integration",async t=>{
  let quote;
  await t.test("free estimate and input validation",async()=>{
    const r=await call("/api/estimate",{method:"POST",body:{}});assert.equal(r.status,200);assert.equal((await r.json()).minimumRetainer,1500);
    assert.equal((await call("/api/estimate",{method:"POST",body:{marginPercent:100}})).status,400);
    assert.equal((await call("/api/estimate",{method:"POST",body:{title:"x".repeat(17000)}})).status,413);
  });
  await t.test("private quotes enforce sessions, ownership, revision and CSRF",async()=>{
    assert.equal((await call("/api/quotes")).status,401);
    quote=await createQuote(a,{title:'<script>alert("x")</script>',agency:"=DANGEROUS()",client:"Client"});
    assert.equal((await call(`/api/quotes/${quote.id}`,{cookie:b})).status,404);
    const saved=await call(`/api/quotes/${quote.id}`,{method:"PUT",cookie:a,body:{input:quote.input,revision:quote.revision}});assert.equal(saved.status,200);
    assert.equal((await call(`/api/quotes/${quote.id}`,{method:"PUT",cookie:a,body:{input:quote.input,revision:quote.revision}})).status,409);
    assert.equal((await call("/api/quotes",{method:"POST",cookie:a,body:{input:{}},headers:{Origin:"https://evil.example"}})).status,403);
    assert.equal((await call(`/api/quotes/${quote.id}/export`,{cookie:a})).status,402);
  });
  await t.test("unpaid checkout cannot grant exports; signed paid webhook is idempotent",async()=>{
    const checkout={id:`cs_test_${randomUUID()}`,object:"checkout.session",mode:"payment",payment_status:"unpaid",amount_total:2900,currency:"usd",client_reference_id:"test-user-a",payment_intent:`pi_${randomUUID()}`,metadata:{product:"quote_export_v1",quoteId:quote.id,userId:"test-user-a"}};
    assert.equal((await webhook("checkout.session.completed",checkout)).status,200);
    assert.equal((await call(`/api/quotes/${quote.id}/export`,{cookie:a})).status,402);
    checkout.payment_status="paid";
    assert.equal((await webhook("checkout.session.async_payment_succeeded",checkout)).status,200);
    assert.equal((await webhook("checkout.session.completed",checkout)).status,200);
    const html=await call(`/api/quotes/${quote.id}/export`,{cookie:a});assert.equal(html.status,200);assert.match(html.headers.get("Cache-Control"),/no-store/);
    const body=await html.text();assert.ok(!body.includes('<script>alert("x")</script>'));assert.ok(!body.includes("Target gross margin"));
    const csv=await call(`/api/quotes/${quote.id}/export?format=csv`,{cookie:a});assert.match(await csv.text(),/'=DANGEROUS/);
    assert.equal((await call(`/api/quotes/${quote.id}/export`,{cookie:b})).status,404);
    assert.equal((await webhook("charge.refunded",{object:"charge",id:"ch_test",refunded:true,payment_intent:checkout.payment_intent})).status,200);
    assert.equal((await call(`/api/quotes/${quote.id}/export`,{cookie:a})).status,402);
    await webhook("checkout.session.completed",checkout);
    assert.equal((await call(`/api/quotes/${quote.id}/export`,{cookie:a})).status,402);
    assert.equal((await call(`/api/quotes/${quote.id}/checkout`,{method:"POST",cookie:a,body:{}})).status,409,"Do not charge again for a refunded quote");
  });
  await t.test("refund delivered before checkout completion cannot resurrect entitlement",async()=>{
    const q=await createQuote(),intent=`pi_${randomUUID()}`;
    await webhook("charge.refunded",{object:"charge",id:"ch_test",refunded:true,payment_intent:intent});
    const paid={id:`cs_test_${randomUUID()}`,object:"checkout.session",mode:"payment",payment_status:"paid",amount_total:2900,currency:"usd",client_reference_id:"test-user-a",payment_intent:intent,metadata:{product:"quote_export_v1",quoteId:q.id,userId:"test-user-a"}};
    assert.equal((await webhook("checkout.session.completed",paid)).status,200);
    assert.equal((await call(`/api/quotes/${q.id}/export`,{cookie:a})).status,402);
    const unsigned=await call("/api/stripe/webhook",{method:"POST",body:{}});assert.equal(unsigned.status,400);
  });
  await t.test("active Pro users retain exports without purchasing",async()=>{
    const cookie=cookieFor("test-user-pro"),q=await createQuote(cookie);
    assert.equal(q.exportUnlocked,true);assert.equal((await call(`/api/quotes/${q.id}/export`,{cookie})).status,200);
    const r=await call(`/api/quotes/${q.id}/checkout`,{method:"POST",cookie,body:{}});assert.equal(r.status,200);assert.match((await r.json()).url,/\/quote\//);
  });
  await t.test("public metadata is typed and skill digest matches content",async()=>{
    for(const path of ["/openapi.json","/.well-known/api-catalog","/.well-known/agent-card.json","/.well-known/mcp/server-card.json","/.well-known/oauth-authorization-server","/.well-known/oauth-protected-resource"]) {const r=await call(path);assert.equal(r.status,200,path);await r.json();}
    const index=await (await call("/.well-known/agent-skills/index.json")).json();const skill=await (await call(new URL(index.skills[0].url).pathname)).text();assert.equal(index.skills[0].digest,"sha256:"+createHash("sha256").update(skill).digest("hex"));
    assert.equal((await call("/.well-known/absent.json")).status,404);
    const md=await call("/",{headers:{Accept:"text/markdown"}});assert.equal(md.status,200);assert.match(md.headers.get("Content-Type"),/text\/markdown/);assert.match(md.headers.get("Vary"),/Accept/);assert.match(await md.text(),/Price your AI service/);
    assert.equal((await call("/missing/index.md")).status,404);
    const html=await call("/",{headers:{Accept:"text/markdown;q=0,text/html;q=1"}});assert.match(html.headers.get("Content-Type"),/text\/html/);
  });
  await t.test("MCP and A2A compute actual results",async()=>{
    const headers={Accept:"application/json, text/event-stream"};
    const init=await call("/mcp",{method:"POST",headers,body:{jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"local-test",version:"1"}}}});assert.equal(init.status,200,await init.clone().text());
    const r=await call("/mcp",{method:"POST",headers:{...headers,"MCP-Protocol-Version":"2025-11-25"},body:{jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"estimate_ai_service",arguments:{}}}});assert.equal(r.status,200);assert.equal(JSON.parse((await r.json()).result.content[0].text).minimumRetainer,1500);
    const a2a=await call("/a2a",{method:"POST",body:{jsonrpc:"2.0",id:1,method:"message/send",params:{message:{kind:"message",role:"user",messageId:randomUUID(),parts:[{kind:"data",data:{}}]}}}});assert.equal((await a2a.json()).result.parts[0].data.minimumRetainer,1500);
    const malformed=await call("/a2a",{method:"POST",body:{jsonrpc:"2.0",id:2,method:"message/send",params:{message:{role:"user",messageId:randomUUID(),parts:[null]}}}});assert.equal((await malformed.json()).error.code,-32602);
    assert.equal((await call("/agent/quotes")).status,401);
  });
  await t.test("OAuth PKCE, user consent, scope enforcement and revocation",async()=>{
    const registration=await call("/oauth/register",{method:"POST",body:{client_name:"Local integration test",redirect_uris:["http://127.0.0.1:8844/callback"],grant_types:["authorization_code","refresh_token"],response_types:["code"],token_endpoint_auth_method:"none"}});
    assert.equal(registration.status,201,await registration.clone().text());const client=await registration.json();
    const verifier="test-verifier-"+"a".repeat(48),challenge=createHash("sha256").update(verifier).digest("base64url");
    const query=new URLSearchParams({response_type:"code",client_id:client.client_id,redirect_uri:"http://127.0.0.1:8844/callback",scope:"quotes:read",state:"local-state",code_challenge:challenge,code_challenge_method:"S256",resource:`${base}/agent`});
    const consent=await call(`/authorize?${query}`,{cookie:a});assert.equal(consent.status,200,await consent.clone().text());
    const html=await consent.text();const handle=html.match(/name="handle" value="([^"]+)"/)?.[1];assert.ok(handle);
    const cookies=[a,...consent.headers.getSetCookie().map(value=>value.split(";")[0])].join("; ");
    const approved=await fetch(base+"/authorize",{method:"POST",redirect:"manual",headers:{"Content-Type":"application/x-www-form-urlencoded",Origin:base,Cookie:cookies},body:new URLSearchParams({handle,decision:"approve",scope:"quotes:read"})});
    assert.equal(approved.status,302,await approved.clone().text());const callback=new URL(approved.headers.get("Location"));assert.equal(callback.searchParams.get("state"),"local-state");
    const token=await fetch(base+"/oauth/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",code:callback.searchParams.get("code"),client_id:client.client_id,redirect_uri:"http://127.0.0.1:8844/callback",code_verifier:verifier,resource:`${base}/agent`})});assert.equal(token.status,200,await token.clone().text());
    const credential=await token.json(),headers={Authorization:`Bearer ${credential.access_token}`};
    const allowed=await call("/agent/quotes",{headers});assert.equal(allowed.status,200,await allowed.text());
    assert.equal((await call("/agent/quotes",{method:"POST",headers,body:{input:{}}})).status,403);
    assert.equal((await call(`/agent/quotes/${quote.id}/checkout`,{method:"POST",headers,body:{}})).status,403);
    const grants=await (await call("/api/agent-connections",{cookie:a})).json();const grant=grants.items.find(g=>g.clientId===client.client_id);assert.ok(grant);
    assert.equal((await call("/api/agent-connections",{method:"POST",cookie:a,body:{grantId:grant.id}})).status,200);
    assert.equal((await call("/agent/quotes",{headers})).status,401);
    query.set("scope","quotes:write offline_access");
    const writeConsent=await call(`/authorize?${query}`,{cookie:a});const writeHtml=await writeConsent.text();
    const writeHandle=writeHtml.match(/name="handle" value="([^"]+)"/)?.[1];assert.ok(writeHandle);
    const consentCookies=writeConsent.headers.getSetCookie().map(value=>value.split(";")[0]);
    const consentBody=new URLSearchParams({handle:writeHandle,decision:"approve"});consentBody.append("scope","quotes:write");consentBody.append("scope","offline_access");
    const switched=await fetch(base+"/authorize",{method:"POST",redirect:"manual",headers:{"Content-Type":"application/x-www-form-urlencoded",Origin:base,Cookie:[b,...consentCookies].join("; ")},body:consentBody});assert.equal(switched.status,403,"Consent must not switch account");
    const writeApproved=await fetch(base+"/authorize",{method:"POST",redirect:"manual",headers:{"Content-Type":"application/x-www-form-urlencoded",Origin:base,Cookie:[a,...consentCookies].join("; ")},body:consentBody});assert.equal(writeApproved.status,302,await writeApproved.clone().text());
    const writeCode=new URL(writeApproved.headers.get("Location")).searchParams.get("code");
    const writeToken=await fetch(base+"/oauth/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",code:writeCode,client_id:client.client_id,redirect_uri:"http://127.0.0.1:8844/callback",code_verifier:verifier,resource:`${base}/agent`})});assert.equal(writeToken.status,200);
    const writeCredential=await writeToken.json(),writeHeaders={Authorization:`Bearer ${writeCredential.access_token}`};assert.ok(writeCredential.refresh_token);
    assert.equal((await call("/agent/quotes",{headers:writeHeaders})).status,200,"Write scope includes read access");
    const agentSaved=await call("/agent/quotes",{method:"POST",headers:writeHeaders,body:{input:{title:"Agent draft"}}});assert.equal(agentSaved.status,201,await agentSaved.clone().text());
    const agentQuote=await agentSaved.json();assert.equal((await call(`/api/quotes/${agentQuote.id}`,{cookie:b})).status,404);
  });
});
