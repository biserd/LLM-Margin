import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuote, defaultQuote, parseQuote, quoteFields } from "../artifacts/api-server/src/worker/quote-model.ts";
test("example pricing includes model calls, support, hosting, contingency and margin",()=>{
  const result=calculateQuote(defaultQuote);
  assert.equal(result.modelCost,270); assert.equal(result.supportCost,180);
  assert.equal(result.bufferedCost,600); assert.equal(result.minimumRetainer,1500);
  assert.equal(result.setupFee,3600); assert.equal(result.firstMonthTotal,5100);
  assert.equal(result.overagePer1000,81); assert.equal(result.doubledUsageMarginPercent,38.4);
});
test("margin is not markup",()=>{
  const q=parseQuote({inputPrice:0,outputPrice:0,supportHours:0,platformCost:100,contingencyPercent:0,marginPercent:50});
  assert.equal(calculateQuote(q).minimumRetainer,200);
});
test("zero costs never produce non-finite results",()=>{
  const q=parseQuote({inputPrice:0,outputPrice:0,platformCost:0,supportHours:0,setupHours:0});
  const r=calculateQuote(q);assert.equal(r.minimumRetainer,0);assert.equal(r.setupFee,0);assert.equal(r.doubledUsageMarginPercent,null);
});
test("all numeric bounds and invalid numeric types are rejected",()=>{
  for(const [key,field] of Object.entries(quoteFields)) {
    for(const value of [-1,field.max+1,NaN,Infinity,"5",null,{},[]]) assert.throws(()=>parseQuote({[key]:value}),undefined,`${key}: ${String(value)}`);
  }
  assert.throws(()=>parseQuote({monthlyRequests:0}));assert.throws(()=>parseQuote({callsPerRequest:0}));
});
test("reject unknown fields, malformed object inputs and oversized text",()=>{
  for(const input of [[],null,1,"quote",{price:1},{toString:1},{scope:"x".repeat(4001)},{title:" "},{agency:null}]) assert.throws(()=>parseQuote(input));
});
test("defaults and trimming are deterministic without mutating caller",()=>{
  const input={client:"  Example  "};const q=parseQuote(input);assert.equal(q.client,"Example");assert.equal(input.client,"  Example  ");
  assert.deepEqual(parseQuote({}),defaultQuote);
});
test("retainer never falls below target margin due to cent rounding",()=>{
  for(let rate=0.001;rate<1;rate+=0.071) {
    const q=parseQuote({inputPrice:rate,marginPercent:95});const r=calculateQuote(q);
    const exact=(q.monthlyRequests*q.callsPerRequest*(q.inputTokens*q.inputPrice+q.outputTokens*q.outputPrice)/1e6+q.supportHours*q.hourlyCost+q.platformCost)*(1+q.contingencyPercent/100);
    assert.ok(r.minimumRetainer+1e-8 >= exact/(1-q.marginPercent/100));
  }
});
