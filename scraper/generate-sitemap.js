#!/usr/bin/env node

/**
 * ForgeFinds Sitemap Generator
 * Generates sitemap.xml from deals.json
 * Run manually or as part of build process
 */

const fs = require('fs');
const path = require('path');

const DEALS_FILE = path.join(__dirname, '../data/deals.json');
const SITEMAP_FILE = path.join(__dirname, '../sitemap.xml');
const BASE_URL = 'https://forgefinds.com';

function generateSitemap() {
  // Load deals
  let deals = [];
  if (fs.existsSync(DEALS_FILE)) {
    try {
      deals = JSON.parse(fs.readFileSync(DEALS_FILE, 'utf-8'));
    } catch (e) {
      console.warn('Could not load deals.json for sitemap');
    }
  }

  // Static pages
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/browse.html', priority: 0.9, changefreq: 'daily' },
    { url: '/pages/about.html', priority: 0.5, changefreq: 'monthly' },
    { url: '/pages/privacy.html', priority: 0.5, changefreq: 'monthly' },
    { url: '/pages/disclosure.html', priority: 0.5, changefreq: 'monthly' },
    { url: '/pages/contact.html', priority: 0.5, changefreq: 'monthly' },
  ];

  // Dynamic deal pages (if you add individual deal pages later)
  const dealPages = deals.slice(0, 100).map(deal => ({
    url: `/deals/${deal.slug}.html`,
    priority: 0.7,
    changefreq: 'weekly',
    lastmod: new Date(deal.publish_at).toISOString(),
  }));

  // Combine
  const pages = [...staticPages, ...dealPages];

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    page => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${
      page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ''
    }
  </url>`
  )
  .join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP_FILE, xml);
  console.log(`✅ Generated sitemap.xml with ${pages.length} URLs`);
}

if (require.main === module) {
  generateSitemap();
}

module.exports = { generateSitemap };
