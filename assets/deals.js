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
      try {
        const url = `${basePath()}/data/deals.json?cb=${Date.now()}`;
        console.log('[FF] Fetching deals from:', url);
        const res = await fetch(url);
        console.log('[FF] Fetch response status:', res.status, 'ok:', res.ok);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        let deals = await res.json();
        console.log('[FF] Loaded', deals.length, 'deals from JSON');
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

        console.log('[FF] Filtered to', deals.length, 'live deals');
        allDeals = deals; // Store for search
        return deals;
      } catch (err) {
        console.error('[FF] loadDeals error:', err.message, err.stack);
        throw err;
      }
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
      const priceStr = String(d.__price || d.display_price || d.price_info || "0");
      const schemaData = {
        "@context": "https://schema.org",
        "@type": "Offer",
        "name": d.title,
        "description": d.description,
        "price": priceStr.replace(/[^\d.]/g, '') || "0",
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
        <a class="imgwrap" href="${d.short_affiliate_url || d.affiliate_url}" target="_blank" rel="nofollow noopener">
          <div class="img-container">
            <img loading="lazy" src="${d.image_url}" alt="${escapeHTML(d.title)}" width="300" height="220" decoding="async" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22220%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22300%22 height=%22220%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2216%22%3EImage unavailable%3C/text%3E%3C/svg%3E'">
          </div>
        </a>
        <div class="content">
          <h3 class="title">${escapeHTML(d.title)}</h3>
          <p class="desc">${escapeHTML(d.description)}</p>
          <div class="meta">
            <span class="price">${escapeHTML(d.display_price || d.price_info)}</span>
            ${offBadge} ${coupon}
          </div>
          <a class="cta" href="${d.short_affiliate_url || d.affiliate_url}" target="_blank" rel="nofollow noopener">Shop ${escapeHTML(d.store || "Now")}</a>
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
      
      // Preload images for better performance
      setTimeout(() => {
        const images = mount.querySelectorAll('img');
        images.forEach(img => {
          if (img.loading === 'lazy') {
            // Trigger IntersectionObserver for lazy loaded images
            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  // Image will load naturally, but we can warm up the connection
                  const link = document.createElement('link');
                  link.rel = 'prefetch';
                  link.href = entry.target.src;
                  document.head.appendChild(link);
                  observer.unobserve(entry.target);
                }
              });
            }, { rootMargin: '50px' });
            observer.observe(img);
          }
        });
      }, 100);
    }

    function injectStyles() {
      if (document.getElementById("ff-styles")) return;
      const css = `
      :root{--bg:#ffffff;--bg-alt:#f8f8f8;--card:#ffffff;--line:#e0e0e0;--text:#1a1a1a;--muted:#666666;--accent:#ff6b35;--accent-dark:#e85a25;--highlight:#d32f2f;--good:#10b981;--goodbg:#064e3b}
      body{background:var(--bg-alt);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica',sans-serif}
      
      /* Control Styles */
      .ff-controls{margin-bottom:30px;display:flex;flex-direction:column;gap:16px}
      .ff-search{background:var(--card);border:1px solid var(--line);color:var(--text);padding:12px 16px;border-radius:6px;font-size:0.95rem;width:100%;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
      .ff-search:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,107,53,0.1)}
      .ff-filters{display:flex;gap:10px;flex-wrap:wrap}
      .ff-btn{background:var(--bg);border:1px solid var(--line);color:var(--muted);padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;font-size:0.95rem}
      .ff-btn:hover{border-color:var(--accent);color:var(--accent);background:rgba(255,107,53,0.05)}
      .ff-btn.active{background:var(--accent);color:white;border:none;font-weight:600;box-shadow:0 2px 8px rgba(255,107,53,0.2)}

      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
      .deal-card{background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;position:relative;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
      .deal-card:hover{border-color:var(--accent);box-shadow:0 8px 24px rgba(255,107,53,0.15)}
      .deal-card .imgwrap{background:#f0f0f0;height:220px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;flex-shrink:0}
      .deal-card .img-container{width:100%;height:100%;position:relative;background:#f0f0f0}
      .deal-card img{width:100%;height:100%;object-fit:contain;padding:8px;display:block}
      .deal-card img:hover{opacity:0.95}
      .deal-card .content{padding:16px;display:flex;flex-direction:column;flex:1}
      .deal-card .title{font-size:1rem;line-height:1.3;margin:0 0 8px;font-weight:700;color:var(--text)}
      .deal-card .desc{color:var(--muted);font-size:0.85rem;margin:0 0 12px;flex:1;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .deal-card .meta{display:flex;align-items:center;gap:8px;margin:0 0 16px;flex-wrap:wrap}
      .price{background:#f0f0f0;color:var(--accent);padding:6px 12px;border-radius:6px;font-weight:700;font-size:0.95rem;white-space:nowrap}
      .badge.off{background:rgba(211,47,47,0.1);color:var(--highlight);padding:6px 12px;border-radius:6px;font-weight:700;font-size:0.85rem;white-space:nowrap}
      .badge.coupon{background:rgba(255,107,53,0.1);color:var(--accent);padding:6px 12px;border-radius:6px;font-size:0.85rem;font-weight:600;white-space:nowrap}
      .cta{display:inline-block;background:var(--accent);color:white;font-weight:700;border-radius:6px;padding:10px 16px;text-align:center;text-decoration:none;border:none;cursor:pointer;width:100%;text-transform:uppercase;font-size:0.9rem;letter-spacing:0.3px}
      .cta:hover{background:var(--accent-dark);box-shadow:0 4px 12px rgba(255,107,53,0.2)}
      .empty{color:var(--muted);text-align:center;padding:40px 20px;font-size:1rem}
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
      const mount = document.querySelector(mountSelector);
      try {
        console.log('[FF] renderDeals starting for', mountSelector);
        FF.injectStyles();
        const list = await FF.loadDeals({ includeScheduled });
        console.log('[FF] Got list with', list.length, 'deals, rendering controls');
        FF.renderControls(mountSelector); // Inject Search/Filter
        FF.renderCards(list, mountSelector);
        console.log('[FF] renderDeals complete');
      } catch (err) {
        console.error('[FF] renderDeals failed:', err.message);
        if (mount) {
          mount.innerHTML = `<p class="empty">❌ Error loading deals: ${err.message}</p>`;
        }
      }
    }
  };
})();
