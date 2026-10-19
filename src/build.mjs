/**
 * Mini-SSG pro zrakovyterapeut.cz.
 * Skládá stránky z layoutu (src/layout.html) a obsahu (src/pages/*.html),
 * generuje sitemap.xml, robots.txt, kopíruje statiku do public/.
 *
 * Formát stránky: prvních 6 řádků hlavička "Klíč: hodnota", pak prázdný řádek, pak HTML.
 * Povinné klíče: Title, Description, Slug, H1 (h1 se nevkládá automaticky, patří do obsahu).
 * Volitelné: Schema (název souboru v src/schema/*.json bez přípony), Breadcrumb (např. "Diagnózy|/diagnozy").
 */

import { readdir, readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const pagesDir = join(srcDir, "pages");
const schemaDir = join(srcDir, "schema");
const outDir = join(root, "public");
const SITE = "https://zrakovyterapeut.cz";

const layout = await readFile(join(srcDir, "layout.html"), "utf8");

function esc(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

function breadcrumbsFor(name, href) {
  const items = [{ name: "Úvod", href: "/" }];
  if (name && href) items.push({ name, href });
  const crumbs = items
    .map((c) => `<a href="${c.href}">${esc(c.name)}</a>`)
    .join('<span aria-hidden="true"> › </span>');
  return `<nav class="wrap crumbs" aria-label="Drobečková navigace">${crumbs}</nav>`;
}

const files = (await readdir(pagesDir)).filter((f) => f.endsWith(".html")).sort();
const urls = [];

for (const file of files) {
  const raw = await readFile(join(pagesDir, file), "utf8");
  const [head, ...bodyParts] = raw.split("\n\n");
  const meta = {};
  for (const line of head.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const key of ["Title", "Description", "Slug"]) {
    if (!meta[key]) throw new Error(`${file}: chybí povinný klíč ${key}`);
  }
  const body = bodyParts.join("\n\n").trim();
  const slug = meta.Slug === "/" ? "/" : `/${meta.Slug}`;
  const canonical = slug === "/" ? `${SITE}/` : `${SITE}${slug}`;

  let schema = "";
  if (meta.Schema) {
    const json = await readFile(join(schemaDir, `${meta.Schema}.json`), "utf8");
    const withUrl = json
      .replaceAll("{{canonical}}", canonical)
      .replaceAll("{{date}}", meta.Date || new Date().toISOString().slice(0, 10))
      .replaceAll("{{schemaname}}", (meta.SchemaName || meta.Title).replaceAll('"', ""));
    schema = `<script type="application/ld+json">\n${withUrl}\n</script>`;
  }

  const crumbs = slug === "/" ? "" : breadcrumbsFor(meta.BreadcrumbName, meta.BreadcrumbHref);

  const html = layout
    .replaceAll("{{title}}", esc(meta.Title))
    .replaceAll("{{description}}", esc(meta.Description))
    .replaceAll("{{canonical}}", canonical)
    .replaceAll("{{schema}}", schema)
    .replaceAll("{{breadcrumbs}}", crumbs)
    .replaceAll("{{content}}", body);

  const outName = slug === "/" ? "index.html" : `${meta.Slug}.html`;
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, outName), html);
  urls.push(slug);
  console.log(`OK ${outName}`);
}

// 404
const notFound = layout
  .replaceAll("{{title}}", "Stránka nenalezena | Zrakovýterapeut.cz")
  .replaceAll("{{description}}", "Požadovaná stránka neexistuje.")
  .replaceAll("{{canonical}}", `${SITE}/404`)
  .replaceAll("{{schema}}", "")
  .replaceAll("{{breadcrumbs}}", "")
  .replaceAll(
    "{{content}}",
    "<h1>Stránka nenalezena (404)</h1><p>Omlouváme se, ale tato stránka neexistuje. Zkuste <a href=\"/\">úvodní stránku</a> nebo <a href=\"/diagnozy\">přehled diagnóz</a>.</p>"
  );
await writeFile(join(outDir, "404.html"), notFound);

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u === "/" ? `${SITE}/` : `${SITE}${u}`}</loc><lastmod>${today}</lastmod></url>`)
  .join("\n")}\n</urlset>\n`;
await writeFile(join(outDir, "sitemap.xml"), sitemap);

// robots.txt
await writeFile(join(outDir, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// statika
await cp(join(srcDir, "static"), outDir, { recursive: true });
console.log(`Hotovo: ${urls.length} stránek.`);
