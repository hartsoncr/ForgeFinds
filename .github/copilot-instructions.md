# ForgeFinds AI Coding Instructions

## Project Overview
ForgeFinds is a static tech deals discovery website featuring a deals database with search/filtering capabilities. Core audience: tech enthusiasts looking for gadgets, gaming, and home-theater deals.

**Tech Stack:** Vanilla JavaScript, HTML/CSS, JSON data source (no build tools, no backend)  
**Architecture:** Client-side rendering with embedded deals library  

---

## Data Model & Schema

**Source:** `data/deals.json` (array of deal objects)

Key fields:
- `title`, `description` — deal summary (display-ready)
- `price_info` — human-readable price string (e.g., "$99.99 (was $149.99)", "$99 + 20% coupon")
- `display_price` — clean price for UI display
- `publish_at`, `expires_at` — ISO datetime; deals only show if `publish_at ≤ now ≤ expires_at`
- `category` — freeform (e.g., "computers", "home-theater", "gadgets", "gaming")
- `coupon` — coupon text (e.g., "Clip $20 coupon", "Code: SAVE15")
- `store` — retailer (e.g., "Amazon")
- `image_url`, `affiliate_url` — external links
- `tags` — searchable keywords (lowercase array)
- `slug` — URL-friendly identifier

---

## Critical Logic: Price & Discount Extraction

**Location:** `assets/deals.js` → `deriveNumbers()` function

The library derives `__price` (final numeric price) and `__pctOff` (discount %) from text fields:

1. **Parse from `price_info` or `display_price`** using regex `/\$([\d,]+(\.\d{1,2})?)/`
2. **Apply coupon discounts:**
   - If `coupon` contains `"20% off"` → reduce price by 20%
   - If `coupon` contains `"$10 off"` → subtract $10
3. **Fallback for % off:** Extract from `"was $X"` patterns in `price_info`
4. **Result:** Both `__price` and `__pctOff` are stored on deal objects for filtering/sorting

**Important:** Always run `deriveNumbers()` on deals before filtering/sorting. Both `index.html` and `browse.html` rely on these cached numeric fields.

---

## Two Rendering Modes

### 1. Index/Homepage (`index.html`)
- Shows **only live deals** (respects publish/expiry dates)
- Simple grid layout
- No search/filters (minimal page)
- Uses `ForgeFinds.renderDeals({ mountSelector: "#deals", includeScheduled: false })`

### 2. Browse Page (`browse.html`)
- Shows **all live deals** by default
- **Advanced filtering:**
  - Category dropdown
  - Price range (min/max numeric inputs)
  - % off threshold
  - Sort (newest, price asc/desc, % off desc)
- Each change re-runs `run()` function to filter and re-render

**Key difference:** Browse loads `includeScheduled: true` to populate dropdown, but filters scheduled items in the UI layer.

---

## Search Implementation

**Location:** `assets/deals.js` → `filterList()` function (injected via `renderControls()`)

- Search is **case-insensitive**, full-text match on `title + description`
- Category filter uses exact match on `deal.category`
- Both are applied together: `(matchesSearch && matchesCat)`
- Called on every keyup in search box and category button click
- Dynamically renders buttons for categories found in loaded data

---

## Styling Pattern

- **Dark theme by default** (`--bg: #0f1115`, `--accent: #f97316`)
- **Inline critical CSS** in `<head>` for fast rendering
- **Dynamic injection** of additional styles via `injectStyles()` (for deals.js UI only)
- Price badges use `--good` (green) color; discounts use purple tones
- Responsive grid: `auto-fill` with `minmax(260px, 1fr)` breakpoint

---

## Adding Features: Common Patterns

**New filter field:**
1. Add to `data/deals.json` schema (e.g., `brand`, `rating`)
2. Extract/parse via `deriveNumbers()` if numeric
3. Add UI control in `browse.html` (select/input)
4. Add filter clause in `run()` function in browse.html `<script>`
5. Optional: Add search index to deals.js if full-text searchable

**New category:**
- Just add deals with that `category` value; buttons auto-generate from data

**Coupon parsing edge cases:**
- Always check raw text patterns in `deals.json` before updating regex
- Document assumed format in comments (e.g., "Assumes format: 'X% off' or '$X off'")

---

## Common Gotchas

1. **Timezone handling:** Dates are ISO strings. `new Date(string)` respects timezone offsets in the string.
2. **Null prices:** Some deals may have no numeric price (e.g., "Free with trade-in"). Filters default to `price == null ? true : filter(price)` to keep unknowns visible.
3. **Affiliate URLs:** Always use `target="_blank" rel="nofollow noopener"` to avoid leaking referrer headers.
4. **Cache busting:** `loadDeals()` appends `?cb=${Date.now()}` to avoid stale JSON.
5. **Missing fields:** Use short-circuit operators (`||`, `??`) for optional fields like `publish_at`, `coupon`.

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Homepage, latest deals only |
| `browse.html` | Full catalog with advanced filters |
| `assets/deals.js` | Core rendering library (IIFE, exports `ForgeFinds` global) |
| `data/deals.json` | Deal source (array of objects) |

