#!/usr/bin/env node

/**
 * ForgeFinds Deal Update Script
 * 
 * Runs daily:
 * 1. Scrapes latest Amazon deals
 * 2. Merges with existing deals (deduplicates)
 * 3. Removes expired deals
 * 4. Applies price/discount derivation
 * 5. Writes updated deals.json
 * 6. Reports summary
 */

const fs = require('fs');
const path = require('path');
const { scrapeAllDeals } = require('./amazon-deals');

const DEALS_FILE = path.join(__dirname, '../data/deals.json');
const MAX_DEALS = 300; // Keep latest 300 deals max
const DEAL_RETENTION_DAYS = 90; // Remove deals older than 90 days

/**
 * Load existing deals from deals.json
 */
function loadExistingDeals() {
  if (!fs.existsSync(DEALS_FILE)) {
    console.log('[INFO] No existing deals.json found, starting fresh');
    return [];
  }

  try {
    const content = fs.readFileSync(DEALS_FILE, 'utf-8');
    const deals = JSON.parse(content);
    console.log(`[INFO] Loaded ${deals.length} existing deals`);
    return Array.isArray(deals) ? deals : [];
  } catch (error) {
    console.error(`[ERROR] Failed to parse deals.json: ${error.message}`);
    return [];
  }
}

/**
 * Filter out expired deals
 */
function removeExpiredDeals(deals) {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - DEAL_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const filtered = deals.filter(deal => {
    const expiryDate = new Date(deal.expires_at || deal.created_at || '1970-01-01');
    return expiryDate > now; // Keep only deals that haven't expired yet
  });

  const removed = deals.length - filtered.length;
  if (removed > 0) {
    console.log(`[CLEANUP] Removed ${removed} expired deals`);
  }

  return filtered;
}

/**
 * Merge new deals with existing, avoiding duplicates
 * Prioritize by slug (ASIN) and store to detect duplicates
 */
function mergeDeals(existingDeals, newDeals) {
  const existingMap = new Map();

  // Map existing deals by slug + store for deduplication
  existingDeals.forEach(deal => {
    const key = `${deal.slug}||${deal.store}`;
    existingMap.set(key, deal);
  });

  let newCount = 0;
  let updateCount = 0;

  // Process new deals
  newDeals.forEach(newDeal => {
    const key = `${newDeal.slug}||${newDeal.store}`;

    if (existingMap.has(key)) {
      // Update existing deal with new info (keep older publish_at though)
      const existing = existingMap.get(key);
      existingMap.set(key, {
        ...existing,
        ...newDeal,
        publish_at: existing.publish_at, // Keep original publish date
        created_at: existing.created_at,
      });
      updateCount++;
    } else {
      // New deal
      existingMap.set(key, newDeal);
      newCount++;
    }
  });

  console.log(`[MERGE] Added ${newCount} new deals, updated ${updateCount} existing`);

  // Convert back to array, sort by publish_at (newest first)
  const merged = Array.from(existingMap.values())
    .sort((a, b) => new Date(b.publish_at) - new Date(a.publish_at))
    .slice(0, MAX_DEALS); // Keep top 300 newest

  return merged;
}

/**
 * Apply price/discount derivation (same logic as deals.js)
 * Extracts __price and __pctOff for filtering/sorting
 */
function deriveNumbers(deals) {
  return deals.map(d => {
    // Extract price from display_price or price_info
    const priceMatch = (d.display_price || d.price_info || '').match(/\$?([\d,]+(?:\.\d{1,2})?)/);
    let price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

    // Extract discount info
    const couponText = (d.coupon || '').toLowerCase();
    const dollarOffMatch = couponText.match(/\$(\d+(?:\.\d{1,2})?)\s*off/);
    const percentOffMatch = (couponText + (d.price_info || '')).match(/(\d{1,3})\s*%\s*off/i);

    let percentOff = null;

    // Apply coupon discounts to price
    if (price != null) {
      if (percentOffMatch) {
        const pct = parseFloat(percentOffMatch[1]);
        percentOff = pct;
        price = Math.round(price * (1 - pct / 100) * 100) / 100;
      }
      if (dollarOffMatch) {
        const off = parseFloat(dollarOffMatch[1]);
        price = Math.max(0, Math.round((price - off) * 100) / 100);
      }
    }

    // Fallback: extract "was $X" for percent calculation
    if (percentOff === null && price != null) {
      const wasMatch = (d.price_info || '').match(/was\s*\$?([\d,]+(?:\.\d{1,2})?)/i);
      if (wasMatch) {
        const original = parseFloat(wasMatch[1].replace(/,/g, ''));
        if (original > price) {
          percentOff = Math.round(100 * (1 - price / original));
        }
      }
    }

    return {
      ...d,
      __price: price,
      __pctOff: percentOff,
    };
  });
}

/**
 * Main update function
 */
async function updateDeals() {
  try {
    console.log('\n╔═══════════════════════════════════╗');
    console.log('║  ForgeFinds Deal Update Script    ║');
    console.log('║  ' + new Date().toLocaleString() + '     ║');
    console.log('╚═══════════════════════════════════╝\n');

    // Step 1: Load existing deals
    console.log('[STEP 1] Loading existing deals...');
    let existingDeals = loadExistingDeals();

    // Step 2: Remove expired
    console.log('[STEP 2] Removing expired deals...');
    existingDeals = removeExpiredDeals(existingDeals);

    // Step 3: Scrape new deals
    console.log('[STEP 3] Scraping Amazon for new deals...');
    const newDeals = await scrapeAllDeals();

    if (newDeals.length === 0) {
      console.warn('[WARN] No new deals scraped! Keeping existing deals.');
    }

    // Step 4: Merge
    console.log('[STEP 4] Merging deals...');
    let allDeals = mergeDeals(existingDeals, newDeals);

    // Step 5: Derive numeric fields
    console.log('[STEP 5] Deriving prices and discounts...');
    allDeals = deriveNumbers(allDeals);

    // Step 6: Write to file
    console.log('[STEP 6] Writing deals.json...');
    fs.writeFileSync(DEALS_FILE, JSON.stringify(allDeals, null, 2));
    console.log(`[SUCCESS] Wrote ${allDeals.length} deals to ${DEALS_FILE}`);

    // Summary
    console.log('\n╔═══════════════════════════════════╗');
    console.log(`║ Total Deals: ${allDeals.length}` + ' '.repeat(23 - String(allDeals.length).length) + '║');
    console.log(`║ Latest Update: ${new Date().toLocaleString().padEnd(15)}║`);
    console.log('║ Status: ✅ SUCCESS                 ║');
    console.log('╚═══════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n[FATAL ERROR]', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateDeals();
}

module.exports = { updateDeals, deriveNumbers };
