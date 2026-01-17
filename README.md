# ForgeFinds — Automated Tech Deals Discovery

**A fully automated, schema.org-optimized affiliate deals site**

- 🤖 **Fully Automated:** Daily scraper fetches Amazon deals
- 💰 **Affiliate Links:** Every deal includes your tracking ID (forgefinds20-20)
- 📈 **SEO Optimized:** Schema.org markup, sitemaps, robots.txt
- 📱 **Responsive:** Works on desktop, tablet, mobile
- ⚡ **No Backend:** Pure HTML/CSS/JS—blazingly fast
- 🔒 **Legitimate:** FTC-compliant disclosure pages included

---

## 🚀 Quick Start

### 1. Test the Scraper
```bash
npm install
npm run scrape
```

This fetches ~20 Amazon deals and updates `data/deals.json`.

### 2. Push to GitHub
```bash
git add .
git commit -m "feat: add automated deal scraper"
git push origin main
```

### 3. GitHub Actions Takes Over
- Automatically runs daily at 6 AM UTC
- Fetches new deals
- Updates your site
- No manual work needed!

### 4. Done! 🎉

---

## 📋 What's Included

✅ **Amazon deal scraper** (fetches ~20/day automatically)  
✅ **Affiliate links** with your tracking ID (forgefinds20-20)  
✅ **Schema.org markup** for better search rankings  
✅ **Daily auto-updates** via GitHub Actions  
✅ **FTC-compliant pages** (about, privacy, disclosure)  
✅ **Sitemap & robots.txt** for Google indexing  
✅ **Price/discount extraction** logic  
✅ **Deduplication** (removes old deals)  

---

## 🔧 Configuration

**Change scrape time** → Edit `.github/workflows/daily-deals.yml` line 8  
**Add Amazon categories** → Edit `scraper/amazon-deals.js` line 15  
**Keep more deals** → Change `MAX_DEALS` in `scraper/update-deals.js`  

---

## 📊 How It Works

```
6 AM UTC daily:
  → GitHub Actions triggers
  → Scrapes Amazon best-sellers
  → Merges with existing deals
  → Removes expired deals
  → Adds your affiliate tracking ID
  → Updates data/deals.json
  → Commits & pushes changes
  → Your site loads fresh deals ✨
```

---

## 🎯 Google-Friendly Setup

This prevents "suspicious affiliate site" warnings:

✅ **Affiliate Disclosure** — FTC required  
✅ **Privacy Policy** — Data handling transparency  
✅ **About Page** — Editorial independence  
✅ **Schema.org Markup** — Real product offers  
✅ **Sitemap** — Easy crawling  
✅ **Contact Info** — Transparency  

---

## 📈 Monitoring

**See scraper logs:**
1. GitHub → Actions tab
2. Click "Daily Amazon Deals Scrape"
3. View latest run output

**Check deals:** Look at `data/deals.json` (updates daily)

**Track search:** Add to [Google Search Console](https://search.google.com/search-console), submit sitemap.xml

---

## 🚀 Deploy

**Option 1: GitHub Pages** — Push code, site goes live free  
**Option 2: Vercel** — Connect repo, auto-deploys  
**Option 3: Netlify** — Drag & drop folder, done  

---

## 📚 Full Docs

- **[DEPLOY.md](DEPLOY.md)** — Detailed deployment & scaling  
- **[AUTOMATION.md](AUTOMATION.md)** — Technical deep dive  
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — AI coding guide  

---

**Your site is ready. Just push and watch it run! 🚀**
