<!-- assets/deals.js -->
<script>
async function loadDeals({ includeScheduled = false } = {}) {
  const cacheBust = `?v=${Date.now()}`;
  const res = await fetch(`/data/deals.json${cacheBust}`);
  const deals = await res.json();

  const now = new Date();

  // helper
  const iso = s => new Date((s || "").replace("Z", "+00:00"));

  // filter + sort
  const filtered = deals.filter(d => {
    const pub = iso(d.publish_at || d.created_at);
    const exp = iso(d.expires_at || "9999-12-31T23:59:59Z");
    const isLive = pub <= now && exp > now;
    return includeScheduled ? true : isLive;
  }).sort((a, b) => iso(b.publish_at || b.created_at) - iso(a.publish_at || a.created_at));

  return filtered;
}

function money(s) { return s || ""; }

function dealCardHTML(d){
  const price = d.display_price ? d.display_price : (d.price_info || "");
  const coupon = d.coupon ? `<span class="badge coupon">${d.coupon}</span>` : "";
  const expired = (new Date((d.expires_at||"").replace("Z","+00:00"))) <= new Date();

  return `
  <article class="deal-card ${expired ? "expired": ""}">
    <a class="imgwrap" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">
      <img loading="lazy" src="${d.image_url}" alt="${d.title}">
    </a>
    <div class="content">
      <h3 class="title">${d.title}</h3>
      <p class="desc">${d.description}</p>
      <div class="meta">
        <span class="price">${money(price)}</span>
        ${coupon}
      </div>
      <a class="cta" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">Shop at ${d.store}</a>
    </div>
  </article>`;
}

async function renderDeals({ mountSelector = "#deals", includeScheduled = false } = {}){
  const mount = document.querySelector(mountSelector);
  if (!mount) return;
  const deals = await loadDeals({ includeScheduled });

  if (!deals.length){
    mount.innerHTML = `<p class="empty">No live deals yet. Check back soon.</p>`;
    return;
  }
  mount.innerHTML = deals.map(dealCardHTML).join("");
}

// Optional: simple CSS (drop in once)
function injectDealStyles(){
  if (document.getElementById("deal-styles")) return;
  const css = `
  .grid {display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
  .deal-card {background:#0f1115;border:1px solid #1f2430;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
  .deal-card .imgwrap{display:block;background:#0b0d10}
  .deal-card img{width:100%;height:220px;object-fit:cover}
  .deal-card .content{padding:12px 14px}
  .deal-card .title{font-size:1.05rem;line-height:1.25;margin:0 0 6px}
  .deal-card .desc{color:#b8c0cc;font-size:.9rem;margin:0 0 10px}
  .deal-card .meta{display:flex;align-items:center;gap:8px;margin:0 0 10px}
  .price{background:#1e2a1e;color:#9ef199;padding:4px 8px;border-radius:8px;font-weight:600}
  .badge.coupon{background:#19233a;color:#9dc4ff;padding:4px 8px;border-radius:8px;font-weight:600}
  .cta{display:inline-block;background:#f97316;color:#0b0d10;font-weight:700;border-radius:10px;padding:10px 12px;text-align:center}
  .expired{opacity:.55;filter:grayscale(30%)}
  `;
  const style = document.createElement("style");
  style.id = "deal-styles";
  style.textContent = css;
  document.head.appendChild(style);
}

window.ForgeFinds = { renderDeals, loadDeals, injectDealStyles };
</script>
