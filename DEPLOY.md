# ForgeFinds Automated Deployment Guide

You've got a **fully automated deal scraper** ready to go! Here's what's set up:

## ✅ What's Installed

### Scraper System
- **`scraper/amazon-deals.js`** — Fetches Amazon best-seller deals from node `53629917011`
- **`scraper/update-deals.js`** — Merges, deduplicates, removes expired deals, updates `data/deals.json`
- **`.github/workflows/daily-deals.yml`** — Runs scraper every day at 6 AM UTC automatically
- **`scraper/generate-sitemap.js`** — Creates `sitemap.xml` for Google

### Site Trust & SEO
- **`/pages/about.html`, `/pages/privacy.html`, `/pages/disclosure.html`, `/pages/contact.html`** — Legal pages
- **`robots.txt`** — Tells search engines to crawl your site
- **`sitemap.xml`** — Lists all pages for indexing
- **Schema.org markup** — Added to all deal cards (JSON-LD format)
- **Meta tags** — Updated index.html with proper SEO tags

### Configuration
- **Store ID:** `forgefinds20-20` (hardcoded in scraper, ready to use)
- **Max Deals:** 300 (keeps latest deals, removes old ones)
- **Update Schedule:** Daily at 6 AM UTC (edit `.github/workflows/daily-deals.yml` to change)

---

## 🚀 To Launch

### Step 1: Test Locally (Optional)
```bash
npm install
npm run scrape
```
This fetches deals and updates `data/deals.json`. Check the output and verify the format looks good.

### Step 2: Push to GitHub
```bash
git add .
git commit -m "feat: add automated deal scraper"
git push origin main
```

### Step 3: GitHub Actions Kicks In
- First run happens at your **scheduled time** (6 AM UTC daily)
- Or trigger manually: GitHub → Actions → Daily Amazon Deals Scrape → Run workflow

### Step 4: Monitor
- Check GitHub → Actions to see scraper run logs
- Check `data/deals.json` in repo—it updates automatically
- Your site pulls from the JSON file, so deals refresh daily

---

## 📊 How It Works (Diagram)

```
Every day at 6 AM UTC:
    ↓
GitHub Actions triggers
    ↓
Runs: npm run scrape
    ↓
amazon-deals.js:
  - Fetches Amazon best-sellers (node 53629917011)
  - Extracts title, price, image, ASIN
  - Adds your affiliate tracking ID
  - Returns ~20 products
    ↓
update-deals.js:
  - Loads existing deals.json
  - Removes expired deals (>90 days old)
  - Deduplicates by ASIN + store
  - Merges new with old
  - Derives __price and __pctOff
  - Keeps latest 300 deals
  - Writes back to deals.json
    ↓
Git commits & pushes changes
    ↓
Your site loads fresh deals.json
    ↓
Visitors see latest deals! ✅
```

---

## 🎯 What Gets Scraped

### Amazon Category Node
- **Node ID:** `53629917011` (Best Sellers - Electronics)
- **Daily:** ~20 products per node
- **Total Deals:** Up to 300 (keeps rolling window of latest)

### Customizing Categories

To add more Amazon categories, edit `scraper/amazon-deals.js`:

```javascript
// Line ~15
const AMAZON_NODES = [
  '53629917011',    // Electronics (current)
  '393807011',      // Computers
  '1266092011',     // Gaming
];

// Add mapping for new nodes (line ~18)
const NODE_TO_CATEGORY = {
  '53629917011': 'gadgets',
  '393807011': 'computers',
  '1266092011': 'gaming',
};
```

Then push. The scraper auto-includes all nodes next run.

---

## 🔍 Monitoring & Logs

### See scraper output:
1. GitHub → Actions tab
2. Click "Daily Amazon Deals Scrape"
3. Click latest run
4. Expand "Run deal scraper" step to see logs

### Common output:
```
[STEP 1] Loading existing deals...
[STEP 2] Removing expired deals...
[STEP 3] Scraping Amazon for new deals...
[SCRAPE] Fetching https://amazon.com/b?node=53629917011...
[INFO] Found 20 products using selector...
[SUCCESS] Scraped 20 deals from node 53629917011
[STEP 4] Merging deals...
[MERGE] Added 15 new deals, updated 5 existing
[STEP 5] Deriving prices and discounts...
[STEP 6] Writing deals.json...
[SUCCESS] Wrote 285 deals to data/deals.json
```

---

## ⚠️ Troubleshooting

### "No new deals scraped"
- Amazon HTML might have changed
- Check GitHub Actions logs for error details
- Update CSS selectors in `scraper/amazon-deals.js` (lines ~70-75)

### "Failed to fetch from Amazon"
- Network timeout
- Amazon might be blocking requests
- Add more User-Agent headers or retry logic

### "Git push failed"
- GitHub token issue
- Workflow permissions might be off
- Go to Repo Settings → Actions → General → Workflow permissions → Enable "Read and write permissions"

---

## 📈 Scaling to More Deals

### Option 1: More Amazon Categories
- Add node IDs to `AMAZON_NODES` array
- Scraper auto-scales to handle all of them

### Option 2: Other Retailers
- Add new scraper file: `scraper/bestbuy-deals.js`
- Call it from `update-deals.js` alongside Amazon scraper
- Merge all results together

### Option 3: API Integration
- Best Buy, Newegg have affiliate APIs
- More reliable than web scraping
- (Current setup is free web scraping)

---

## 🔐 Privacy & Legal

✅ **Already set up:**
- Affiliate disclosure page (`/pages/disclosure.html`)
- Privacy policy (`/pages/privacy.html`)
- About page (`/pages/about.html`)
- Contact page (`/pages/contact.html`)
- robots.txt

These signal legitimacy to Google and comply with FTC rules. **No secrets needed**—everything is free and public!

---

## 📝 Key Files

| File | Purpose |
|------|---------|
| `scraper/amazon-deals.js` | Fetches from Amazon |
| `scraper/update-deals.js` | Merges & processes deals |
| `.github/workflows/daily-deals.yml` | Automation schedule |
| `data/deals.json` | Deal database (auto-updated) |
| `assets/deals.js` | Render logic + schema.org |
| `robots.txt` | SEO crawl rules |
| `sitemap.xml` | Page index for Google |
| `/pages/*` | Trust pages (about, privacy, etc.) |

---

## 🎓 Next Steps

1. **Test locally** (optional): `npm run scrape`
2. **Push to GitHub**: `git push origin main`
3. **Watch Actions run**: GitHub → Actions → Daily Amazon Deals Scrape
4. **Check your site**: Deals update automatically daily
5. **Monitor Search Console**: Google will index your sitemap

**That's it!** Your site is now fully automated. No manual deal hunting needed. 🚀

---

## 💡 Pro Tips

- **Update schedule:** Edit cron in `.github/workflows/daily-deals.yml` line 8
  - `'0 6 * * *'` = 6 AM UTC
  - Change to `'0 18 * * *'` for 6 PM UTC, etc.
  
- **Max deals:** Change `MAX_DEALS = 300` in `scraper/update-deals.js` line 9

- **Deal retention:** Change `DEAL_RETENTION_DAYS = 90` to keep older deals longer

- **Manual trigger:** Go to GitHub Actions → Daily Amazon Deals Scrape → Run workflow button

---

Questions? Check logs in GitHub Actions or reach out. Your scraper is ready to run! 🎉
