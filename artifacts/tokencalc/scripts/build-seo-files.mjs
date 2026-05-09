// Regenerates public/sitemap.xml and writes a fresh
// .replit-artifact/artifact.edit.toml that the agent applies via the
// verifyAndReplaceArtifactToml callback.
//
// Run: `node scripts/build-seo-files.mjs` from artifacts/tokencalc

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STATIC_ROUTES, COMPARE_PAIR_SLUGS } from "./seo-routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SITEMAP_PRIORITIES = {
  "/": { changefreq: "weekly", priority: "1.0" },
  "/cost-per-user": { changefreq: "weekly", priority: "0.9" },
  "/budget-planner": { changefreq: "weekly", priority: "0.9" },
  "/pricing": { changefreq: "monthly", priority: "0.8" },
  "/contact": { changefreq: "monthly", priority: "0.5" },
  "/blog": { changefreq: "weekly", priority: "0.7" },
  "/blog/how-to-calculate-llm-cost-per-user": { changefreq: "monthly", priority: "0.8" },
  "/blog/ai-api-budget-planning-for-startups": { changefreq: "monthly", priority: "0.8" },
  "/compare": { changefreq: "weekly", priority: "0.7" },
  "/terms": { changefreq: "yearly", priority: "0.3" },
  "/privacy": { changefreq: "yearly", priority: "0.3" },
};

const COMPARE_DEFAULT = { changefreq: "weekly", priority: "0.6" };
const BASE_URL = "https://llmmargin.com";

function buildSitemap() {
  const entries = [];
  for (const route of STATIC_ROUTES) {
    const meta = SITEMAP_PRIORITIES[route];
    if (!meta) continue;
    entries.push({ loc: `${BASE_URL}${route === "/" ? "/" : route}`, ...meta });
  }
  for (const slug of COMPARE_PAIR_SLUGS) {
    entries.push({ loc: `${BASE_URL}/compare/${slug}`, ...COMPARE_DEFAULT });
  }
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (e) =>
          `  <url>\n    <loc>${e.loc}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
      )
      .join("\n") +
    "\n</urlset>\n";
  return xml;
}

function buildArtifactToml() {
  const rewritePaths = [
    "/cost-per-user",
    "/budget-planner",
    "/pricing",
    "/terms",
    "/privacy",
    "/contact",
    "/blog",
    "/blog/how-to-calculate-llm-cost-per-user",
    "/blog/ai-api-budget-planning-for-startups",
    "/compare",
    ...COMPARE_PAIR_SLUGS.map((s) => `/compare/${s}`),
  ];
  const rewriteBlocks = rewritePaths
    .map(
      (p) =>
        `[[services.production.rewrites]]\nfrom = "${p}"\nto = "${p}/index.html"`,
    )
    .join("\n\n");

  return `kind = "web"
previewPath = "/"
title = "TokenCalc"
version = "1.0.0"
id = "artifacts/tokencalc"
router = "path"

[[integratedSkills]]
name = "react-vite"
version = "1.0.0"

[[services]]
name = "web"
paths = [ "/" ]
localPort = 25902

[services.development]
run = "pnpm --filter @workspace/tokencalc run dev"

[services.production]
build = [ "pnpm", "--filter", "@workspace/tokencalc", "run", "build" ]
publicDir = "artifacts/tokencalc/dist/public"
serve = "static"

${rewriteBlocks}

[[services.production.rewrites]]
from = "/*"
to = "/index.html"

[services.env]
PORT = "25902"
BASE_PATH = "/"
`;
}

async function main() {
  const sitemapPath = path.join(root, "public", "sitemap.xml");
  const tomlPath = path.join(root, ".replit-artifact", "artifact.edit.toml");
  await fs.writeFile(sitemapPath, buildSitemap(), "utf8");
  await fs.writeFile(tomlPath, buildArtifactToml(), "utf8");
  console.log(`[seo] wrote ${path.relative(root, sitemapPath)}`);
  console.log(`[seo] wrote ${path.relative(root, tomlPath)}`);
  console.log(
    `[seo] ${STATIC_ROUTES.length} static + ${COMPARE_PAIR_SLUGS.length} compare routes`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
