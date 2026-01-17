# ForgeFinds Automation & Affiliate Setup Guide

## Schema.org — What Is It?

**Schema.org is "structured data" markup** — think of it as adding invisible labels to your website that search engines understand.

### Simple Analogy
Without schema.org:
```html
<h3>$99.99 laptop deal on Amazon</h3>
```
Google sees: "Some text about a laptop and $99.99"

With schema.org:
```html
<h3>$99.99 laptop deal on Amazon</h3>
<script type="application/ld+json">
{
  "@type": "Offer",
  "name": "Gaming Laptop",
  "price": "99.99",
  "priceCurrency": "USD",
  "seller": {"name": "Amazon"}
}
</script>
```
Google sees: "This is a product offer, priced at $99.99, on Amazon"

### Benefits for ForgeFinds
- **Better search rankings** — Google understands your deals are real offers, not spam
- **Rich snippets** — Prices show directly in Google search results
- **Trust signals** — Google flags affiliate sites less when structured data is present
- **E-commerce clarity** — Reduces "suspicious site" flags

We'll add this to deal cards in deals.js to mark each deal as a structured `Offer`.

---

## Amazon Affiliate Automation Setup

### Prerequisites
1. **Amazon Associates Account** — Sign up at https://affiliate-program.amazon.com
2. **Link Maker Tool** — Get your tracking ID (e.g., `forgefinds-20`) from your Amazon Associates dashboard
3. **API Access** — You'll need to decide between:
   - **Product Advertising API** (official, requires approval)
   - **Web scraping** (unofficial but simpler, higher maintenance)

---

### Option A: Use Product Advertising API (Recommended Long-Term)

**Cost:** Free tier available, then ~$0.01 per request  
**Pros:** Official, reliable, Amazon supports it  
**Cons:** Takes 2-4 weeks to get approved

**Setup Steps:**

1. **Get API credentials from Amazon:**
   - Visit AWS Console → Product Advertising API
   - Create Access Key & Secret Key
   - Save your **Tracking ID** (your `-20` identifier)

2. **Create a scraper in Node.js:**
   ```bash
   npm init -y
   npm install aws4 node-fetch dotenv node-cron
   ```

3. **Create `scraper/amazon-scraper.js`:**
   ```javascript
   const crypto = require('crypto');
   const fetch = require('node-fetch');
   require('dotenv').config();

   const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
   const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
   const TRACKING_ID = process.env.AMAZON_TRACKING_ID; // e.g., "forgefinds-20"

   async function searchAmazonDeals(keyword, category) {
     // Construct signed API request
     const host = 'api.us-east-1.product-advertising-api.amazon.com';
     const path = '/paapi5/searchitems';
     
     const payload = {
       "SearchIndex": category, // e.g., "Electronics"
       "Keywords": keyword,
       "MaxPrice": 2000,
       "MinPrice": 10,
       "ItemCount": 10,
       "Resources": ["Images.Primary.Medium", "Offers.Listings.Price", "ProductInfo.Title"]
     };

     // Sign the request (AWS Signature v4)
     const signed = signRequest(payload);
     
     const response = await fetch(`https://${host}${path}`, signed);
     const results = await response.json();
     
     // Transform to deals format
     return results.SearchResult.Items.map(item => ({
       title: item.ItemInfo.Title.DisplayValue,
       description: `Amazon ${category}`,
       display_price: `$${item.Offers.Listings[0].Price.DisplayPrice}`,
       price_info: `$${item.Offers.Listings[0].Price.DisplayPrice}`,
       image_url: item.Images.Primary.Medium.URL,
       affiliate_url: `https://amazon.com/dp/${item.ASIN}?tag=${TRACKING_ID}`,
       store: "Amazon",
       category: "gadgets", // or "gaming", "computers", etc.
       tags: keyword.toLowerCase().split(' '),
       slug: item.ASIN,
       publish_at: new Date().toISOString(),
       expires_at: new Date(Date.now() + 60*24*60*60*1000).toISOString()
     }));
   }

   // AWS Signature v4 signing logic (complex; use a library)
   // Or use: https://github.com/amzn/amazon-product-advertising-api-v5-examples/blob/master/js/example.js
   ```

---

### Option B: Web Scraping (Quick Start, Simpler)

**Cost:** Free  
**Pros:** Works immediately, no approval needed  
**Cons:** More fragile (Amazon can change HTML), higher maintenance

**Steps:**

1. **Install dependencies:**
   ```bash
   npm init -y
   npm install cheerio node-fetch dotenv node-cron
   ```

2. **Create `scraper/web-scraper.js`:**
   ```javascript
   const fetch = require('node-fetch');
   const cheerio = require('cheerio');
   require('dotenv').config();

   const TRACKING_ID = process.env.AMAZON_TRACKING_ID; // "forgefinds-20"

   async function scrapeAmazonDeals() {
     const keywords = [
       "gaming laptop under $1000",
       "wireless headphones",
       "gaming mouse",
       "4K webcam",
       "portable SSD"
     ];

     let deals = [];

     for (const keyword of keywords) {
       const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&sort=price-asc`;
       
       try {
         const html = await fetch(searchUrl).then(r => r.text());
         const $ = cheerio.load(html);

         // Parse product cards
         $('div[data-component-type="s-search-result"]').each((i, el) => {
           if (i > 5) return; // Limit to top 5 per keyword
           
           const title = $(el).find('h2 a span').text();
           const price = $(el).find('.a-price-whole').text();
           const asin = $(el).find('h2 a').attr('data-asin');
           const imageUrl = $(el).find('img').attr('src');

           if (title && price && asin) {
             deals.push({
               title: title.trim(),
               description: `Popular tech deal on Amazon`,
               display_price: price.trim(),
               price_info: price.trim(),
               image_url: imageUrl,
               affiliate_url: `https://amazon.com/dp/${asin}?tag=${TRACKING_ID}`,
               store: "Amazon",
               category: "gadgets",
               tags: keyword.toLowerCase().split(' ').slice(0, 5),
               slug: asin,
               publish_at: new Date().toISOString(),
               expires_at: new Date(Date.now() + 60*24*60*60*1000).toISOString(),
               created_at: new Date().toISOString()
             });
           }
         });
       } catch (error) {
         console.error(`Failed to scrape "${keyword}":`, error.message);
       }
     }

     return deals;
   }

   module.exports = { scrapeAmazonDeals };
   ```

---

### Step 3: GitHub Actions Automation (Daily Updates)

Create `.github/workflows/daily-scrape.yml`:

```yaml
name: Daily Deal Scrape

on:
  schedule:
    - cron: '0 6 * * *'  # Run daily at 6 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install cheerio node-fetch dotenv
      
      - name: Run scraper
        env:
          AMAZON_TRACKING_ID: ${{ secrets.AMAZON_TRACKING_ID }}
          AWS_ACCESS_KEY: ${{ secrets.AWS_ACCESS_KEY }}
          AWS_SECRET_KEY: ${{ secrets.AWS_SECRET_KEY }}
        run: node scraper/update-deals.js
      
      - name: Commit changes
        run: |
          git config --local user.email "bot@forgefinds.com"
          git config --local user.name "ForgeFinds Bot"
          git add data/deals.json
          git commit -m "chore: automated deal update" || echo "No changes"
          git push
```

Create `scraper/update-deals.js`:

```javascript
const fs = require('fs');
const { scrapeAmazonDeals } = require('./web-scraper');

async function updateDeals() {
  console.log('Fetching latest Amazon deals...');
  const newDeals = await scrapeAmazonDeals();
  
  // Load existing deals
  let allDeals = JSON.parse(fs.readFileSync('data/deals.json', 'utf-8'));
  
  // Remove expired deals
  const now = new Date();
  allDeals = allDeals.filter(d => {
    const expiry = new Date(d.expires_at);
    return expiry > now;
  });
  
  // Merge new deals (avoid duplicates by slug)
  const existingSlugs = new Set(allDeals.map(d => d.slug));
  const uniqueNewDeals = newDeals.filter(d => !existingSlugs.has(d.slug));
  
  allDeals = [...uniqueNewDeals, ...allDeals];
  
  // Keep latest 200 deals max
  allDeals = allDeals.slice(0, 200);
  
  // Write back
  fs.writeFileSync('data/deals.json', JSON.stringify(allDeals, null, 2));
  console.log(`✓ Updated with ${uniqueNewDeals.length} new deals`);
}

updateDeals().catch(err => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
```

---

### Step 4: GitHub Secrets Setup

In your GitHub repo → Settings → Secrets and Variables → Actions, add:

- `AMAZON_TRACKING_ID` = `forgefinds-20` (your Amazon tracking ID)
- `AWS_ACCESS_KEY` = (if using API)
- `AWS_SECRET_KEY` = (if using API)

---

## Testing the Scraper Locally

```bash
AMAZON_TRACKING_ID=forgefinds-20 node scraper/update-deals.js
```

Check `data/deals.json` to see if new deals were added.

---

## Schema.org Integration

Update `assets/deals.js` dealCardHTML() to inject schema markup:

```javascript
function dealCardHTML(d) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Offer",
    "name": d.title,
    "description": d.description,
    "price": (d.__price || d.display_price).replace(/[^\d.]/g, ''),
    "priceCurrency": "USD",
    "url": d.affiliate_url,
    "seller": {
      "@type": "Organization",
      "name": d.store
    }
  };

  const offBadge = d.__pctOff ? `<span class="badge off">${d.__pctOff}% off</span>` : "";
  const coupon = d.coupon ? `<span class="badge coupon">${escapeHTML(d.coupon)}</span>` : "";
  
  return `
  <article class="deal-card">
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    <a class="imgwrap" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">
      <img loading="lazy" src="${d.image_url}" alt="${escapeHTML(d.title)}">
    </a>
    <div class="content">
      <h3 class="title">${escapeHTML(d.title)}</h3>
      <p class="desc">${escapeHTML(d.description)}</p>
      <div class="meta">
        <span class="price">${escapeHTML(d.display_price || d.price_info)}</span>
        ${offBadge} ${coupon}
      </div>
      <a class="cta" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">Shop ${escapeHTML(d.store || "Now")}</a>
    </div>
  </article>`;
}
```

---

## Scaling to "Huge Inventory"

- **Start with web scraping** (100+ deals/day)
- **Use Product Advertising API** once approved (1000+ deals/day)
- **Add multiple data sources:** Best Buy, Newegg, Micro Center APIs
- **Filter by keywords** to keep focus on tech/gadgets

---

## Checklist

- [x] Create `.github/workflows/daily-scrape.yml`
- [x] Create `scraper/web-scraper.js` or `amazon-scraper.js`
- [x] Create `scraper/update-deals.js`
- [x] Add GitHub Secrets (AMAZON_TRACKING_ID)
- [x] Add schema.org markup to deal cards
- [x] Test locally: `node scraper/update-deals.js`
- [x] Push to GitHub → Actions will auto-run daily

**Result:** Fully automated, schema-optimized, Google-friendly deals site! 🚀
