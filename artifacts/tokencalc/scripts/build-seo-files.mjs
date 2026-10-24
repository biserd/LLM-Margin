import fs from "node:fs/promises";
import { ALL_ROUTES } from "./seo-routes.mjs";
const publicDir = new URL("../public/",import.meta.url);
await fs.writeFile(new URL("sitemap.xml",publicDir),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ALL_ROUTES.map(route=>`  <url><loc>https://llmmargin.com${route}</loc></url>`).join("\n")}\n</urlset>\n`);
await fs.writeFile(new URL("robots.txt",publicDir),`User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\nDisallow: /sign-in\nDisallow: /sign-up\nDisallow: /account\nDisallow: /quote/\nDisallow: /api/quotes\nDisallow: /api/auth\nDisallow: /api/stripe\nDisallow: /agent/\nDisallow: /authorize\nDisallow: /oauth/\n\nSitemap: https://llmmargin.com/sitemap.xml\n`);
