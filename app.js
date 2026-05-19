// Currency Chaos — App Logic

// ── State ────────────────────────────────────────────────────────────────────
let liveRates = {};
let cryptoPrices = {}; // code → USD price (e.g. BTC → 67000)
let fromCurrency = CURRENCIES.find(c => c.code === "USD");
let toCurrency   = CURRENCIES.find(c => c.code === "GAL");
let amount = 1;
let currentFilter = "all";
let ratesLoaded = false;
let lastUpdated = null;

// ── Animated Background ───────────────────────────────────────────────────────
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticles() {
  particles = [];
  const count = Math.floor((canvas.width * canvas.height) / 18000);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.25 + 0.05,
      symbol: ["$","€","£","¥","₿","⚜","G","₽","◈","¢","฿","§"][Math.floor(Math.random()*12)],
      size: Math.random() * 10 + 8,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.005
    });
  }
}

function drawBg() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Gradient orbs
  const gradients = [
    { x: canvas.width * 0.15, y: canvas.height * 0.2,  r: canvas.width * 0.35, c1: isDark ? "rgba(1,105,111,0.07)" : "rgba(1,105,111,0.04)", c2: "transparent" },
    { x: canvas.width * 0.85, y: canvas.height * 0.7,  r: canvas.width * 0.4,  c1: isDark ? "rgba(79,152,163,0.06)" : "rgba(1,105,111,0.035)", c2: "transparent" },
    { x: canvas.width * 0.5,  y: canvas.height * 0.5,  r: canvas.width * 0.5,  c1: isDark ? "rgba(209,153,0,0.025)" : "rgba(209,153,0,0.015)", c2: "transparent" },
  ];
  gradients.forEach(g => {
    const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
    grad.addColorStop(0, g.c1);
    grad.addColorStop(1, g.c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  // Floating currency symbols
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.rotSpeed;
    if (p.x < -20) p.x = canvas.width + 20;
    if (p.x > canvas.width + 20) p.x = -20;
    if (p.y < -20) p.y = canvas.height + 20;
    if (p.y > canvas.height + 20) p.y = -20;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = isDark ? "#cdccca" : "#28251d";
    ctx.font = `${p.size}px 'Cabinet Grotesk', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.symbol, 0, 0);
    ctx.restore();
  });

  requestAnimationFrame(drawBg);
}

window.addEventListener("resize", () => { resizeCanvas(); createParticles(); });
resizeCanvas();
createParticles();
drawBg();

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
    // Build a geckoId → price map
    const geckoMap = {};
    data.forEach(coin => { geckoMap[coin.id] = coin.current_price; });

    // Inject into our crypto currencies
    CURRENCIES.forEach(c => {
      if (c.isCrypto && c.geckoId && geckoMap[c.geckoId] != null) {
        cryptoPrices[c.code] = geckoMap[c.geckoId];
      }
    });
    return true;
  } catch (e) {
    console.warn("CoinGecko fetch failed:", e);
    // Fallback static prices
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

// ── Live rates fetch ──────────────────────────────────────────────────────────
async function fetchLiveRates() {
  const msgEl = document.querySelector(".loader-text");
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
    msgEl.textContent = LOADING_MSGS[msgIdx];
  }, 700);

  try {
    // Fetch fiat and crypto in parallel
    const [fiatRes] = await Promise.all([
      fetch("https://api.exchangerate-api.com/v4/latest/USD"),
      fetchCryptoPrices()
    ]);
    const data = await fiatRes.json();
    liveRates = data.rates;
    // Inject live fiat rates
    CURRENCIES.forEach(c => {
      if (c.realCurrency && !c.isCrypto && c.code !== "USD" && liveRates[c.code]) {
        c.usdRate = 1 / liveRates[c.code];
      }
    });
    ratesLoaded = true;
    lastUpdated = new Date();
  } catch (e) {
    // Fallback fiat rates if API fails
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
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("app").style.animation = "fadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both";
    initApp();
  }, 500);
}

// ── Manual refresh ────────────────────────────────────────────────────────────
async function refreshRates() {
  const btn = document.getElementById("refresh-btn");
  const tsEl = document.getElementById("refresh-ts");
  if (!btn) return;

  btn.classList.add("refreshing");
  btn.disabled = true;

  try {
    const [fiatRes, cryptoOk] = await Promise.all([
      fetch("https://api.exchangerate-api.com/v4/latest/USD"),
      fetchCryptoPrices()
    ]);
    const data = await fiatRes.json();
    liveRates = data.rates;
    CURRENCIES.forEach(c => {
      if (c.realCurrency && !c.isCrypto && c.code !== "USD" && liveRates[c.code]) {
        c.usdRate = 1 / liveRates[c.code];
      }
    });
    ratesLoaded = true;
    lastUpdated = new Date();
  } catch (e) {
    console.warn("Refresh failed:", e);
  }

  btn.classList.remove("refreshing");
  btn.disabled = false;
  updateTimestamp(tsEl);
  updateConversion();
  buildCards(currentFilter);
  buildQuickPicks();
}

function updateTimestamp(el) {
  if (!el || !lastUpdated) return;
  const now = new Date();
  const diffSec = Math.floor((now - lastUpdated) / 1000);
  if (diffSec < 60) {
    el.textContent = "just now";
  } else {
    const m = Math.floor(diffSec / 60);
    el.textContent = `${m}m ago`;
  }
}

// ── Conversion Logic ──────────────────────────────────────────────────────────
function getUSDRate(currency) {
  if (currency.code === "USD") return 1;
  // Crypto: cryptoPrices stores USD price directly (e.g. BTC=96000 USD per 1 BTC)
  if (currency.isCrypto && cryptoPrices[currency.code] != null) {
    return cryptoPrices[currency.code]; // USD per 1 coin
  }
  if (currency.realCurrency && liveRates[currency.code]) {
    return 1 / liveRates[currency.code];
  }
  return currency.usdRate || 1;
}

function convert(amount, from, to) {
  const fromUSD = getUSDRate(from);
  const toUSD   = getUSDRate(to);
  // amount in from → USD → to
  const inUSD   = amount * fromUSD;
  return inUSD / toUSD;
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

// ── Animated counter ──────────────────────────────────────────────────────────
let countAnim = null;
function animateValue(el, from, to, duration = 400) {
  if (countAnim) cancelAnimationFrame(countAnim);
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = from + (to - from) * ease;
    el.textContent = formatNumber(val);
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

  document.getElementById("result-unit").textContent = toCurrency.code;
  document.getElementById("result-full-name").textContent = toCurrency.name;
  document.getElementById("flavor-text").textContent = toCurrency.flavorText;

  const oneFromInTo = convert(1, fromCurrency, toCurrency);
  document.getElementById("rate-text").textContent =
    `1 ${fromCurrency.code} = ${formatNumber(oneFromInTo)} ${toCurrency.code}`;

  const sourceEl = document.getElementById("rate-source-text");
  if (toCurrency.isCrypto && cryptoPrices[toCurrency.code] != null) {
    sourceEl.textContent = "Live · CoinGecko";
    sourceEl.style.color = "var(--color-success)";
  } else if (toCurrency.realCurrency && ratesLoaded) {
    sourceEl.textContent = "Live rate";
    sourceEl.style.color = "var(--color-success)";
  } else if (!toCurrency.realCurrency) {
    sourceEl.textContent = `from ${toCurrency.universe}`;
    sourceEl.style.color = "var(--color-primary)";
  } else {
    sourceEl.textContent = "Fallback rate";
    sourceEl.style.color = "var(--color-warning)";
  }
}

// ── Currency Selectors ────────────────────────────────────────────────────────
function buildDropdown(listEl, searchId, onSelect) {
  const groups = { real: [], games: [], tv: [], anime: [], books: [], misc: [] };
  const labels = { real: "💰 Real Currencies", games: "🎮 Video Games", tv: "📺 TV & Film", anime: "⛩ Anime", books: "📚 Books & Literature", misc: "🎲 Misc / Chaos" };

  CURRENCIES.forEach(c => {
    if (groups[c.category]) groups[c.category].push(c);
  });

  function render(filter = "") {
    listEl.innerHTML = "";
    Object.entries(groups).forEach(([cat, currencies]) => {
      const filtered = currencies.filter(c =>
        !filter || c.code.toLowerCase().includes(filter) || c.name.toLowerCase().includes(filter) || (c.universe && c.universe.toLowerCase().includes(filter))
      );
      if (filtered.length === 0) return;
      const groupEl = document.createElement("div");
      groupEl.className = "dropdown-group";
      groupEl.innerHTML = `<div class="dropdown-group-label">${labels[cat]}</div>`;
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
        groupEl.appendChild(item);
      });
      listEl.appendChild(groupEl);
    });
  }

  render();
  document.getElementById(searchId).addEventListener("input", e => render(e.target.value.toLowerCase()));
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("open"));
  document.querySelectorAll(".selected-display").forEach(d => d.classList.remove("active"));
}

function updateSelector(side) {
  const currency = side === "from" ? fromCurrency : toCurrency;
  document.getElementById(`${side}-flag`).textContent  = currency.flag;
  document.getElementById(`${side}-code`).textContent  = currency.code;
  document.getElementById(`${side}-name`).textContent  = currency.name;
}

// ── Quick Picks ───────────────────────────────────────────────────────────────
function buildQuickPicks() {
  const grid = document.getElementById("quick-grid");
  grid.innerHTML = "";
  QUICK_PICKS.forEach(qp => {
    const btn = document.createElement("button");
    btn.className = "quick-pick";
    const fc = CURRENCIES.find(c => c.code === qp.from);
    const tc = CURRENCIES.find(c => c.code === qp.to);
    btn.innerHTML = `
      <span class="qp-flags">${fc.flag} → ${tc.flag}</span>
      <span class="qp-label">${qp.label}</span>
      <span class="qp-rate">${formatNumber(convert(1, fc, tc))} ${qp.to}</span>
    `;
    btn.addEventListener("click", () => {
      fromCurrency = fc;
      toCurrency   = tc;
      updateSelector("from");
      updateSelector("to");
      updateConversion();
    });
    grid.appendChild(btn);
  });
}

// ── Cards Grid ────────────────────────────────────────────────────────────────
function buildCards(filter = "all") {
  const grid = document.getElementById("cards-grid");
  grid.innerHTML = "";
  const list = filter === "all" ? CURRENCIES : CURRENCIES.filter(c => c.category === filter);

  list.forEach((currency, i) => {
    const card = document.createElement("div");
    card.className = "currency-card fade-in";
    card.style.animationDelay = `${Math.min(i * 25, 400)}ms`;

    const isReal = currency.realCurrency;
    let displayRate;
    if (currency.isCrypto && cryptoPrices[currency.code] != null) {
      displayRate = `1 ${currency.code} = ${formatNumber(cryptoPrices[currency.code])} USD`;
    } else if (isReal) {
      displayRate = `1 ${currency.code} = ${formatNumber(getUSDRate(currency))} USD`;
    } else {
      displayRate = `1 USD ≈ ${formatNumber(1 / (currency.usdRate || 1))} ${currency.code}`;
    }

    card.innerHTML = `
      <div class="card-header">
        <span class="card-flag">${currency.flag}</span>
        <div class="card-codes">
          <span class="card-code">${currency.code}</span>
          <span class="card-badge ${isReal ? "badge-real" : "badge-fake"}">${isReal ? (currency.isCrypto ? "Crypto" : "Real") : "Fictional"}</span>
        </div>
        <span class="card-symbol">${currency.symbol}</span>
      </div>
      <h3 class="card-name">${currency.name}</h3>
      ${currency.universe ? `<p class="card-universe">from ${currency.universe}</p>` : ""}
      <p class="card-rate">${displayRate}</p>
      <p class="card-flavor">${currency.flavorText}</p>
      <button class="card-convert-btn" data-code="${currency.code}">Convert →</button>
    `;
    grid.appendChild(card);
  });

  // Card convert buttons
  grid.querySelectorAll(".card-convert-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const c = CURRENCIES.find(x => x.code === btn.dataset.code);
      if (!c) return;
      toCurrency = c;
      updateSelector("to");
      updateConversion();
      document.querySelector(".converter-section").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

// ── Filter Tabs ───────────────────────────────────────────────────────────────
function initFilterTabs() {
  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      buildCards(currentFilter);
    });
  });
}

// ── Typewriter animation in hero ──────────────────────────────────────────────
const ROTATING_WORDS = [
  "Everything",
  "Galleons",
  "Bottle Caps",
  "Septims",
  "Latinum",
  "Rupees",
  "Gil",
  "Simoleons",
  "Zeni",
  "Chaos",
  "V-Bucks",
  "Eddies",
  "Bitcoin",
  "Vibes",
];
let wordIdx = 0;
let typeTimeout = null;

function typewriterRun() {
  const wrapper = document.getElementById("rotating-word");
  const cursor  = wrapper.querySelector(".cursor");

  function getText() {
    return wrapper.childNodes[0] ? wrapper.childNodes[0].textContent : "";
  }
  function setText(t) {
    wrapper.childNodes[0].textContent = t;
  }

  function erase(cb) {
    const current = getText();
    if (current.length === 0) { cb(); return; }
    setText(current.slice(0, -1));
    typeTimeout = setTimeout(() => erase(cb), 55);
  }

  function type(target, cb) {
    const current = getText();
    if (current === target) { cb(); return; }
    setText(target.slice(0, current.length + 1));
    typeTimeout = setTimeout(() => type(target, cb), 90);
  }

  function loop() {
    wordIdx = (wordIdx + 1) % ROTATING_WORDS.length;
    const next = ROTATING_WORDS[wordIdx];
    typeTimeout = setTimeout(() => {
      erase(() => {
        typeTimeout = setTimeout(() => {
          type(next, () => {
            typeTimeout = setTimeout(loop, 2200);
          });
        }, 180);
      });
    }, 2200);
  }

  typeTimeout = setTimeout(loop, 2200);
}

// ── Stat counter animation ────────────────────────────────────────────────────
function animateStats() {
  const realCount = CURRENCIES.filter(c => c.realCurrency && !c.isCrypto).length;
  const cryptoCount = CURRENCIES.filter(c => c.isCrypto).length;
  const fictCount  = CURRENCIES.filter(c => !c.realCurrency).length;
  const canonCount = CURRENCIES.filter(c => !c.realCurrency && c.canonical).length;
  document.getElementById("stat-currencies").textContent = CURRENCIES.length;
  document.getElementById("stat-fictional").textContent  = fictCount;
  document.getElementById("stat-canonical").textContent  = canonCount;
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initApp() {
  // Selectors
  buildDropdown(
    document.getElementById("from-list"), "from-search",
    c => { fromCurrency = c; updateSelector("from"); updateConversion(); }
  );
  buildDropdown(
    document.getElementById("to-list"), "to-search",
    c => { toCurrency = c; updateSelector("to"); updateConversion(); }
  );

  // Toggle dropdowns
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

  // Amount input
  document.getElementById("amount-input").addEventListener("input", e => {
    amount = parseFloat(e.target.value) || 0;
    updateConversion();
  });

  // Swap
  document.getElementById("swap-btn").addEventListener("click", () => {
    [fromCurrency, toCurrency] = [toCurrency, fromCurrency];
    updateSelector("from");
    updateSelector("to");
    const swapBtn = document.getElementById("swap-btn");
    swapBtn.style.transform = "rotate(180deg)";
    setTimeout(() => swapBtn.style.transform = "", 300);
    updateConversion();
  });

  // Refresh button
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshRates);
  }

  // Theme toggle
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

  updateSelector("from");
  updateSelector("to");
  updateConversion();
  buildQuickPicks();
  buildCards();
  initFilterTabs();
  animateStats();
  typewriterRun();

  // Show initial timestamp
  const tsEl = document.getElementById("refresh-ts");
  updateTimestamp(tsEl);
  // Update timestamp display every minute
  setInterval(() => updateTimestamp(document.getElementById("refresh-ts")), 60000);
}

function updateThemeIcon(btn, theme) {
  btn.innerHTML = theme === "dark"
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
}

// ── Kick it off ───────────────────────────────────────────────────────────────
fetchLiveRates();
