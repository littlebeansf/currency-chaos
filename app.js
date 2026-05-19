// Currency Chaos — App Logic

// ── State ────────────────────────────────────────────────────────────────────
let liveRates = {};
let fromCurrency = CURRENCIES.find(c => c.code === "USD");
let toCurrency   = CURRENCIES.find(c => c.code === "GAL");
let amount = 1;
let currentFilter = "all";
let ratesLoaded = false;

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
];

async function fetchLiveRates() {
  const msgEl = document.querySelector(".loader-text");
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
    msgEl.textContent = LOADING_MSGS[msgIdx];
  }, 700);

  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await res.json();
    liveRates = data.rates;
    // Inject live rates for real currencies
    CURRENCIES.forEach(c => {
      if (c.realCurrency && c.code !== "USD" && liveRates[c.code]) {
        c.usdRate = 1 / liveRates[c.code];
      }
    });
    ratesLoaded = true;
  } catch (e) {
    // Fallback rates if API fails
    const fallback = { EUR:0.92, GBP:0.79, JPY:149.5, CHF:0.89, CNY:7.23, CAD:1.36, AUD:1.53, INR:83.1, KRW:1320, BRL:4.97, MXN:17.2, SEK:10.42, NOK:10.68, SGD:1.34, NZD:1.63, ZAR:18.5, RUB:90.2, TRY:32.4, BTC:0.0000158, ETH:0.000265, DOGE:7.3 };
    CURRENCIES.forEach(c => {
      if (c.realCurrency && fallback[c.code]) c.usdRate = fallback[c.code] > 10 ? 1/fallback[c.code] : fallback[c.code];
    });
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

// ── Conversion Logic ──────────────────────────────────────────────────────────
function getUSDRate(currency) {
  if (currency.code === "USD") return 1;
  if (currency.realCurrency && liveRates[currency.code]) {
    return 1 / liveRates[currency.code];
  }
  return currency.usdRate || 1;
}

function convert(amount, from, to) {
  const fromUSD = getUSDRate(from);
  const toUSD   = getUSDRate(to);
  // amount in from → USD → to
  const inUSD   = amount / fromUSD;
  return inUSD * toUSD;
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

  const fromUSDRate = getUSDRate(fromCurrency);
  const toUSDRate   = getUSDRate(toCurrency);
  const oneFromInTo = convert(1, fromCurrency, toCurrency);
  document.getElementById("rate-text").textContent =
    `1 ${fromCurrency.code} = ${formatNumber(oneFromInTo)} ${toCurrency.code}`;

  const sourceEl = document.getElementById("rate-source-text");
  if (toCurrency.realCurrency && ratesLoaded) {
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
    const rateFromUSD = getUSDRate(currency);
    const card = document.createElement("div");
    card.className = "currency-card fade-in";
    card.style.animationDelay = `${Math.min(i * 25, 400)}ms`;

    const isReal = currency.realCurrency;
    const usdEquiv = isReal ? (1 / rateFromUSD) : currency.usdRate;
    const displayRate = isReal
      ? `1 ${currency.code} = ${formatNumber(1 / rateFromUSD)} USD`
      : `1 USD ≈ ${formatNumber(1 / (currency.usdRate || 1))} ${currency.code}`;

    card.innerHTML = `
      <div class="card-header">
        <span class="card-flag">${currency.flag}</span>
        <div class="card-codes">
          <span class="card-code">${currency.code}</span>
          <span class="card-badge ${isReal ? "badge-real" : "badge-fake"}">${isReal ? "Real" : "Fictional"}</span>
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

// ── Rotating word in hero ─────────────────────────────────────────────────────
const ROTATING_WORDS = ["Everything", "Galleons", "Bottle Caps", "Simoleons", "Latinum", "Rupees", "Gil", "Septims", "Chaos"];
let wordIdx = 0;
function rotateWord() {
  const el = document.getElementById("rotating-word");
  el.style.opacity = "0";
  el.style.transform = "translateY(8px)";
  setTimeout(() => {
    wordIdx = (wordIdx + 1) % ROTATING_WORDS.length;
    el.textContent = ROTATING_WORDS[wordIdx];
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  }, 300);
}
setInterval(rotateWord, 2500);

// ── Stat counter animation ────────────────────────────────────────────────────
function animateStats() {
  const realCount = CURRENCIES.filter(c => c.realCurrency).length;
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
}

function updateThemeIcon(btn, theme) {
  btn.innerHTML = theme === "dark"
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
}

// ── Kick it off ───────────────────────────────────────────────────────────────
fetchLiveRates();
