/** ------ Core helpers ------ */
const FF = (() => {
  const parseISO = (s = "") => new Date(s);
  const now = () => new Date();

  async function loadDeals({ includeScheduled = false } = {}) {
    const res = await fetch(`/data/deals.json?cb=${Date.now()}`);
    if (!res.ok) throw new Error(`Failed to load deals.json: ${res.status}`);
    const deals = await res.json();

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

  /** ---------- Price / %off derivation ---------- */
  const moneyRx = /\$([\d,]+(?:\.\d{1,2})?)/g;
  function dollarsOne(str){
    if (!str) return null;
    const m = /\$([\d,]+(?:\.\d{1,2})?)/.exec(str);
    return m ? parseFloat(m[1].replace(/,/g,"")) : null;
  }
  function percentOne(str){
    if (!str) return null;
    const m = /(\d{1,3})\s*%/.exec(str);
    return m ? parseFloat(m[1]) : null;
  }
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
    const coupon = d.coupon ? `<span class="badge coupon">${d.coupon}</span>` : "";
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

  function renderList(deals, mountSelector="#deals"){
    const mount = document.querySelector(mountSelector);
    if (!mount) return;
    if (!deals.length){
      mount.innerHTML = `<p class="empty">No live deals yet. Check back soon.</p>`;
      return;
    }
    mount.innerHTML = deals.map(dealCardHTML).join("");
  }

  function injectStyles(){
    if (document.getElementById("ff-styles")) return;
    const css = `
    :root{--bg:#0f1115;--card:#12151d;--line:#202635;--text:#e6edf6;--muted:#a7b0bf;--accent:#f97316;--good:#9ef199;--goodbg:#1e2a1e;--couponbg:#19233a;--couponfg:#9dc4ff}
    body{background:var(--bg);color:var(--text)}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .deal-card{background:var(--card);border:1px solid var(--line);border-radius:14px;
