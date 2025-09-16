<script>
/* ForgeFinds deals loader & renderer (robust) */
(() => {
  const byId = (id) => document.getElementById(id);

  function showStatus(mountSel, msg) {
    const el = document.querySelector(mountSel);
    if (el) el.innerHTML = `<p class="empty" style="color:#9aa7b1">${escapeHTML(msg)}</p>`;
  }

  function escapeHTML(str=""){
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Try multiple paths to avoid path issues
  const CANDIDATE_PATHS = [
    "./data/deals.json",      // relative to page
    "/data/deals.json",       // absolute from domain root
    "data/deals.json"         // fallback
  ];

  async function fetchFirstWorkingJSON() {
    let lastErr;
    for (const p of CANDIDATE_PATHS) {
      try {
        const url = `${p}?cb=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${p}`);
        // Explicitly parse & verify it is an array
        const txt = await res.text();
        let data;
        try {
          data = JSON.parse(txt);
        } catch (e) {
          throw new Error(`JSON parse error for ${p}: ${e.message}`);
        }
        if (!Array.isArray(data)) throw new Error(`JSON is not an array (${p})`);
        console.log("[ForgeFinds] Loaded deals from", p, "count:", data.length);
        return data;
      } catch (e) {
        lastErr = e;
        console.warn("[ForgeFinds] loader tried path and failed:", e.message);
      }
    }
    throw lastErr || new Error("Unable to load deals.json");
  }

  const parseISO = (s = "") => new Date(s);
  const now = () => new Date();

  const moneyRx = /\$([\d,]+(?:\.\d{1,2})?)/g;
  const dollarsOne = (str) => {
    if (!str) return null;
    const m = /\$([\d,]+(?:\.\d{1,2})?)/.exec(str);
    return m ? parseFloat(m[1].replace(/,/g,"")) : null;
  };
  const percentOne = (str) => {
    if (!str) return null;
    const m = /(\d{1,3})\s*%/.exec(str);
    return m ? parseFloat(m[1]) : null;
  };
  function extractWas(info=""){
    const m = /was[^$]*\$([\d,]+(?:\.\d{1,2})?)/i.exec(info);
    if (m) return parseFloat(m[1].replace(/,/g,""));
    const monies = [...info.matchAll(moneyRx)].map(m => parseFloat(m[1].replace(/,/g,"")));
    if (monies.length >= 2) {
      const first = monies[0], last = monies[monies.length-1];
      if (last > first) return last;
    }
    return null;
  }

  function deriveNumbers(d){
    let price = dollarsOne(d.display_price) ?? dollarsOne(d.price_info);
    const couponText = (d.coupon || "").toLowerCase();
    const dollarOff = dollarsOne(couponText);
    const pctOffCoupon = percentOne(couponText);
    if (price != null){
      if (pctOffCoupon != null) price = +(price * (1 - pctOffCoupon/100)).toFixed(2);
      if (dollarOff != null)    price = Math.max(0, +(price - dollarOff).toFixed(2));
    }
    let pct = pctOffCoupon ?? percentOne(d.price_info || "");
    if (pct == null && price != null){
      const was = extractWas(d.price_info || "");
      if (was && was > 0 && price <= was) pct = Math.round(100 * (1 - price/was));
    }
    return { ...d, __price: price, __pctOff: pct };
  }

  function money(s) { return s || ""; }

  function dealCardHTML(d){
    const priceText = d.display_price || d.price_info || "";
    const offBadge = (d.__pctOff != null) ? `<span class="badge off">${d.__pctOff}% off</span>` : "";
    const coupon = d.coupon ? `<span class="badge coupon" title="Extra savings">${escapeHTML(d.coupon)}</span>` : "";
    const expired = parseISO(d.expires_at || "") <= now();
    const store = d.store || "Shop";
    return `
    <article class="deal-card ${expired ? "expired": ""}">
      <a class="imgwrap" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">
        <img loading="lazy" src="${d.image_url}" alt="${escapeHTML(d.title || "")}">
      </a>
      <div class="content">
        <h3 class="title">${escapeHTML(d.title || "")}</h3>
        <p class="desc">${escapeHTML(d.description || "")}</p>
        <div class="meta">
          <span class="price">${money(priceText)}</span>
          ${offBadge}
          ${coupon}
        </div>
        <a class="cta" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">Shop at ${escapeHTML(store)}</a>
      </div>
    </article>`;
  }

  function injectStyles(){
    if (document.getElementById("ff-styles")) return;
    const css = `
    :root{--bg:#0f1115;--card:#12151d;--line:#202635;--text:#e6edf6;--muted:#a7b0bf;--accent:#f97316;--good:#9ef199;--goodbg:#1e2a1e;--couponbg:#19233a;--couponfg:#9dc4ff}
    body{background:var(--bg);color:var(--text)}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .deal-card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
    .deal-card .imgwrap{display:block;background:#0b0d10}
    .deal-card img{width:100%;height:220px;object-fit:cover}
    .deal-card .content{padding:12px 14px}
    .deal-card .title{font-size:1.05rem;line-height:1.25;margin:0 0 6px}
    .deal-card .desc{color:var(--muted);font-size:.9rem;margin:0 0 10px}
    .deal-card .meta{display:flex;align-items:center;gap:8px;margin:0 0 10px;flex-wrap:wrap}
    .price{background:var(--goodbg);color:var(--good);padding:4px 8px;border-radius:8px;font-weight:600}
    .badge.coupon{background:var(--couponbg);color:var(--couponfg);padding:4px 8px;border-radius:8px;font-weight:600}
    .badge.off{background:#1b1530;color:#c9a7ff;padding:4px 8px;border-radius:8px;font-weight:700}
    .cta{display:inline-block;background:var(--accent);color:#0b0d10;font-weight:700;border-radius:10px;padding:10px 12px;text-align:center}
    .empty{color:var(--muted)}
    .expired{opacity:.55;filter:grayscale(30%)}
    `;
    const style = document.createElement("style");
    style.id = "ff-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderList(list, mountSelector){
    const mount = document.querySelector(mountSelector);
    if (!mount) return;
    if (!list.length){
      mount.innerHTML = `<p class="empty">No live deals yet. Check back soon.</p>`;
      return;
    }
    mount.innerHTML = list.map(dealCardHTML).join("");
  }

  async function loadDeals({ includeScheduled }) {
    const deals = await fetchFirstWorkingJSON();
    const n = now();
    const list = deals
      .filter(d => {
        const pub = parseISO(d.publish_at || d.created_at || "1970-01-01T00:00:00-04:00");
        const exp = parseISO(d.expires_at || "9999-12-31T23:59:59-04:00");
        const isLive = pub <= n && exp > n;
        return includeScheduled ? true : isLive;
      })
      .sort((a, b) => parseISO(b.publish_at || b.created_at) - parseISO(a.publish_at || a.created_at))
      .map(deriveNumbers);
    return list;
  }

  window.ForgeFinds = {
    async renderDeals({ mountSelector="#deals", includeScheduled=false } = {}){
      try{
        injectStyles();
        showStatus(mountSelector, "Loading deals…");
        const list = await loadDeals({ includeScheduled });
        renderList(list, mountSelector);
      }catch(err){
        console.error("[ForgeFinds] fatal:", err);
        showStatus(mountSelector, `Error loading deals: ${err.message}`);
      }
    },
    // helpers for the browse page (already using)
    loadDeals: (opts) => loadDeals(opts),
    renderFromList: (list, mount="#deals") => { injectStyles(); renderList(list || [], mount); }
  };
})();
</script>