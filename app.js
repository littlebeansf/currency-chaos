// Currency Chaos — App Logic v3

// ── State ────────────────────────────────────────────────────────────────────
let liveRates    = {};
let cryptoPrices = {};
let fromCurrency = CURRENCIES.find(c => c.code === "USD");
let toCurrency   = CURRENCIES.find(c => c.code === "GAL");
let amount       = 1;
let currentFilter = "all";
let catalogQuery  = "";
let ratesLoaded   = false;
let lastUpdated   = null;

// ── Animated Background ───────────────────────────────────────────────────────
const canvas = document.getElementById("bg-canvas");
const ctx    = canvas.getContext("2d");
let particles  = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticles() {
  particles = [];
  const count = Math.floor((canvas.width * canvas.height) / 22000);
  const symbols = ["$","€","£","¥","₿","⚜","G","₽","◈","¢","฿","§"];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.18 + 0.04,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      size: Math.random() * 9 + 7,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.004
    });
  }
}

function drawBg() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const orbs = [
    { x: canvas.width * 0.15, y: canvas.height * 0.2,  r: canvas.width * 0.35, c: isDark ? "rgba(1,105,111,0.07)"  : "rgba(1,105,111,0.04)"  },
    { x: canvas.width * 0.85, y: canvas.height * 0.75, r: canvas.width * 0.4,  c: isDark ? "rgba(79,152,163,0.06)" : "rgba(1,105,111,0.03)"  },
    { x: canvas.width * 0.5,  y: canvas.height * 0.5,  r: canvas.width * 0.5,  c: isDark ? "rgba(209,153,0,0.025)": "rgba(209,153,0,0.012)" },
  ];
  orbs.forEach(o => {
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    g.addColorStop(0, o.c); g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
    if (p.x < -20) p.x = canvas.width + 20;
    if (p.x > canvas.width + 20) p.x = -20;
    if (p.y < -20) p.y = canvas.height + 20;
    if (p.y > canvas.height + 20) p.y = -20;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = isDark ? "#cdccca" : "#28251d";
    ctx.font = `${p.size}px 'Cabinet Grotesk', sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(p.symbol, 0, 0);
    ctx.restore();
  });
  requestAnimationFrame(drawBg);
}

window.addEventListener("resize", () => { resizeCanvas(); createParticles(); });
resizeCanvas(); createParticles(); drawBg();

// ── Loading Screen ────────────────────────────────────────────────────────────
const LOADING_MSGS = [
  "Bribing the exchange rate gods…",
  "Converting Rupees to reason…",
  "Consulting Ferengi economists…",
  "Counting Tom Nook's interest…",
  "Minting memes into currency…",
  "Asking Geralt his daily rate…",
  "Syncing with CoinGecko…",
  "Calculating Dogecoin's dignity…",
];

// ── Crypto fetch (CoinGecko) ──────────────────────────────────────────────────
const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false";

async function fetchCryptoPrices() {
  try {
    const res = await fetch(COINGECKO_URL);
    if (!res.ok) throw new Error("CoinGecko HTTP " + res.status);
    const data = await res.json();
    const geckoMap = {};
    data.forEach(coin => { geckoMap[coin.id] = coin.current_price; });
    CURRENCIES.forEach(c => {
      if (c.isCrypto && c.geckoId && geckoMap[c.geckoId] != null)
        cryptoPrices[c.code] = geckoMap[c.geckoId];
    });
    return true;
  } catch (e) {
    console.warn("CoinGecko fetch failed:", e);
    const fallback = {
      BTC:96000, ETH:3500, USDT:1, XRP:2.4, BNB:650, SOL:185, USDC:1,
      DOGE:0.18, ADA:0.52, TRX:0.23, AVAX:35, SHIB:0.000022, TON:5.5,
      DOT:8, LINK:15, BCH:480, XLM:0.13, UNI:8, LTC:95, NEAR:6,
      ICP:12, APT:9, ETC:28, STX:1.9, CRO:0.12, FIL:6, HBAR:0.11,
      VET:0.045, MNT:0.95, ALGO:0.17, OP:1.8, ARB:1.1, ATOM:8,
      GRT:0.17, INJ:25, MKR:1800, THETA:1.4, FLOW:0.75, FTM:0.65,
      EGLD:45, XMR:165, IMX:1.6, SAND:0.42, MANA:0.38, AAVE:165,
      AXS:7.5, RUNE:3.8, KCS:12, CFX:0.18
    };
    Object.assign(cryptoPrices, fallback);
    return false;
  }
}

// ── Fiat + crypto fetch ───────────────────────────────────────────────────────
async function fetchLiveRates() {
  const msgEl = document.querySelector(".loader-text");
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
    msgEl.textContent = LOADING_MSGS[msgIdx];
  }, 700);

  try {
    const [fiatRes] = await Promise.all([
      fetch("https://api.exchangerate-api.com/v4/latest/USD"),
      fetchCryptoPrices()
    ]);
    const data = await fiatRes.json();
    liveRates = data.rates;
    CURRENCIES.forEach(c => {
      if (c.realCurrency && !c.isCrypto && c.code !== "USD" && liveRates[c.code])
        c.usdRate = 1 / liveRates[c.code];
    });
    ratesLoaded = true;
    lastUpdated = new Date();
  } catch (e) {
    const fallback = { EUR:0.92, GBP:0.79, JPY:149.5, CHF:0.89, CNY:7.23, CAD:1.36, AUD:1.53, INR:83.1, KRW:1320, BRL:4.97, MXN:17.2, SEK:10.42, NOK:10.68, SGD:1.34, NZD:1.63, ZAR:18.5, RUB:90.2, TRY:32.4 };
    CURRENCIES.forEach(c => {
      if (c.realCurrency && !c.isCrypto && fallback[c.code]) c.usdRate = 1 / fallback[c.code];
    });
    await fetchCryptoPrices();
    lastUpdated = new Date();
  }

  clearInterval(msgInterval);
  document.querySelector(".loader-fill").style.width = "100%";

  setTimeout(() => {
    document.getElementById("loader").style.opacity = "0";
    document.getElementById("loader").style.pointerEvents = "none";
    const app = document.getElementById("app");
    app.classList.remove("hidden");
    app.style.animation = "fadeIn 0.5s cubic-bezier(0.16,1,0.3,1) both";
    initApp();
  }, 450);
}

// ── Manual refresh ────────────────────────────────────────────────────────────
async function refreshRates() {
  const btn  = document.getElementById("refresh-btn");
  const tsEl = document.getElementById("refresh-ts");
  if (!btn) return;
  btn.classList.add("refreshing"); btn.disabled = true;
  try {
    const [fiatRes] = await Promise.all([
      fetch("https://api.exchangerate-api.com/v4/latest/USD"),
      fetchCryptoPrices()
    ]);
    const data = await fiatRes.json();
    liveRates = data.rates;
    CURRENCIES.forEach(c => {
      if (c.realCurrency && !c.isCrypto && c.code !== "USD" && liveRates[c.code])
        c.usdRate = 1 / liveRates[c.code];
    });
    ratesLoaded = true;
    lastUpdated = new Date();
  } catch (e) { console.warn("Refresh failed:", e); }
  btn.classList.remove("refreshing"); btn.disabled = false;
  updateTimestamp(tsEl);
  updateConversion();
  buildCatalog();
}

function updateTimestamp(el) {
  if (!el || !lastUpdated) return;
  const diff = Math.floor((Date.now() - lastUpdated) / 1000);
  el.textContent = diff < 60 ? "just now" : `${Math.floor(diff / 60)}m ago`;
}

// ── Conversion Logic ──────────────────────────────────────────────────────────
function getUSDRate(currency) {
  if (currency.code === "USD") return 1;
  if (currency.isCrypto && cryptoPrices[currency.code] != null)
    return cryptoPrices[currency.code];
  if (currency.realCurrency && liveRates[currency.code])
    return 1 / liveRates[currency.code];
  return currency.usdRate || 1;
}

function convert(amount, from, to) {
  return (amount * getUSDRate(from)) / getUSDRate(to);
}

function formatNumber(n) {
  if (n === 0) return "0";
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (Math.abs(n) >= 1e9)  return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6)  return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1)    return n.toFixed(4).replace(/\.?0+$/, "");
  if (Math.abs(n) >= 0.01) return n.toFixed(6).replace(/\.?0+$/, "");
  return n.toExponential(3);
}

// Animated number counter
let countAnim = null;
function animateValue(el, from, to, duration = 350) {
  if (countAnim) cancelAnimationFrame(countAnim);
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = formatNumber(from + (to - from) * ease);
    if (t < 1) countAnim = requestAnimationFrame(step);
    else el.textContent = formatNumber(to);
  }
  countAnim = requestAnimationFrame(step);
}

// ── Update conversion display ─────────────────────────────────────────────────
let lastResult = 0;
function updateConversion() {
  const result = convert(amount, fromCurrency, toCurrency);
  animateValue(document.getElementById("result-value"), lastResult, result);
  lastResult = result;

  document.getElementById("result-unit").textContent      = toCurrency.code;
  document.getElementById("result-full-name").textContent = toCurrency.name;
  document.getElementById("flavor-text").textContent      = toCurrency.flavorText;

  const rate = convert(1, fromCurrency, toCurrency);
  document.getElementById("rate-text").textContent =
    `1 ${fromCurrency.code} = ${formatNumber(rate)} ${toCurrency.code}`;

  const src = document.getElementById("rate-source-text");
  if (toCurrency.isCrypto && cryptoPrices[toCurrency.code] != null) {
    src.textContent = "Live · CoinGecko"; src.style.color = "var(--color-success)";
  } else if (toCurrency.realCurrency && ratesLoaded) {
    src.textContent = "Live rate"; src.style.color = "var(--color-success)";
  } else if (!toCurrency.realCurrency) {
    src.textContent = toCurrency.canonical ? "Canonical rate" : `Hypothesized · ${toCurrency.universe}`;
    src.style.color = "var(--color-primary)";
  } else {
    src.textContent = "Fallback rate"; src.style.color = "var(--color-warning)";
  }

  // Highlight active row in catalog
  document.querySelectorAll(".catalog-row").forEach(r => {
    r.classList.toggle("active-to", r.dataset.code === toCurrency.code);
  });
}

// ── Dropdowns ────────────────────────────────────────────────────────────────
function buildDropdown(listEl, searchId, onSelect) {
  const groups = { real:[], games:[], tv:[], anime:[], books:[], misc:[] };
  const labels = {
    real:"💰 Real Currencies", games:"🎮 Video Games",
    tv:"📺 TV & Film", anime:"⛩ Anime",
    books:"📚 Books & Literature", misc:"🎲 Misc / Chaos"
  };
  CURRENCIES.forEach(c => { if (groups[c.category]) groups[c.category].push(c); });

  function render(filter = "") {
    listEl.innerHTML = "";
    Object.entries(groups).forEach(([cat, curs]) => {
      const filtered = curs.filter(c =>
        !filter ||
        c.code.toLowerCase().includes(filter) ||
        c.name.toLowerCase().includes(filter) ||
        (c.universe && c.universe.toLowerCase().includes(filter))
      );
      if (!filtered.length) return;
      const grp = document.createElement("div");
      grp.className = "dropdown-group";
      grp.innerHTML = `<div class="dropdown-group-label">${labels[cat]}</div>`;
      filtered.forEach(currency => {
        const item = document.createElement("div");
        item.className = "dropdown-item";
        item.setAttribute("role", "option");
        item.dataset.code = currency.code;
        item.innerHTML = `
          <span class="item-flag">${currency.flag}</span>
          <span class="item-code">${currency.code}</span>
          <span class="item-name">${currency.name}</span>
          ${currency.universe ? `<span class="item-universe">${currency.universe}</span>` : ""}
        `;
        item.addEventListener("click", () => {
          onSelect(currency);
          closeAllDropdowns();
          document.getElementById(searchId).value = "";
          render("");
        });
        grp.appendChild(item);
      });
      listEl.appendChild(grp);
    });
  }

  render();
  document.getElementById(searchId).addEventListener("input", e => render(e.target.value.toLowerCase().trim()));
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("open"));
  document.querySelectorAll(".selected-display").forEach(d => d.classList.remove("active"));
}

function updateSelector(side) {
  const c = side === "from" ? fromCurrency : toCurrency;
  document.getElementById(`${side}-flag`).textContent = c.flag;
  document.getElementById(`${side}-code`).textContent = c.code;
  document.getElementById(`${side}-name`).textContent = c.name;
}

// ── Catalog Panel ─────────────────────────────────────────────────────────────
function getCatalogRows() {
  let list = currentFilter === "all"
    ? CURRENCIES
    : CURRENCIES.filter(c => c.category === currentFilter);

  const q = catalogQuery.toLowerCase().trim();
  if (q) {
    list = list.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.universe && c.universe.toLowerCase().includes(q)) ||
      c.flavorText.toLowerCase().includes(q)
    );
  }
  return list;
}

function getDisplayRate(c) {
  if (c.isCrypto && cryptoPrices[c.code] != null) {
    return `$${formatNumber(cryptoPrices[c.code])}`;
  }
  if (c.realCurrency && liveRates[c.code]) {
    return `$${formatNumber(1 / liveRates[c.code])}`;
  }
  if (c.code === "USD") return "$1.00";
  if (!c.realCurrency && c.usdRate) {
    return `≈$${formatNumber(c.usdRate)}`;
  }
  return "";
}

function buildCatalog() {
  const listEl    = document.getElementById("catalog-list");
  const countEl   = document.getElementById("catalog-count");
  const rows      = getCatalogRows();
  const fragment  = document.createDocumentFragment();

  rows.forEach(c => {
    const row = document.createElement("div");
    row.className = "catalog-row" + (c.code === toCurrency.code ? " active-to" : "");
    row.setAttribute("role", "listitem");
    row.dataset.code = c.code;

    let badgeClass, badgeText;
    if (c.isCrypto)        { badgeClass = "badge-crypto"; badgeText = "Crypto"; }
    else if (c.realCurrency){ badgeClass = "badge-real";   badgeText = "Real"; }
    else                    { badgeClass = "badge-fake";   badgeText = "Fictional"; }

    row.innerHTML = `
      <span class="crow-flag">${c.flag}</span>
      <span class="crow-code">${c.code}</span>
      <div class="crow-name-wrap">
        <div class="crow-name">${c.name}</div>
        ${c.universe ? `<div class="crow-universe">${c.universe}</div>` : ""}
      </div>
      <span class="crow-badge ${badgeClass}">${badgeText}</span>
      <span class="crow-rate">${getDisplayRate(c)}</span>
      <button class="crow-set-btn" data-code="${c.code}" title="Set as target">Use →</button>
    `;

    // Click row → set as toCurrency
    row.addEventListener("click", (e) => {
      if (e.target.classList.contains("crow-set-btn") || e.target.closest(".crow-set-btn")) return;
      toCurrency = c;
      updateSelector("to");
      updateConversion();
    });

    // Set button (also handles it but avoids double-fire)
    row.querySelector(".crow-set-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toCurrency = c;
      updateSelector("to");
      updateConversion();
    });

    fragment.appendChild(row);
  });

  listEl.innerHTML = "";
  listEl.appendChild(fragment);

  countEl.textContent = `${rows.length} of ${CURRENCIES.length} currencies`;
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
function initFilterTabs() {
  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      buildCatalog();
    });
  });
}

// ── Catalog search ────────────────────────────────────────────────────────────
function initCatalogSearch() {
  document.getElementById("catalog-search").addEventListener("input", e => {
    catalogQuery = e.target.value;
    buildCatalog();
  });
}

// ── Typewriter ────────────────────────────────────────────────────────────────
const ROTATING_WORDS = [
  "Everything","Galleons","Bottle Caps","Septims","Latinum","Rupees",
  "Gil","Simoleons","Zeni","Chaos","V-Bucks","Eddies","Bitcoin","Vibes",
];
let wordIdx = 0;

function typewriterRun() {
  const wrapper = document.getElementById("rotating-word");

  function getText()    { return wrapper.childNodes[0] ? wrapper.childNodes[0].textContent : ""; }
  function setText(t)   { if (wrapper.childNodes[0]) wrapper.childNodes[0].textContent = t; }

  function erase(cb) {
    const cur = getText();
    if (!cur.length) { cb(); return; }
    setText(cur.slice(0, -1));
    setTimeout(() => erase(cb), 52);
  }
  function type(target, cb) {
    const cur = getText();
    if (cur === target) { cb(); return; }
    setText(target.slice(0, cur.length + 1));
    setTimeout(() => type(target, cb), 88);
  }
  function loop() {
    wordIdx = (wordIdx + 1) % ROTATING_WORDS.length;
    setTimeout(() => {
      erase(() => setTimeout(() => type(ROTATING_WORDS[wordIdx], () => setTimeout(loop, 2200)), 160));
    }, 2200);
  }
  setTimeout(loop, 2200);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function animateStats() {
  document.getElementById("stat-currencies").textContent = CURRENCIES.length;
  document.getElementById("stat-fictional").textContent  = CURRENCIES.filter(c => !c.realCurrency).length;
  document.getElementById("stat-canonical").textContent  = CURRENCIES.filter(c => !c.realCurrency && c.canonical).length;
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initApp() {
  // Build from/to dropdowns
  buildDropdown(document.getElementById("from-list"), "from-search",
    c => { fromCurrency = c; updateSelector("from"); updateConversion(); buildCatalog(); }
  );
  buildDropdown(document.getElementById("to-list"), "to-search",
    c => { toCurrency = c; updateSelector("to"); updateConversion(); buildCatalog(); }
  );

  // Dropdown toggle
  document.getElementById("from-display").addEventListener("click", e => {
    e.stopPropagation();
    const dd = document.getElementById("from-dropdown");
    const wasOpen = dd.classList.contains("open");
    closeAllDropdowns();
    if (!wasOpen) {
      dd.classList.add("open");
      document.getElementById("from-display").classList.add("active");
      setTimeout(() => document.getElementById("from-search").focus(), 50);
    }
  });
  document.getElementById("to-display").addEventListener("click", e => {
    e.stopPropagation();
    const dd = document.getElementById("to-dropdown");
    const wasOpen = dd.classList.contains("open");
    closeAllDropdowns();
    if (!wasOpen) {
      dd.classList.add("open");
      document.getElementById("to-display").classList.add("active");
      setTimeout(() => document.getElementById("to-search").focus(), 50);
    }
  });
  document.addEventListener("click", closeAllDropdowns);
  document.querySelectorAll(".dropdown").forEach(d => d.addEventListener("click", e => e.stopPropagation()));

  // Amount
  document.getElementById("amount-input").addEventListener("input", e => {
    amount = parseFloat(e.target.value) || 0;
    updateConversion();
  });

  // Swap
  document.getElementById("swap-btn").addEventListener("click", () => {
    [fromCurrency, toCurrency] = [toCurrency, fromCurrency];
    updateSelector("from"); updateSelector("to");
    const btn = document.getElementById("swap-btn");
    btn.style.transform = "rotate(180deg)";
    setTimeout(() => btn.style.transform = "", 280);
    updateConversion(); buildCatalog();
  });

  // Refresh
  document.getElementById("refresh-btn")?.addEventListener("click", refreshRates);

  // Theme
  const themeBtn = document.querySelector("[data-theme-toggle]");
  const html = document.documentElement;
  let theme = matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
  html.setAttribute("data-theme", theme);
  updateThemeIcon(themeBtn, theme);
  themeBtn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", theme);
    updateThemeIcon(themeBtn, theme);
  });

  updateSelector("from"); updateSelector("to");
  updateConversion();
  buildCatalog();
  initFilterTabs();
  initCatalogSearch();
  animateStats();
  typewriterRun();

  // Timestamp
  updateTimestamp(document.getElementById("refresh-ts"));
  setInterval(() => updateTimestamp(document.getElementById("refresh-ts")), 60000);

  // Scroll active catalog row into view
  setTimeout(() => {
    const active = document.querySelector(".catalog-row.active-to");
    active?.scrollIntoView({ block: "center" });
  }, 100);
}

function updateThemeIcon(btn, theme) {
  btn.innerHTML = theme === "dark"
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
fetchLiveRates();
