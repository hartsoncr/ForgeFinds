/* ForgeFinds deals rendering (v9 - Search & Filter Upgrade) */
(function () {
  const FF = (() => {
    const parseISO = (s = "") => new Date(s);
    const now = () => new Date();
    let allDeals = []; // Local cache for filtering

    // --- Helpers ---
    const addDays = (d, days) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };
    const toISO = (d) => d.toISOString();
    const escapeHTML = (s = "") => s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);

    async function loadDeals({ includeScheduled = false } = {}) {
      const res = await fetch(`${basePath()}/data/deals.json?cb=${Date.now()}`);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      let deals = await res.json();
      const n = now();

      // Normalize & Filter Dates
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

      allDeals = deals; // Cache for filtering
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
        // Simple "Was" extraction
        const m = /was[^$]*\$([\d,]+)/i.exec(d.price_info || "");
        const was = m ? parseFloat(m[1].replace(/,/g, "")) : null;
        if (was && was > price) pct = Math.round(100 * (1 - price / was));
      }
      return { ...d, __price: price, __pctOff: pct };
    }

    // --- Rendering ---
    function dealCardHTML(d) {
      const expired = parseISO(d.expires_at) <= now();
      const offBadge = d.__pctOff ? `<span class="badge off">${d.__pctOff}% off</span>` : "";
      const coupon = d.coupon ? `<span class="badge coupon">${escapeHTML(d.coupon)}</span>` : "";
      
      return `
      <article class="deal-card ${expired ? "expired" : ""}" data-cat="${escapeHTML(d.category || 'other')}">
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

    function renderControls(mount, categories) {
        const ctrls = document.createElement('div');
        ctrls.className = 'ff-controls';
        
        // Category Buttons
        const btns = ['All', ...categories].map(c => 
            `<button class="filter-btn ${c === 'All' ? 'active' : ''}" data-filter="${c}">${c === 'All' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}</button>`
        ).join('');

        ctrls.innerHTML = `
            <input type="text" id="ff-search" placeholder="Search deals..." class="search-input">
            <div class="filter-group">${btns}</div>
        `;
        
        // Insert before the grid
        const grid = document.querySelector(mount);
        grid.parentNode.insertBefore(ctrls, grid);

        // Events
        document.getElementById('ff-search').addEventListener('keyup', (e) => filterDeals(e.target.value));
        ctrls.querySelectorAll('.filter-btn').forEach(b => {
            b.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                filterDeals(document.getElementById('ff-search').value, e.target.dataset.filter);
            });
        });
    }

    function filterDeals(search = "", category = null) {
        // If category is null, find the active button
        if (!category) {
            const active = document.querySelector('.filter-btn.active');
            category = active ? active.dataset.filter : 'All';
        }

        const term = search.toLowerCase();
        const filtered = allDeals.filter(d => {
            const matchesSearch = (d.title + d.description).toLowerCase().includes(term);
            const matchesCat = category === 'All' || (d.category || "").toLowerCase() === category.toLowerCase();
            return matchesSearch && matchesCat;
        });
        
        renderList(filtered);
    }

    function renderList(deals, mountSelector = "#deals") {
      const mount = document.querySelector(mountSelector);
      if (!mount) return;
      if (!deals.length) {
        mount.innerHTML = `<p class="empty">No deals found.</p>`;
        return;
      }
      mount.innerHTML = deals.map(dealCardHTML).join("");
    }

    function injectStyles() {
      if (document.getElementById("ff-styles")) return;
      const css = `
      :root{--bg:#0f1115;--card:#12151d;--line:#202635;--text:#e6edf6;--muted:#a7b0bf;--accent:#f97316;--good:#9ef199;--goodbg:#1e2a1e;--couponbg:#19233a;}
      body{background:var(--bg);color:var(--text);font-family:sans-serif}
      .ff-controls{margin-bottom:20px; display:flex; flex-direction:column; gap:10px;}
      .search-input{padding:10px; border-radius:8px; border:1px solid var(--line); background:var(--card); color:white;}
      .filter-group{display:flex; gap:8px; flex-wrap:wrap;}
      .filter-btn{background:var(--card); border:1px solid var(--line); color:var(--muted); padding:6px 12px; border-radius:20px; cursor:pointer; transition:0.2s}
      .filter-btn:hover, .filter-btn.active{background:var(--accent); color:#000; border-color:var(--accent);}
      
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
      @media(min-width:600px){ .ff-controls{flex-direction:row; justify-content:space-between; align-items:center;} .search-input{width:250px;} }
      `;
      const style = document.createElement("style");
      style.id = "ff-styles";
      style.textContent = css;
      document.head.appendChild(style);
    }

    function basePath() { return ""; } // Adjust if hosted in a subdir

    return { loadDeals, renderList, injectStyles, renderControls };
  })();

  window.ForgeFinds = {
    async renderDeals({ mountSelector = "#deals", includeScheduled = false } = {}) {
      try {
        FF.injectStyles();
        const list = await FF.loadDeals({ includeScheduled });
        
        // Extract unique categories for the filter buttons
        const categories = [...new Set(list.map(d => d.category).filter(Boolean))].sort();
        
        FF.renderControls(mountSelector, categories);
        FF.renderList(list, mountSelector);
      } catch (err) {
        console.error(err);
        const mount = document.querySelector(mountSelector);
        if (mount) mount.innerHTML = `<p class="empty">We couldn’t load deals right now.</p>`;
      }
    }
  };
})();
