/**
 * Build-time sitemap generator for Snapeous.
 * Generates sitemap.xml with hreflang for all public routes x languages.
 *
 * Usage: node scripts/generate-sitemap.js
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'https://snapeous.com';
const LANGS = ['en', 'fr', 'es', 'de', 'it', 'pt'];
const PUBLIC_PATHS = ['', '/login', '/register', '/contact', '/blog', '/changelog', '/docs', '/legal-notice', '/privacy', '/terms', '/gdpr'];

function buildUrl(lang, path) {
  return `${BASE_URL}/${lang}${path}`;
}

function generateSitemap() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  for (const path of PUBLIC_PATHS) {
    for (const lang of LANGS) {
      xml += '  <url>\n';
      xml += `    <loc>${buildUrl(lang, path)}</loc>\n`;

      // Add hreflang alternates for all languages
      for (const altLang of LANGS) {
        xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${buildUrl(altLang, path)}" />\n`;
      }
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${buildUrl('en', path)}" />\n`;

      xml += '    <changefreq>weekly</changefreq>\n';
      const priority = path === '' ? '1.0' : ['/contact', '/blog', '/changelog', '/docs'].includes(path) ? '0.8' : '0.6';
      xml += `    <priority>${priority}</priority>\n`;
      xml += '  </url>\n';
    }
  }

  xml += '</urlset>\n';
  return xml;
}

const sitemap = generateSitemap();
const outPath = resolve(__dirname, '../dist/sitemap.xml');

try {
  writeFileSync(outPath, sitemap, 'utf8');
  console.log(`Sitemap generated at ${outPath} (${PUBLIC_PATHS.length * LANGS.length} URLs)`);
} catch {
  // dist/ might not exist yet during dev — write to public/ as fallback
  const fallbackPath = resolve(__dirname, '../public/sitemap.xml');
  writeFileSync(fallbackPath, sitemap, 'utf8');
  console.log(`Sitemap generated at ${fallbackPath} (${PUBLIC_PATHS.length * LANGS.length} URLs)`);
}
