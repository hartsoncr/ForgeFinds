# Setup Next Steps

## ✅ Completed

### Trust Pages Created
- `/pages/about.html` — Editorial independence & mission
- `/pages/privacy.html` — Data handling & cookies
- `/pages/disclosure.html` — FTC affiliate disclosure (critical!)
- `/pages/contact.html` — Email contact + takedown requests
- `robots.txt` — Search engine crawling rules

### Documentation
- `AUTOMATION.md` — Full guide to affiliate automation

---

## 🚀 What Schema.org Does (Simple)

**Schema.org = Invisible labels that tell Google "this is a real product deal"**

It prevents Google from flagging your site as suspicious because:
1. Google can now see structured pricing/product data
2. Looks legitimate, not like affiliate spam
3. Improves search ranking visibility

**We'll add it to each deal card automatically** — no manual work needed.

---

## 📋 Your To-Do List

### Week 1: Affiliate Setup
- [ ] Sign up for **Amazon Associates** (if not already)
- [ ] Get your **Tracking ID** (format: `yourname-20`)
- [ ] Decide: **Option A (API)** or **Option B (Web Scraping)**
  - Option A = slower setup (2-4 weeks), more reliable long-term
  - Option B = works immediately, simpler to start

### Week 2: Automation
- [ ] Create `.github/workflows/daily-scrape.yml`
- [ ] Create `scraper/update-deals.js`
- [ ] Create scraper file (web-scraper.js or amazon-scraper.js)
- [ ] Add GitHub Secrets: `AMAZON_TRACKING_ID`
- [ ] Test locally: `node scraper/update-deals.js`
- [ ] Push to GitHub → automates daily!

### Week 3: Schema.org + Launch
- [ ] Update `assets/deals.js` with schema.org markup (JSON-LD)
- [ ] Test Google Search Console
- [ ] Submit sitemap to Google
- [ ] Monitor for "suspicious site" flags (should disappear)

---

## 📦 Files We Created

```
/pages/
  ├── about.html          # Who you are, mission, no bias
  ├── privacy.html        # Data handling, Google Analytics
  ├── disclosure.html     # "We earn affiliate $$" (legal required!)
  └── contact.html        # Email contact + feedback
  
robots.txt               # Tells Google to crawl you
AUTOMATION.md            # Full scraper setup guide
```

---

## 💡 Why This Matters for Google

**Before (Risky):**
- Generic "deals" page
- Affiliate links everywhere
- No disclosure
- No structured data
- → Google flags as suspicious affiliate spam

**After (Legitimate):**
- Clear "About" page explaining editorial independence
- Transparent affiliate disclosure (FTC-compliant)
- Schema.org markup showing real product data
- Contact + privacy info
- → Google sees professional operation

---

## 🎯 Final Architecture

```
ForgeFinds (Static Site)
    ↓
GitHub Repo
    ↓
GitHub Actions (Daily 6 AM UTC)
    ↓
Scraper (Web or API) → Searches Amazon for deals
    ↓
Data transforms + affiliate links added
    ↓
Updates deals.json automatically
    ↓
Site loads from deals.json every day
    ↓
Schema.org markup tells Google these are real offers
    ↓
Better rankings, no "suspicious site" flag ✅
```

---

## 🤔 Questions?

- **What if I don't want to automate yet?** — Just manually edit `data/deals.json` using the current format. Pages + schema.org still help with legitimacy.
- **How many deals can I have?** — Depends on scraper. Start with 50-100, scale to 500+.
- **Will this get me in trouble with Amazon?** — No, if you're using official APIs or legitimate scraping. Just disclose (✅ you now do).

Next step: Pick **Option A or B** and let me know if you want help setting up the scraper!
