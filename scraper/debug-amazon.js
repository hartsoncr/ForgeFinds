/**
 * Debug script to inspect Amazon page structure
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function debugAmazonPage() {
  const url = `https://www.amazon.com/b?node=53629917011`;
  console.log(`Debugging ${url}...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultTimeout(30000);

    // Log page events
    page.on('console', msg => console.log('[PAGE LOG]', msg.text()));
    page.on('response', resp => {
      if (!resp.url().includes('pagead')) {
        console.log(`[RESPONSE] ${resp.status()} ${resp.url().slice(0, 80)}`);
      }
    });

    console.log('[LOADING] Navigating to page...');
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('[LOADED] Page loaded. Inspecting content...');

    const content = await page.content();
    console.log(`[PAGE SIZE] ${content.length} bytes`);
    console.log(`[PRODUCT SELECTOR] Looking for div[data-component-type="s-search-result"]...`);

    const itemCount = await page.$$eval('div[data-component-type="s-search-result"]', items => items.length).catch(() => 0);
    console.log(`[FOUND ITEMS] ${itemCount}`);

    if (itemCount === 0) {
      console.log('[FALLBACK] Trying alternative selectors...');

      const alt1 = await page.$$eval('.s-result-item', items => items.length).catch(() => 0);
      console.log(`[ALT] .s-result-item: ${alt1}`);

      const alt2 = await page.$$eval('[data-component-type="s-search-result"]', items => items.length).catch(() => 0);
      console.log(`[ALT] [data-component-type="s-search-result"]: ${alt2}`);

      const alt3 = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-component-type*="search"]');
        console.log(`Found ${items.length} elements with data-component-type containing 'search'`);
        return Array.from(document.querySelectorAll('*')).filter(el => el.textContent.includes('Add to Cart')).length;
      });
      console.log(`[ALT] Elements with "Add to Cart": ${alt3}`);
    }

    // Save first part of HTML for inspection
    const firstHtml = content.slice(0, 3000);
    console.log('[HTML SAMPLE]');
    console.log(firstHtml);

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

debugAmazonPage();
