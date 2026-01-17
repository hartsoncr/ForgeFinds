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
          <a class="cta" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">Shop ${escapeHTML(d.store || "Now")}</a>
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
      :root{--bg:#0a0e27;--bg2:#141829;--card:#1a1f3a;--line:#2d3561;--text:#f0f4f8;--muted:#a0aac4;--accent:#00d4ff;--accent2:#6366f1;--good:#10b981;--goodbg:#064e3b;--couponbg:#1f2937;--couponfg:#60a5fa}
      body{background:linear-gradient(135deg,var(--bg) 0%,#0f1528 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto',sans-serif}
      
      /* Control Styles */
      .ff-controls{margin-bottom:30px;display:flex;flex-direction:column;gap:16px}
      .ff-search{background:var(--card);border:1px solid var(--line);color:white;padding:12px 16px;border-radius:10px;font-size:1rem;width:100%;transition:all 0.2s ease}
      .ff-search:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,212,255,0.1);background:var(--bg2)}
      .ff-filters{display:flex;gap:10px;flex-wrap:wrap}
      .ff-btn{background:var(--card);border:1px solid var(--line);color:var(--muted);padding:8px 16px;border-radius:20px;cursor:pointer;transition:all 0.3s ease;font-weight:500;font-size:0.95rem}
      .ff-btn:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,212,255,0.05)}
      .ff-btn.active{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#0a0e27;border:none;font-weight:600;box-shadow:0 4px 15px rgba(0,212,255,0.3)}

      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
      .deal-card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.3s ease;position:relative}
      .deal-card:hover{border-color:var(--accent);box-shadow:0 12px 40px rgba(0,212,255,0.15);transform:translateY(-4px)}
      .deal-card .imgwrap{background:linear-gradient(135deg,var(--bg2) 0%,var(--bg) 100%);height:240px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
      .deal-card img{width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease}
      .deal-card:hover img{transform:scale(1.05)}
      .deal-card .content{padding:16px;display:flex;flex-direction:column;flex:1}
      .deal-card .title{font-size:1.1rem;line-height:1.3;margin:0 0 8px;font-weight:600;color:var(--text)}
      .deal-card .desc{color:var(--muted);font-size:0.9rem;margin:0 0 12px;flex:1}
      .deal-card .meta{display:flex;align-items:center;gap:8px;margin:0 0 12px;flex-wrap:wrap}
      .price{background:linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(6,78,59,0.2) 100%);color:#10b981;padding:6px 12px;border-radius:8px;font-weight:700;border:1px solid rgba(16,185,129,0.3);font-size:0.95rem}
      .badge.off{background:rgba(147,51,234,0.2);color:#a78bfa;padding:6px 12px;border-radius:8px;font-weight:700;border:1px solid rgba(147,51,234,0.3);font-size:0.85rem}
      .badge.coupon{background:var(--couponbg);color:var(--couponfg);padding:6px 12px;border-radius:8px;font-size:0.85rem;font-weight:600;border:1px solid rgba(96,165,250,0.3)}
      .cta{display:inline-block;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#0a0e27;font-weight:700;border-radius:10px;padding:10px 16px;text-align:center;text-decoration:none;transition:all 0.3s ease;border:none;cursor:pointer;width:100%;text-transform:uppercase;font-size:0.9rem;letter-spacing:0.5px}
      .cta:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,212,255,0.3)}
      .empty{color:var(--muted);text-align:center;padding:40px 20px;font-size:1.1rem}
      @media(min-width:600px){.ff-controls{flex-direction:row;justify-content:space-between;align-items:center;gap:16px}.ff-search{width:250px}}
      `;
      const style = document.createElement("style");
      style.id = "ff-styles";
      style.textContent = css;
      document.head.appendChild(style);
    }

    function basePath() { return ""; } 

    return { loadDeals, renderCards, renderFromList: renderCards, injectStyles, renderControls };
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
        if (mount) mount.innerHTML = `<p class="empty">We couldn't load deals right now.</p>`;
      }
    }
  };
})();
