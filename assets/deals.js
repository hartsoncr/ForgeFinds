/* ForgeFinds deals rendering (v9 - Search & Filters) */
(function () {
  const FF = (() => {
    const parseISO = (s = "") => new Date(s);
    const now = () => new Date();
    let allDeals = []; // Cache for filtering

    // --- Helpers ---
    const addDays = (d, days) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };
    const toISO = (d) => d.toISOString();
    const escapeHTML = (s = "") => s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);

    async function loadDeals({ includeScheduled = false } = {}) {
      const res = await fetch(`${basePath()}/data/deals.json?cb=${Date.now()}`);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      let deals = await res.json();
      const n = now();

      // Normalize dates & expiration
      deals = deals.map(d => {
        const pub = d.publish_at || d.created_at || toISO(n);
        const exp = d.expires_at || toISO(addDays(parseISO(pub), 60));
        return { ...d, publish_at: pub, expires_at: exp };
      }).filter(d => {
        const pub = parseISO(d.publish_at);
        const exp = parseISO(d.expires_at);
        return includeScheduled ? true : (pub <= n && exp > n);
      }).sort((a, b) => parseISO(b.publish_at) - parseISO(a.publish_at))
        .map(deriveNumbers);

      allDeals = deals; // Store for search
      return deals;
    }

    // --- Price Logic ---
    const dollarsOne = (s) => { const m = /\$([\d,]+(\.\d{1,2})?)/.exec(s); return m ? parseFloat(m[1].replace(/,/g, "")) : null; };
    const percentOne = (s) => { const m = /(\d{1,3})\s*%/.exec(s); return m ? parseFloat(m[1]) : null; };
    
    function deriveNumbers(d) {
      let price = dollarsOne(d.display_price) ?? dollarsOne(d.price_info);
      const cText = (d.coupon || "").toLowerCase();
      const dOff = dollarsOne(cText), pOff = percentOne(cText);

      if (price != null) {
        if (pOff != null) price = +(price * (1 - pOff / 100)).toFixed(2);
        if (dOff != null) price = Math.max(0, +(price - dOff).toFixed(2));
      }
      
      let pct = pOff ?? percentOne(d.price_info || "");
      if (pct == null && price != null) {
        const m = /was[^$]*\$([\d,]+)/i.exec(d.price_info || "");
        const was = m ? parseFloat(m[1].replace(/,/g, "")) : null;
        if (was && was > price) pct = Math.round(100 * (1 - price / was));
      }
      return { ...d, __price: price, __pctOff: pct };
    }

    // --- UI Logic ---
    function renderControls(mountSelector) {
        const mount = document.querySelector(mountSelector);
        if(!mount) return;

        // Create categories from data
        const cats = ["All", ...new Set(allDeals.map(d => d.category).filter(Boolean))].sort();
        
        const ctrlDiv = document.createElement("div");
        ctrlDiv.className = "ff-controls";
        ctrlDiv.innerHTML = `
            <input type="text" id="ff-search" placeholder="Search deals..." class="ff-search">
            <div class="ff-filters">
                ${cats.map(c => `<button class="ff-btn ${c==='All'?'active':''}" data-cat="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}</button>`).join('')}
            </div>
        `;

        mount.parentNode.insertBefore(ctrlDiv, mount);

        // Event Listeners
        const searchInput = document.getElementById("ff-search");
        const btns = ctrlDiv.querySelectorAll(".ff-btn");

        searchInput.addEventListener("keyup", (e) => filterList(e.target.value, document.querySelector(".ff-btn.active").dataset.cat));
        
        btns.forEach(b => b.addEventListener("click", (e) => {
            btns.forEach(btn => btn.classList.remove("active"));
            e.target.classList.add("active");
            filterList(searchInput.value, e.target.dataset.cat);
        }));
    }

    function filterList(term, cat) {
        term = term.toLowerCase();
        const filtered = allDeals.filter(d => {
            const matchesSearch = (d.title + d.description).toLowerCase().includes(term);
            const matchesCat = cat === "All" || d.category === cat;
            return matchesSearch && matchesCat;
        });
        renderCards(filtered);
    }

    function dealCardHTML(d) {
      const expired = parseISO(d.expires_at) <= now();
      const offBadge = d.__pctOff ? `<span class="badge off">${d.__pctOff}% off</span>` : "";
      const coupon = d.coupon ? `<span class="badge coupon">${escapeHTML(d.coupon)}</span>` : "";
      
      // Schema.org structured data for SEO (JSON-LD)
      const schemaData = {
        "@context": "https://schema.org",
        "@type": "Offer",
        "name": d.title,
        "description": d.description,
        "price": (d.__price || d.display_price || d.price_info || "0").replace(/[^\d.]/g, '') || "0",
        "priceCurrency": "USD",
        "url": d.affiliate_url,
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": d.store || "Amazon"
        }
      };
      
      return `
      <article class="deal-card ${expired ? "expired" : ""}">
        <script type="application/ld+json">${JSON.stringify(schemaData)}</script>
        <a class="imgwrap" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">
          <img loading="lazy" src="${d.image_url}" alt="${escapeHTML(d.title)}">
        </a>
        <div class="content">
          <h3 class="title">${escapeHTML(d.title)}</h3>
          <p class="desc">${escapeHTML(d.description)}</p>
          <div class="meta">
            <span class="price">${escapeHTML(d.display_price || d.price_info)}</span>
            ${offBadge} ${coupon}
          </div>
          <a class="cta" href="${d.affiliate_url}" target="_blank">Shop ${escapeHTML(d.store || "Now")}</a>
        </div>
      </article>`;
    }

    function renderCards(deals, mountSelector = "#deals") {
      const mount = document.querySelector(mountSelector);
      if (!mount) return;
      if (!deals.length) {
        mount.innerHTML = `<p class="empty">No deals match your search.</p>`;
        return;
      }
      mount.innerHTML = deals.map(dealCardHTML).join("");
    }

    function injectStyles() {
      if (document.getElementById("ff-styles")) return;
      const css = `
      :root{--bg:#0f1115;--card:#12151d;--line:#202635;--text:#e6edf6;--muted:#a7b0bf;--accent:#f97316;--good:#9ef199;--goodbg:#1e2a1e;--couponbg:#19233a;}
      body{background:var(--bg);color:var(--text);font-family:sans-serif}
      
      /* Control Styles */
      .ff-controls{margin-bottom:20px; display:flex; flex-direction:column; gap:10px;}
      .ff-search{background:var(--card); border:1px solid var(--line); color:white; padding:10px; border-radius:8px;}
      .ff-filters{display:flex; gap:8px; flex-wrap:wrap;}
      .ff-btn{background:transparent; border:1px solid var(--line); color:var(--muted); padding:6px 12px; border-radius:20px; cursor:pointer; transition:0.2s}
      .ff-btn:hover, .ff-btn.active{background:var(--accent); color:#000; border-color:var(--accent); font-weight:600;}

      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
      .deal-card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
      .deal-card .imgwrap{background:#0b0d10;height:220px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
      .deal-card img{width:100%;height:100%;object-fit:cover;}
      .deal-card .content{padding:12px 14px}
      .deal-card .title{font-size:1.05rem;line-height:1.25;margin:0 0 6px}
      .deal-card .desc{color:var(--muted);font-size:.9rem;margin:0 0 10px}
      .deal-card .meta{display:flex;align-items:center;gap:8px;margin:0 0 10px;flex-wrap:wrap}
      .price{background:var(--goodbg);color:var(--good);padding:4px 8px;border-radius:8px;font-weight:600}
      .badge.off{background:#1b1530;color:#c9a7ff;padding:4px 8px;border-radius:8px;font-weight:700}
      .cta{display:inline-block;background:var(--accent);color:#0b0d10;font-weight:700;border-radius:10px;padding:10px 12px;text-align:center;text-decoration:none}
      .empty{color:var(--muted); text-align:center; padding:20px;}
      @media(min-width:600px){ .ff-controls{flex-direction:row; justify-content:space-between; align-items:center;} .ff-search{width:250px;} }
      `;
      const style = document.createElement("style");
      style.id = "ff-styles";
      style.textContent = css;
      document.head.appendChild(style);
    }

    function basePath() { return ""; } 

    return { loadDeals, renderCards, injectStyles, renderControls };
  })();

  window.ForgeFinds = {
    async renderDeals({ mountSelector = "#deals", includeScheduled = false } = {}) {
      try {
        FF.injectStyles();
        const list = await FF.loadDeals({ includeScheduled });
        FF.renderControls(mountSelector); // Inject Search/Filter
        FF.renderCards(list, mountSelector);
      } catch (err) {
        console.error(err);
        const mount = document.querySelector(mountSelector);
        if (mount) mount.innerHTML = `<p class="empty">We couldn’t load deals right now.</p>`;
      }
    }
  };
})();
