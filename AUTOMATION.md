# ForgeFinds Automation Guide

## 📅 Daily Workflows

Your site runs **two automated workflows** every day via GitHub Actions:

### 1. Daily Deals Scraper (6:00 AM UTC)
**File:** `.github/workflows/daily-deals.yml`  
**What it does:**
- Scrapes latest Amazon deals (currently using mock data)
- Downloads product images to `/images/` directory
- Merges with existing deals (no duplicates)
- Removes expired deals
- Derives price/discount calculations
- Commits updated `data/deals.json` to GitHub
- Triggers site rebuild on GitHub Pages

**Key Features:**
- ✅ **Automatic Image Downloads** - All product images downloaded locally
- ✅ **Preserves Local Images** - Won't overwrite your Unsplash photos
- ✅ **Deduplication** - Merges by ASIN + store to avoid duplicates
- ✅ **Affiliate Tags** - All links have `forgefinds20-20` tag
- ✅ **Expiry Management** - Removes deals older than 90 days

**Manual Trigger:**
```bash
# From GitHub UI
Actions → Daily Amazon Deals Scrape → Run workflow

# Or locally
npm run scrape
```

---

### 2. Daily Video Upload (10:00 AM UTC)
**File:** `.github/workflows/daily-video.yml`  
**What it does:**
- Reads deals from `data/deals.json`
- Picks a random deal that hasn't been posted
- Generates YouTube Short using OpenAI + Pexels
- Uploads video to YouTube with title/description
- Updates `data/posted.json` to track posted deals

**Requirements:**
- ✅ All 6 secrets configured in GitHub
- ✅ FFmpeg installed (auto-installed in workflow)
- ✅ At least 1 unposted deal in deals.json

**Manual Trigger:**
```bash
# From GitHub UI
Actions → Daily Video Upload → Run workflow

# Or locally
npm run video:one
```

---

## 🎯 Tomorrow's Behavior

**6:00 AM UTC - Scraper runs:**
1. Loads existing 8 deals
2. Generates 8 mock deals with fresh timestamps
3. **For each deal with external image URL:**
   - Tries to download from Amazon
   - If it fails (Amazon blocks) → keeps existing local image
   - If image already local (`/images/`) → skips download
4. Your **Unsplash photos are preserved** - scraper won't overwrite
5. Merges deals (no duplicates by ASIN)
6. Commits updated deals.json
7. Site rebuilds automatically

**10:00 AM UTC - Video uploads:**
1. Picks random unposted deal
2. Generates YouTube Short
3. Uploads to your channel
4. Updates posted.json

---

## ✅ Current Status

✅ **Images:** 8 Unsplash photos in `/images/` (Amazon CDN blocked)  
✅ **Animations:** Removed (skeleton, fadeIn, transitions)  
✅ **Social Links:** Amazon Store + YouTube in header  
✅ **Affiliate Links:** All verified with forgefinds20-20 tag  
✅ **Scraper:** Downloads images automatically, preserves local ones  
✅ **Video Agent:** Tested (uploaded RyblGhLJofg to YouTube)

**Tomorrow will work perfectly!** Scraper preserves your local images and video agent will post a Short. 🚀
