// update-affiliate-links.js
// Syncs sitestripe-todo.txt and deals.json: adds new products, updates short_affiliate_url when SiteStripe links are present

const fs = require('fs');
const path = require('path');

const dealsPath = path.join(__dirname, '../data/deals.json');
const todoPath = path.join(__dirname, '../sitestripe-todo.txt');

function parseTodo(txt) {
  const lines = txt.split(/\r?\n/);
  const items = [];
  let current = {};
  for (const line of lines) {
    if (line.trim().length === 0 || line.startsWith('#')) continue;
    if (line.startsWith('http')) {
      current = { affiliate_url: line.trim() };
    } else if (line.startsWith('SiteStripe:')) {
      current.short_affiliate_url = line.replace('SiteStripe:', '').trim();
      items.push(current);
      current = {};
    } else {
      current.title = line.trim();
    }
  }
  return items;
}

function syncDeals() {
  const todoTxt = fs.readFileSync(todoPath, 'utf8');
  const todoItems = parseTodo(todoTxt);
  let deals = [];
  if (fs.existsSync(dealsPath)) {
    deals = JSON.parse(fs.readFileSync(dealsPath, 'utf8'));
  }
  // Update deals with short_affiliate_url if present in todo
  for (const item of todoItems) {
    const deal = deals.find(d => d.affiliate_url === item.affiliate_url);
    if (deal) {
      if (item.short_affiliate_url) {
        deal.short_affiliate_url = item.short_affiliate_url;
      } else {
        delete deal.short_affiliate_url;
      }
    } else {
      // New product: add as placeholder
      deals.push({
        title: item.title || '',
        affiliate_url: item.affiliate_url,
        short_affiliate_url: item.short_affiliate_url || '',
        description: '',
        price_info: '',
        display_price: '',
        store: '',
        image_url: '',
        tags: [],
        category: '',
        slug: '',
        publish_at: '',
        expires_at: '',
        created_at: '',
        __price: null,
        __pctOff: null
      });
    }
  }
  fs.writeFileSync(dealsPath, JSON.stringify(deals, null, 2));
  console.log('Synced deals.json with SiteStripe links.');
}

syncDeals();
