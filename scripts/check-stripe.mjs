// Uses the existing local integration credential only with Stripe. Never prints keys.
// Reads by default; explicit flags add required webhook events or create/expire a checkout.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const Stripe = require("stripe");
const vars = Object.fromEntries((await readFile(new URL("../.dev.vars",import.meta.url),"utf8")).split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const i=line.indexOf("=");return [line.slice(0,i),line.slice(i+1).trim().replace(/^(["'])(.*)\1$/,"$2")];}));
const stripeKey=process.env.STRIPE_SECRET_KEY || vars.STRIPE_SECRET_KEY;
if(!stripeKey || /placeholder|not_a_real/.test(stripeKey)) throw new Error("A real Stripe integration key is required in STRIPE_SECRET_KEY. Do not paste it in chat or commit it.");
const stripe = new Stripe(stripeKey,{httpClient:Stripe.createFetchHttpClient()});
const account = await stripe.accounts.retrieve();
console.log(JSON.stringify({accountId:account.id,chargesEnabled:account.charges_enabled,mode:stripeKey.includes("_live_")?"live":"test"}));
const hooks = await stripe.webhookEndpoints.list({limit:100});
const matches = hooks.data.filter(h=>h.url==="https://llmmargin.com/api/stripe/webhook");
console.log(JSON.stringify({llmmarginWebhooks:matches.map(h=>({id:h.id,url:h.url,status:h.status,events:h.enabled_events}))}));
if (process.argv.includes("--apply-webhooks")) {
  if(matches.length!==1 || matches[0].status!=="enabled") throw new Error("Expected one enabled LLM Margin webhook; nothing changed.");
  const hook=matches[0], needed=["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed","charge.refunded"];
  if(!hook.enabled_events.includes("*")) {
    const events=[...new Set([...hook.enabled_events,...needed])];
    if(events.length!==hook.enabled_events.length) {
      const updated=await stripe.webhookEndpoints.update(hook.id,{enabled_events:events});
      console.log(JSON.stringify({updatedWebhook:updated.id,events:updated.enabled_events}));
    } else console.log("Required webhook events already enabled.");
  }
}
if (process.argv.includes("--checkout-smoke")) {
  if(!account.charges_enabled) throw new Error("Stripe charges are disabled.");
  let session;
  try {
    session=await stripe.checkout.sessions.create({mode:"payment",line_items:[{quantity:1,price_data:{currency:"usd",unit_amount:2900,product_data:{name:"LLM Margin — one client quote export",description:"Integration smoke check; session is immediately expired. No payment."}}}],metadata:{purpose:"llmmargin_deployment_smoke_no_payment"},success_url:"https://llmmargin.com/pricing",cancel_url:"https://llmmargin.com/pricing",expires_at:Math.floor(Date.now()/1000)+3600,integration_identifier:"llmmargin_quote_cphqwrtn"});
    if(!session.url || new URL(session.url).hostname!=="checkout.stripe.com") throw new Error("No Stripe-hosted checkout URL returned.");
    console.log(JSON.stringify({checkoutCreated:true,host:new URL(session.url).hostname,amount:session.amount_total,currency:session.currency,paymentStatus:session.payment_status}));
  } finally {
    if(session?.status==="open") { const expired=await stripe.checkout.sessions.expire(session.id);console.log(JSON.stringify({checkoutExpired:expired.status==="expired",paymentStatus:expired.payment_status})); }
  }
}
