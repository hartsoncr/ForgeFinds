// Usage: node automation/generate-sitestripe-links.js
// Requires: AMAZON_EMAIL, AMAZON_PASSWORD in .env
// Updates deals.json with short_affiliate_url for each product

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const readline = require('readline');
require('dotenv').config();

const DEALS_FILE = path.join(__dirname, '../data/deals.json');
const EMAIL = process.env.AMAZON_EMAIL;
const PASSWORD = process.env.AMAZON_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('ERROR: Set AMAZON_EMAIL and AMAZON_PASSWORD in your .env file');
  process.exit(1);
}

async function getSiteStripeLink(page, asin) {
  const url = `https://www.amazon.com/dp/${asin}?tag=forgefinds20-20`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  // Wait for SiteStripe toolbar
  await page.waitForSelector('#amzn-sitestripe-copy-link-text', { timeout: 15000 });
  // Get short link
  const shortLink = await page.$eval('#amzn-sitestripe-copy-link-text', el => el.value);
  return shortLink;
}

(async () => {
  const deals = JSON.parse(fs.readFileSync(DEALS_FILE, 'utf8'));
  const browser = await puppeteer.launch({ headless: false }); // non-headless for OTP
  const page = await browser.newPage();

  // Login to Amazon Associates
  await page.goto('https://affiliate-program.amazon.com/', { waitUntil: 'networkidle2' });
  await page.click('a[href*="/login"]');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.type('input[type="email"]', EMAIL);
  await page.click('input[type="submit"]');
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.type('input[type="password"]', PASSWORD);
  await page.click('input[type="submit"]');

  // Wait for OTP prompt if present
  try {
    await page.waitForSelector('input[type="tel"]', { timeout: 8000 });
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter Amazon OTP: ', async (otp) => {
      await page.type('input[type="tel"]', otp);
      await page.click('input[type="submit"]');
      rl.close();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  } catch (e) {
    // No OTP required
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  for (const deal of deals) {
    if (!deal.slug) continue;
    try {
      console.log(`Getting SiteStripe for ASIN: ${deal.slug}`);
      const shortLink = await getSiteStripeLink(page, deal.slug);
      deal.short_affiliate_url = shortLink;
      console.log(`  ✓ ${shortLink}`);
    } catch (err) {
      console.error(`  ✗ Failed for ${deal.slug}: ${err.message}`);
    }
  }

  fs.writeFileSync(DEALS_FILE, JSON.stringify(deals, null, 2));
  await browser.close();
  console.log('Done! Updated deals.json with short_affiliate_url for each product.');
})();
