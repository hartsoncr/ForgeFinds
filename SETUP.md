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

## 🎥 Optional: Video Upload Setup

**Note:** Video upload to YouTube is completely optional. The site works perfectly without it!

### Prerequisites
- YouTube channel
- Google Cloud account (free tier is fine)
- OpenAI account (pay-as-you-go)
- Pexels account (free)

### Step-by-Step YouTube OAuth Setup

#### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "ForgeFinds Video Upload")
3. Enable **YouTube Data API v3**:
   - In the left menu: APIs & Services → Library
   - Search for "YouTube Data API v3"
   - Click Enable

#### 2. Configure OAuth Consent Screen
1. Go to: APIs & Services → OAuth consent screen
2. Choose "External" user type
3. Fill in required fields:
   - App name: ForgeFinds
   - User support email: your email
   - Developer contact: your email
4. Add scope: `https://www.googleapis.com/auth/youtube.upload`
5. Add yourself as a test user
6. Save and continue

#### 3. Create OAuth Credentials
1. Go to: APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Desktop app" as application type
4. Name it "ForgeFinds Desktop"
5. Click Create
6. **Save the Client ID and Client Secret** — you'll need these

#### 4. Generate Refresh Token
```bash
# Add Client ID and Secret to .env first
echo "YT_CLIENT_ID=your_client_id_here" >> .env
echo "YT_CLIENT_SECRET=your_client_secret_here" >> .env

# Run the token generation script
npm run youtube:refresh-token
```

Follow the browser prompt to authorize access. Copy the refresh token shown in the terminal.

#### 5. Get Your Channel ID
1. Go to [YouTube Studio](https://studio.youtube.com)
2. Settings → Channel → Advanced settings
3. Copy your Channel ID (starts with `UC...`)

#### 6. Configure All Credentials

**Local setup (.env file):**
```bash
# YouTube OAuth
YT_CLIENT_ID=your_client_id_here
YT_CLIENT_SECRET=your_client_secret_here
YT_REFRESH_TOKEN=your_refresh_token_here
YT_CHANNEL_ID=UCxxxxxxxxxxxxx

# OpenAI (get from platform.openai.com/api-keys)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# Pexels (get from pexels.com/api)
PEXELS_API_KEY=xxxxxxxxxxxxxxxx

# Logo path
FORGEFINDS_LOGO_PATH=./forgefinds-logo.png
```

**GitHub Actions (Repository Secrets):**
1. Go to: Repository → Settings → Secrets and variables → Actions
2. Add each secret individually:
   - `YT_CLIENT_ID`
   - `YT_CLIENT_SECRET`
   - `YT_REFRESH_TOKEN`
   - `YT_CHANNEL_ID`
   - `OPENAI_API_KEY`
   - `PEXELS_API_KEY`

#### 7. Validate Setup
```bash
npm run validate
```

This checks which credentials are configured and provides setup links for missing ones.

### Troubleshooting YouTube Authentication

**Error: `invalid_grant`**

This means your refresh token is expired or invalid. Common causes:
- Token expired after 6 months of inactivity
- OAuth consent was revoked
- Client credentials changed

**Fix:**
```bash
npm run youtube:refresh-token
```
Then update the `YT_REFRESH_TOKEN` secret in GitHub Actions.

**Error: Missing credentials**

Run the validation script to see what's missing:
```bash
npm run validate
```

**Workflow skipping video upload:**

This is normal if credentials aren't configured. The workflow will:
- Check for required secrets
- Skip gracefully if any are missing
- Display which credentials need to be configured
- Continue working for daily deals scraping

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
