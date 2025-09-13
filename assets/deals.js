// /assets/deals.js  (raw JavaScript, no <script> tags)

/** ------ Helpers ------ */
const FF = (() => {
  // Supports ISO with Z or timezone offsets like -04:00
  const parseISO = (s = "") => new Date(s);
  const now = () => new Date();

  async function loadDeals({ includeScheduled = false } = {}) {
    const res = await fetch(`${basePath()}/data/deals.json?cb=${Date.now()}`);
    if (!res.ok) throw new Error(`Failed to load deals.json: ${res.status}`);
    const deals = await res.json();

    const n = now();

    const filtered = deals
      .filter(d => {
        const pub = parseISO(d.publish_at || d.created_at || "1970-01-01T00:00:00-04:00");
        const exp = parseISO(d.expires_at || "9999-12-31T23:59:59-04:00");
        const isLive = pub <= n && exp > n;
        return includeScheduled ? true : isLive;
      })
      .sort((a, b) => parseISO(b.publish_at || b.created_at) - parseISO(a.publish_at || a.created_at));

    return filtered;
  }

  function money(s) { return s || ""; }

  function dealCardHTML(d){
    const price = d.display_price || d.price_info || "";
    const coupon = d.coupon ? `<span class="badge coupon" title="Extra savings">${d.coupon}</span>` : "";
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
          <span class="price">${money(price)}</span>
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
    .deal-card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
    .deal-card .imgwrap{display:block;background:#0b0d10}
    .deal-card img{width:100%;height:220px;object-fit:cover}
    .deal-card .content{padding:12px 14px}
    .deal-card .title{font-size:1.05rem;line-height:1.25;margin:0 0 6px}
    .deal-card .desc{color:var(--muted);font-size:.9rem;margin:0 0 10px}
    .deal-card .meta{display:flex;align-items:center;gap:8px;margin:0 0 10px}
    .price{background:var(--goodbg);color:var(--good);padding:4px 8px;border-radius:8px;font-weight:600}
    .badge.coupon{background:var(--couponbg);color:var(--couponfg);padding:4px 8px;border-radius:8px;font-weight:600}
    .cta{display:inline-block;background:var(--accent);color:#0b0d10;font-weight:700;border-radius:10px;padding:10px 12px;text-align:center}
    .empty{color:var(--muted)}
    .expired{opacity:.55;filter:grayscale(30%)}
    `;
    const style = document.createElement("style");
    style.id = "ff-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function search(deals, q){
    if (!q) return deals;
    const s = q.toLowerCase();
    return deals.filter(d =>
      (d.title||"").toLowerCase().includes(s) ||
      (d.description||"").toLowerCase().includes(s) ||
      (d.tags||[]).join(" ").toLowerCase().includes(s)
    );
  }

  function basePath(){ return ""; } // root

  function escapeHTML(str=""){
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  return { loadDeals, renderList, injectStyles, search };
})();

/** ------ Public API ------ */
window.ForgeFinds = {
  async renderDeals({ mountSelector="#deals", includeScheduled=false, q="" } = {}){
    try{
      FF.injectStyles();
      const all = await FF.loadDeals({ includeScheduled });
      const filtered = FF.search(all, q);
      FF.renderList(filtered, mountSelector);
    }catch(err){
      console.error(err);
      const mount = document.querySelector(mountSelector);
      if (mount) mount.innerHTML = `<p class="empty">We couldn’t load deals right now.</p>`;
    }
  }
};
