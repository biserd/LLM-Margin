import { OAuthProvider, AuthorizationError, CimdFetchError, insufficientScope, type OAuthHelpers, type OAuthResourceAuth } from "@cloudflare/workers-oauth-provider";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getSession, HttpError, json, readSmallJson } from "../worker";
import { calculateQuote, quoteInputSchema } from "./quote-model";
import { escapeHtml, listQuotes, quoteById, quoteData, routeQuotes, saveQuote, validatedInput } from "./quotes";

declare global { interface Env { OAUTH_KV: KVNamespace; OAUTH_PROVIDER: OAuthHelpers } }
export const agentBase = "https://llmmargin.com";
export const estimateTool = { name: "estimate_ai_service", description: "Estimate AI service costs, retainer, setup fee, overages and margin in USD. User-supplied model rates. No data saved or purchases made.", inputSchema: quoteInputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } };
const privateTools = [
  { name: "list_quotes", description: "List your private saved quotes. Requires quotes:read.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_quote", description: "Read your saved quote and export entitlement. Requires quotes:read.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "save_quote", description: "Save a new private quote draft after user approval. Requires quotes:write. Does not send, purchase, or export it.", inputSchema: { type: "object", properties: { input: quoteInputSchema }, required: ["input"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } },
];
export async function limitRequests(env: Env, key: string, max = 120) {
  const now = Date.now();
  const row = await env.DB.prepare(`INSERT INTO rate_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END, reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END RETURNING count`).bind(key, now + 60000, now, now).first<{ count: number }>();
  if (row && row.count > max) throw new HttpError(429, "Rate limit reached. Retry in one minute.");
}
export async function handleMcp(request: Request, env: Env, userId?: string, scopes: string[] = []) {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  const origin = request.headers.get("Origin");
  // Browser callers use the same-origin WebMCP interface. Remote MCP clients omit Origin.
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Origin not allowed.");
  const body = await readSmallJson(request);
  const server = new Server({ name: "llmmargin", version: "1.0.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [estimateTool, ...(userId ? privateTools : [])] }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try {
      const args = params.arguments ?? {};
      let result: unknown;
      if (params.name === "estimate_ai_service") result = calculateQuote(validatedInput(args));
      else if (!userId) throw new HttpError(401, "Use /agent/mcp with OAuth to access private quotes.");
      else if (params.name === "list_quotes") result = { quotes: await listQuotes(env, userId) };
      else if (params.name === "get_quote") result = await quoteData(env, await quoteById(env,userId,String(args.id)));
      else if (params.name === "save_quote") {
        if (!scopes.includes("quotes:write")) throw new HttpError(403, "quotes:write is required. Ask the user to reauthorize with this scope.");
        result = await saveQuote(env,userId,args.input);
      } else throw new HttpError(404, "Unknown tool.");
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      return { isError: true, content: [{ type: "text" as const, text: error.message }] };
    }
  });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try { return await transport.handleRequest(request, { parsedBody: body }); }
  finally { await server.close(); }
}
export async function handleA2a(request: Request) {
  if (request.method !== "POST") return new Response(null,{ status:405, headers:{ Allow:"POST" } });
  let body: Record<string, unknown>;
  try { body = await readSmallJson(request); } catch (error) {
    if (error instanceof HttpError && error.status === 413) throw error;
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
  const id = typeof body.id === "string" || typeof body.id === "number" ? body.id : null;
  const fail = (code: number, message: string) => json({ jsonrpc: "2.0", id, error: { code, message } });
  if (body.jsonrpc !== "2.0" || id === null) return fail(-32600,"A JSON-RPC 2.0 request id is required.");
  if (body.method !== "message/send") return fail(-32601,"Only message/send is supported. This agent is synchronous and stateless.");
  const params = body.params as { message?: { kind?: string; role?: string; messageId?: string; parts?: { kind?: string; data?: unknown }[] }; configuration?: { acceptedOutputModes?: string[] } } | undefined;
  if (params?.message?.role !== "user" || typeof params.message.messageId !== "string" || !Array.isArray(params.message.parts) || params.message.parts.length !== 1 || params.message.parts[0]?.kind !== "data") return fail(-32602,"Send one data part with quote inputs, role=user, and a messageId.");
  const outputModes = params.configuration?.acceptedOutputModes;
  if (outputModes !== undefined && (!Array.isArray(outputModes) || !outputModes.every(mode=>typeof mode === "string"))) return fail(-32602,"acceptedOutputModes must be an array of strings.");
  if (outputModes && !outputModes.includes("application/json")) return fail(-32005,"Only application/json output is supported.");
  try {
    const result = calculateQuote(validatedInput(params.message.parts[0].data));
    return json({ jsonrpc: "2.0", id, result: { kind: "message", role: "agent", messageId: crypto.randomUUID(), parts: [{ kind:"data",data:result }] } });
  } catch(error) { return fail(-32602, error instanceof HttpError ? error.message : "Invalid inputs."); }
}
export async function authorize(request: Request, env: Env) {
  const oauth = env.OAUTH_PROVIDER;
  try {
    const session = await getSession(request, env);
    if (request.method === "GET") {
      const authRequest = await oauth.parseAuthRequest(request);
      const details = await oauth.describeConsent(authRequest);
      if (!session) return Response.redirect(`${new URL(request.url).origin}/sign-in?next=${encodeURIComponent(new URL(request.url).pathname + new URL(request.url).search)}`,302);
      const consent = await oauth.beginConsent(authRequest);
      await env.OAUTH_KV.put(`consent-user:${consent.handle}`,session.userId,{expirationTtl:600});
      consent.headers.set("Content-Type","text/html; charset=utf-8");
      consent.headers.set("Cache-Control","no-store");
      consent.headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
      const descriptions: Record<string,string> = { "quotes:read":"Read your private quotes and cost assumptions", "quotes:write":"Create and update your private quote drafts (also allows reading)", offline_access:"Keep access after this session until revoked or expired" };
      return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>Authorize agent — LLM Margin</title><style>body{font:16px/1.6 system-ui;max-width:620px;margin:60px auto;padding:24px}label{display:block;margin:16px 0}button{padding:12px 24px;margin:8px}</style></head><body><h1>Allow ${escapeHtml(details.clientName)} to access LLM Margin?</h1><p>${details.clientDomain ? `Published by <strong>${escapeHtml(details.clientDomain)}</strong>.` : "This app registered itself; its name is not verified."}</p><p>Access will be sent to <strong>${escapeHtml(details.redirectHost)}</strong>.</p>${details.redirectIsLoopback ? "<p><strong>This grants access to an app on your computer. Continue only if you started this connection.</strong></p>" : ""}<p>No permission to charge your card or send proposals to clients is granted. You can revoke access from your account.</p><form method="post" action="/authorize"><input type="hidden" name="handle" value="${escapeHtml(consent.handle)}">${details.scope.map(scope => `<label><input type="checkbox" name="scope" value="${escapeHtml(scope)}" checked> ${escapeHtml(descriptions[scope] || scope)}</label>`).join("")}<button name="decision" value="approve">Allow selected access</button><button name="decision" value="deny">Deny</button></form></body></html>`,{headers:consent.headers});
    }
    if (request.method !== "POST") throw new HttpError(405,"Method not allowed.");
    if (!session) throw new HttpError(401,"Your sign-in expired. Start the agent connection again.");
    if (request.headers.get("Origin") !== new URL(request.url).origin) throw new HttpError(403,"Origin not allowed.");
    const raw = await request.text();
    if (raw.length > 8192) throw new HttpError(413,"Consent form is too large.");
    const form = new URLSearchParams(raw);
    const handle = form.get("handle") ?? "";
    if (await env.OAUTH_KV.get(`consent-user:${handle}`) !== session.userId) throw new HttpError(403,"Your account changed or consent expired. Start the connection again.");
    if (form.get("decision") !== "approve") {
      const denied = await oauth.denyConsent(request,handle);
      await env.OAUTH_KV.delete(`consent-user:${handle}`);
      return new Response(null,{status:302,headers:denied.headers});
    }
    const approved = await oauth.approveConsent(request,handle,{scope:form.getAll("scope")});
    await env.OAUTH_KV.delete(`consent-user:${handle}`);
    const { redirectTo } = await oauth.completeAuthorization({ request:approved.request,userId:session.userId,metadata:{},scope:approved.request.scope,props:{userId:session.userId} });
    approved.headers.set("Location",redirectTo);
    return new Response(null,{status:302,headers:approved.headers});
  } catch(error) {
    if (error instanceof AuthorizationError && error.redirectTo) return Response.redirect(error.redirectTo,302);
    if (error instanceof AuthorizationError || error instanceof CimdFetchError) return new Response("This authorization request is invalid or expired. Start the connection again.",{status:400,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
    throw error;
  }
}
export function withOAuth(defaultHandler: ExportedHandler<Env>, base: string = agentBase) {
  return new OAuthProvider<Env>({
    apiRoute: "/agent/", authorizeEndpoint: "/authorize", tokenEndpoint: "/oauth/token", clientRegistrationEndpoint: "/oauth/register",
    accessTokenTTL: 3600, refreshTokenTTL: 2592000, clientRegistrationTTL: 604800,
    scopesSupported: ["quotes:read","quotes:write","offline_access"], requiredScopes:["quotes:read"],
    clientIdMetadataDocumentEnabled: true,
    resourceMetadata: { resource: `${base}/agent`, authorization_servers: [base], resource_name: "LLM Margin private quotes" },
    defaultHandler,
    apiHandler: { async fetch(request,env,ctx) {
      const authContext = ctx as ExecutionContext & { props: {userId:string}; auth:OAuthResourceAuth };
      const scopes = authContext.auth.scope;
      const canRead = scopes.includes("quotes:read") || scopes.includes("quotes:write");
      if (!canRead) return insufficientScope(authContext.auth,["quotes:read"]);
      const userId = authContext.props.userId;
      await limitRequests(env,`agent-user:${userId}`,60);
      const path = new URL(request.url).pathname;
      if (path === "/agent/mcp") return handleMcp(request,env,userId,scopes);
      if (path.endsWith("/checkout") || path.endsWith("/payment")) throw new HttpError(403,"Purchases require the human website checkout flow.");
      if (!["GET","HEAD"].includes(request.method) && !scopes.includes("quotes:write")) return insufficientScope(authContext.auth,["quotes:write"]);
      return routeQuotes(request,env,userId);
    } },
  });
}
