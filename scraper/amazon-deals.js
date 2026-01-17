/**
 * ForgeFinds Amazon Deals Scraper
 * Fetches deals from specified Amazon category nodes
 * Transforms to ForgeFinds format with affiliate links
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const STORE_ID = 'forgefinds20-20'; // Your Amazon Associates Tracking ID
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Primary node: 53629917011 (Best Sellers in Electronics/Tech category)
// Add more nodes for broader coverage
const AMAZON_NODES = [
  '53629917011', // Best Sellers - Electronics
];

// Category mapping for node IDs (expand as needed)
const NODE_TO_CATEGORY = {
  '53629917011': 'computers', // Can be "gadgets", "gaming", "computers", etc.
};

// Keywords to extract from product titles for better categorization
const CATEGORY_KEYWORDS = {
  'gaming': ['gaming', 'console', 'ps5', 'xbox', 'gpu', 'cpu', 'monitor', 'keyboard', 'mouse', 'headset', 'chair'],
  'home-theater': ['tv', 'soundbar', 'speaker', 'projector', 'receiver', '4k', 'bluetooth'],
  'gadgets': ['wireless', 'portable', 'charger', 'cable', 'phone', 'tablet', 'watch', 'camera'],
  'computers': ['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'ssd', 'ram', 'processor', 'motherboard', 'nas']
};

/**
 * Scrape a single Amazon best sellers page
 */
async function scrapeAmazonNode(nodeId) {
  const url = `https://www.amazon.com/b?node=${nodeId}`;
  console.log(`[SCRAPE] Fetching ${url}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      timeout: 15000,
    });

    if (!response.ok) {
      console.error(`[ERROR] Failed to fetch ${url}: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const deals = [];

    // Scrape product cards from best-seller list
    // Amazon structure varies, try multiple selectors
    const selectors = [
      'div[data-component-type="s-search-result"]',
      'div.s-result-item',
      'div.a-cardui-card',
    ];

    let found = false;
    for (const selector of selectors) {
      const items = $(selector);
      if (items.length > 0) {
        found = true;
        console.log(`[INFO] Found ${items.length} products using selector: ${selector}`);

        items.each((index, element) => {
          if (index > 20) return; // Limit to top 20 per node

          try {
            const titleEl = $(element).find('h2 a span');
            const priceEl = $(element).find('.a-price-whole');
            const imageEl = $(element).find('img');
            const linkEl = $(element).find('h2 a');

            const title = titleEl.text()?.trim();
            const price = priceEl.text()?.trim();
            const asin = linkEl.attr('data-asin') || linkEl.attr('href')?.match(/\/dp\/([A-Z0-9]+)/)?.[1];
            const imageUrl = imageEl.attr('src');

            if (!title || !asin) {
              return; // Skip incomplete entries
            }

            // Affiliate URL with tracking ID
            const affiliateUrl = `https://amazon.com/dp/${asin}?tag=${STORE_ID}`;

            // Infer sub-category from title
            let subCategory = NODE_TO_CATEGORY[nodeId] || 'gadgets';
            for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
              if (keywords.some(kw => title.toLowerCase().includes(kw))) {
                subCategory = cat;
                break;
              }
            }

            // Extract price as number
            const priceMatch = price?.match(/\$([\d,]+\.?\d*)/);
            const priceNum = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

            const deal = {
              title: sanitizeText(title),
              description: `Amazon best seller in ${NODE_TO_CATEGORY[nodeId]}. Check current price and reviews on Amazon.`,
              price_info: price || 'Check price',
              display_price: price || 'Check price',
              image_url: imageUrl || 'https://via.placeholder.com/300x300?text=Product',
              affiliate_url: affiliateUrl,
              store: 'Amazon',
              category: subCategory,
              tags: generateTags(title),
              slug: asin,
              publish_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
              created_at: new Date().toISOString(),
            };

            deals.push(deal);
          } catch (err) {
            // Skip malformed product entries
            console.warn(`[WARN] Error parsing product:`, err.message);
          }
        });
        break;
      }
    }

    if (!found) {
      console.warn(`[WARN] No products found on ${url}`);
    }

    console.log(`[SUCCESS] Scraped ${deals.length} deals from node ${nodeId}`);
    return deals;
  } catch (error) {
    console.error(`[ERROR] Exception while scraping ${url}:`, error.message);
    return [];
  }
}

/**
 * Sanitize HTML/special characters from text
 */
function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Generate searchable tags from product title
 */
function generateTags(title) {
  if (!title) return [];
  const words = title.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !['with', 'from', 'best', 'amazon', 'pro', 'max', 'plus'].includes(w))
    .slice(0, 8); // Limit to 8 tags
  return [...new Set(words)]; // Remove duplicates
}

/**
 * Main scraper: fetch all nodes
 */
async function scrapeAllDeals() {
  console.log(`\n=== ForgeFinds Scraper Started ===`);
  console.log(`Target nodes: ${AMAZON_NODES.join(', ')}`);
  console.log(`Store ID: ${STORE_ID}\n`);

  let allDeals = [];

  for (const nodeId of AMAZON_NODES) {
    const deals = await scrapeAmazonNode(nodeId);
    allDeals = [...allDeals, ...deals];

    // Be respectful to Amazon: delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n=== Total Deals Scraped: ${allDeals.length} ===\n`);
  return allDeals;
}

module.exports = { scrapeAllDeals, STORE_ID };
