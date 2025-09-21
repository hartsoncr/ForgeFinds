/* ForgeFinds deals rendering (v8) */
(function () {
  const FF = (() => {
    const parseISO = (s = "") => new Date(s);
    const now = () => new Date();

    // --- date helpers ---
    const addDays = (date, days) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };
    const toISO = (date) => date.toISOString();

    async function loadDeals({ includeScheduled = false } = {}) {
      const res = await fetch(`${basePath()}/data/deals.json?cb=${Date.now()}`);
      if (!res.ok) throw new Error(`Failed to load deals.json: ${res.status}`);
      let deals = await res.json();

      const n = now();

      // normalize: ensure expires_at = publish_at + 60 days if missing
      deals = deals.map((d) => {
        const pub = d.publish_at || d.created_at || toISO(n);
        const exp = d.expires_at || toISO(addDays(parseISO(pub), 60));
        return { ...d, publish_at: pub, expires_at: exp };
      });

      const list = deals
        .filter((d) => {
          const pub = parseISO(d.publish_at);
          const exp = parseISO(d.expires_at);
          const isLive = pub <= n && exp > n;
          return includeScheduled ? true : isLive;
        })
        .sort(
          (a, b) =>
            parseISO(b.publish_at).getTime() - parseISO(a.publish_at).getTime()
        )
        .map(deriveNumbers);

      return list;
    }

    // --- price / % off helpers ---
    const moneyRx = /\$([\d,]+(?:\.\d{1,2})?)/g;
    const dollarsOne = (str) => {
      if (!str) return null;
      const m = /\$([\d,]+(?:\.\d{1,2})?)/.exec(str);
      return m ? parseFloat(m[1].replace(/,/g, "")) : null;
    };
    const percentOne = (str) => {
      if (!str) return null;
      const m = /(\d{1,3})\s*%/.exec(str);
      return m ? parseFloat(m[1]) : null;
    };
    const extractWas = (info = "") => {
      const m = /was[^$]*\$([\d,]+(?:\.\d{1,2})?)/i.exec(info);
      if (m) return parseFloat(m[1].replace(/,/g, ""));
      const monies = [...info.matchAll(moneyRx)].map((m) =>
        parseFloat(m[1].replace(/,/g, ""))
      );
      if (monies.length >= 2) {
        const first = monies[0],
          last = monies[monies.length - 1];
        if (last > first) return last;
      }
      return null;
    };

    function deriveNumbers(d) {
      let price = dollarsOne(d.display_price) ?? dollarsOne(d.price_info);
      const couponText = (d.coupon || "").toLowerCase();
      const dollarOff = dollarsOne(couponText);
      const pctOffCoupon = percentOne(couponText);

      if (price != null) {
        if (pctOffCoupon != null)
          price = +(price * (1 - pctOffCoupon / 100)).toFixed(2);
        if (dollarOff != null)
          price = Math.max(0, +(price - dollarOff).toFixed(2));
      }

      let pct = pctOffCoupon ?? percentOne(d.price_info || "");
      if (pct == null && price != null) {
        const was = extractWas(d.price_info || "");
        if (was && was > 0 && price <= was)
          pct = Math.round(100 * (1 - price / was));
      }

      return { ...d, __price: price, __pctOff: pct };
    }

    function money(s) {
      return s || "";
    }

    function dealCardHTML(d) {
      const priceText = d.display_price || d.price_info || "";
      const offBadge =
        d.__pctOff != null
          ? `<span class="badge off">${d.__pctOff}% off</span>`
          : "";
      const coupon = d.coupon
        ? `<span class="badge coupon">${escapeHTML(d.coupon)}</span>`
        : "";
      const expired = parseISO(d.expires_at || "") <= now();
      const store = d.store || "Shop";

      return `
      <article class="deal-card ${expired ? "expired" : ""}">
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
          <a class="cta" href="${d.affiliate_url}" target="_blank" rel="nofollow noopener">Shop at ${escapeHTML(
            store
          )}</a>
        </div>
      </article>`;
    }

    function renderList(deals, mountSelector = "#deals") {
      const mount = document.querySelector(mountSelector);
      if (!mount) return;
      if (!deals.length) {
        mount.innerHTML = `<p class="empty">No live deals yet. Check back soon.</p>`;
        return;
      }
      mount.innerHTML = deals.map(dealCardHTML).join("");
    }

    function injectStyles() {
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

    function basePath() {
      return "";
    }

    function escapeHTML(str = "") {
      return str.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[m]);
    }

    return { loadDeals, renderList, injectStyles };
  })();

  window.ForgeFinds = {
    async renderDeals({ mountSelector = "#deals", includeScheduled = false } = {}) {
      try {
        FF.injectStyles();
        const list = await FF.loadDeals({ includeScheduled });
        FF.renderList(list, mountSelector);
      } catch (err) {
        console.error(err);
        const mount = document.querySelector(mountSelector);
        if (mount)
          mount.innerHTML = `<p class="empty">We couldn’t load deals right now.</p>`;
      }
    },
    loadDeals: (opts) => FF.loadDeals(opts),
    renderFromList: (list, mount = "#deals") => {
      FF.injectStyles();
      FF.renderList(list || [], mount);
    }
  };
})();
