const HISTORY_KEY = "songReceiptStudioHistory";

const els = {
  artist: document.getElementById("artist"),
  song: document.getElementById("song"),
  listenerNote: document.getElementById("listenerNote"),
  themeSelect: document.getElementById("themeSelect"),
  sizeSelect: document.getElementById("sizeSelect"),
  generateBtn: document.getElementById("generateBtn"),
  demoBtn: document.getElementById("demoBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  resetBtn: document.getElementById("resetBtn"),
  historyToggleBtn: document.getElementById("historyToggleBtn"),
  status: document.getElementById("status"),
  historyBox: document.getElementById("historyBox"),
  historyList: document.getElementById("historyList"),
  accountStatus: document.getElementById("accountStatus"),
  creditPill: document.getElementById("creditPill"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  signInBtn: document.getElementById("signInBtn"),
  signUpBtn: document.getElementById("signUpBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  userPanel: document.getElementById("userPanel"),
  userEmail: document.getElementById("userEmail"),
  cloudReceipts: document.getElementById("cloudReceipts"),
  purchasePlans: document.getElementById("purchasePlans"),
  purchaseToggleBtn: document.getElementById("purchaseToggleBtn"),
  adminTestPanel: document.getElementById("adminTestPanel"),
  testAddCreditsBtn: document.getElementById("testAddCreditsBtn"),
  selectedPlanPanel: document.getElementById("selectedPlanPanel"),
  selectedPlanTitle: document.getElementById("selectedPlanTitle"),
  selectedPlanSubtitle: document.getElementById("selectedPlanSubtitle"),
  confirmPurchaseBtn: document.getElementById("confirmPurchaseBtn"),
  cloudReceiptList: document.getElementById("cloudReceiptList"),
  refreshReceiptsBtn: document.getElementById("refreshReceiptsBtn"),
  receipt: document.getElementById("receipt"),
  receiptSong: document.getElementById("receiptSong"),
  receiptArtist: document.getElementById("receiptArtist"),
  receiptBody: document.getElementById("receiptBody"),
  captureArea: document.getElementById("captureArea"),
  savePanel: document.getElementById("savePanel"),
  saveImage: document.getElementById("saveImage"),
  savePanelText: document.getElementById("savePanelText")
};

const iconSvg = {
  moon: `<path d="M19 14.5A7 7 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5Z"/>`,
  star: `<path d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3Z"/>`,
  heart: `<path d="M20 8.5c0 5-8 10-8 10s-8-5-8-10A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 8 3.5Z"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`,
  cloud: `<path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.2 9.2 4.5 4.5 0 0 0 7 18Z"/>`,
  eye: `<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>`,
  wave: `<path d="M3 13c3-5 6 5 9 0s6 5 9 0"/>`,
  drop: `<path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z"/>`,
  wind: `<path d="M4 9h10a3 3 0 1 0-3-3M3 14h14a3 3 0 1 1-3 3M5 19h6"/>`,
  mountain: `<path d="m3 19 7-12 4 7 2-3 5 8H3Z"/>`,
  clock: `<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>`,
  ghost: `<path d="M5 20V9a7 7 0 0 1 14 0v11l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 10h.01M15 10h.01"/>`,
  music: `<path d="M9 18V5l10-2v13"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>`,
  circle: `<circle cx="12" cy="12" r="8"/>`
};

const demoData = {
  soul: "這首歌像把一件舊毛衣摺好，放回一個不會再打開的抽屜。聲音很輕，卻一直在房間角落留下灰塵般的回音。",
  tagline: "痛被說得很輕",
  emotions: [
    { icon: "moon", name: "凌晨三點清醒時的懷念", label: "懷念", value: 88 },
    { icon: "drop", name: "忍住沒說出口的眼淚", label: "悲傷", value: 76 },
    { icon: "clock", name: "時間慢慢退色的溫柔", label: "逝去", value: 69 },
    { icon: "ghost", name: "還留在房間裡的幻影", label: "殘影", value: 61 }
  ],
  colors: [
    { hex: "#8BA89C", name: "潛水艇窗外的深海藍" },
    { hex: "#D7BFA6", name: "老照片邊緣的奶茶光" },
    { hex: "#4B4A44", name: "雨後柏油路的灰黑" }
  ],
  melody: {
    contour: [18, 22, 30, 38, 44, 52, 70, 86, 78, 64, 58, 72, 88, 84, 66, 48, 42, 35, 28, 24],
    sections: ["前奏", "主歌A", "副歌", "主歌B", "橋段", "尾奏"],
    label: "像潮水，退了還是會再回來"
  },
  objects: [
    { name: "抽屜裡的舊毛衣", meaning: "保存著不想承認的餘溫" },
    { name: "窗邊未乾的雨痕", meaning: "情緒留下來，比人走得更慢" },
    { name: "沒有寄出的明信片", meaning: "想念停在開口以前" }
  ],
  items: [
    { name: "舊日回音", intensity: 88 },
    { name: "未說出口", intensity: 76 },
    { name: "褪色溫柔", intensity: 69 }
  ],
  closing: "適合在快睡著以前聽，讓心裡那盞小燈自己慢慢暗下來。",
  vibe: "餘溫還沒散"
};

let currentDepth = "standard";
let currentData = demoData;
let supabaseClient = null;
let currentSession = null;
let currentCredits = null;
let currentIsAdmin = false;
let selectedPlanId = null;

function setStatus(message, type = "") {
  els.status.textContent = message;
  els.status.classList.toggle("error", type === "error");
  els.status.classList.toggle("ok", type === "ok");
}

function sanitizeText(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function escapeHtml(value) {
  return sanitizeText(value, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clampNumber(value, min = 0, max = 100) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.round(Math.max(min, Math.min(max, n)));
}

function intensityToQty(intensity) {
  const value = clampNumber(intensity, 0, 100);

  if (value >= 75) return 3;
  if (value >= 45) return 2;
  return 1;
}

function normalizeHex(hex, fallback = "#8BA89C") {
  const text = sanitizeText(hex, fallback);
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

function normalizeData(data) {
  const safe = data && typeof data === "object" ? data : {};
  const melody = safe.melody && typeof safe.melody === "object" ? safe.melody : {};

  return {
    soul: sanitizeText(safe.soul, demoData.soul),
    tagline: sanitizeText(safe.tagline, demoData.tagline).slice(0, 18),
    emotions: (Array.isArray(safe.emotions) && safe.emotions.length ? safe.emotions : demoData.emotions).slice(0, 4).map(item => ({
      icon: iconSvg[item.icon] ? item.icon : "circle",
      name: sanitizeText(item.name, "說不出口的情緒"),
      label: sanitizeText(item.label, "情緒").slice(0, 4),
      value: clampNumber(item.value)
    })),
    colors: (Array.isArray(safe.colors) && safe.colors.length ? safe.colors : demoData.colors).slice(0, 3).map((item, i) => ({
      hex: normalizeHex(item.hex, demoData.colors[i]?.hex || "#8BA89C"),
      name: sanitizeText(item.name, demoData.colors[i]?.name || "未知的色溫")
    })),
    melody: {
      contour: (Array.isArray(melody.contour) && melody.contour.length >= 4 ? melody.contour : demoData.melody.contour).map(n => clampNumber(n)),
      sections: (Array.isArray(melody.sections) && melody.sections.length >= 3 ? melody.sections : demoData.melody.sections).slice(0, 7).map(s => sanitizeText(s)),
      label: sanitizeText(melody.label, demoData.melody.label)
    },
    objects: (Array.isArray(safe.objects) && safe.objects.length ? safe.objects : demoData.objects).slice(0, 3).map(item => ({
      name: sanitizeText(item.name, "記憶物件"),
      meaning: sanitizeText(item.meaning, "代表一種沒有說出口的心情")
    })),
    items: (Array.isArray(safe.items) && safe.items.length ? safe.items : demoData.items).slice(0, 5).map(item => {
      let intensity = item.intensity;

      // 相容舊版資料：如果歷史紀錄裡還有 price: "88%"，自動轉成數字。
      if (intensity === undefined && typeof item.price === "string") {
        const matched = item.price.match(/\d+/);
        intensity = matched ? Number(matched[0]) : 50;
      }

      const safeIntensity = clampNumber(intensity, 0, 100);

      return {
        name: sanitizeText(item.name, "情緒商品"),
        qty: intensityToQty(safeIntensity),
        intensity: safeIntensity
      };
    }),
    closing: sanitizeText(safe.closing, demoData.closing),
    vibe: sanitizeText(safe.vibe, demoData.vibe).slice(0, 18)
  };
}

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconSvg[name] || iconSvg.circle}</svg>`;
}

function makeMelodySvg(melody, colors) {
  const values = melody.contour.map(v => clampNumber(v));
  const width = 320;
  const top = 8;
  const bottom = 52;
  const usable = bottom - top;
  const gap = width / Math.max(values.length - 1, 1);
  const points = values.map((value, i) => ({ x: i * gap, y: bottom - (value / 100) * usable }));

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const controlDistance = (next.x - current.x) / 2;
    d += ` C ${(current.x + controlDistance).toFixed(2)} ${current.y.toFixed(2)}, ${(next.x - controlDistance).toFixed(2)} ${next.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }

  const area = `${d} L ${width} ${bottom} L 0 ${bottom} Z`;
  const c = [colors[0]?.hex || "#8BA89C", colors[1]?.hex || "#D7BFA6", colors[2]?.hex || "#4B4A44"];
  const gradientId = `melodyGradient-${Math.random().toString(16).slice(2)}`;
  const sections = melody.sections.slice(0, 7);

  const sectionMarks = sections.map((section, i) => {
    const x = sections.length === 1 ? width / 2 : (i / (sections.length - 1)) * width;
    const anchor = i === 0 ? "start" : i === sections.length - 1 ? "end" : "middle";
    return `<line x1="${x}" y1="56" x2="${x}" y2="60" stroke="currentColor" stroke-width="0.7" opacity="0.55"/><text x="${x}" y="69" text-anchor="${anchor}" font-size="6.8" fill="currentColor" opacity="0.72">${escapeHtml(section)}</text>`;
  }).join("");

  return `
    <svg viewBox="0 0 320 72" width="100%" height="96" role="img" aria-label="旋律輪廓" style="color: var(--ink-2);">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${c[0]}"/>
          <stop offset="50%" stop-color="${c[1]}"/>
          <stop offset="100%" stop-color="${c[2]}"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${gradientId})" opacity="0.18"></path>
      <path d="${d}" fill="none" stroke="url(#${gradientId})" stroke-width="2.8" stroke-linecap="round"></path>
      <line x1="0" y1="56" x2="320" y2="56" stroke="currentColor" stroke-dasharray="2 4" stroke-width="0.7" opacity="0.55"/>
      ${sectionMarks}
    </svg>
  `;
}

function makeBarcode(values) {
  const nums = values.length ? values : demoData.melody.contour;
  return nums.slice(0, 24).map((v, i) => {
    const bw = 1 + (i % 4);
    const bh = 14 + Math.round((clampNumber(v) / 100) * 28);
    const bo = .55 + ((i % 5) * .08);
    return `<span style="--bw:${bw}px;--bh:${bh}px;--bo:${bo}"></span>`;
  }).join("");
}

function renderReceipt(data, meta = {}) {
  const normalized = normalizeData(data);
  currentData = normalized;

  els.receiptSong.textContent = sanitizeText(meta.song || els.song.value, "尚未選擇歌曲");
  els.receiptArtist.textContent = sanitizeText(meta.artist || els.artist.value, "Unknown Artist");

  const emotionHtml = normalized.emotions.map(item => `
    <div class="emotion-item">
      <div class="icon-box">${icon(item.icon)}</div>
      <div>
        <div class="emotion-name">${escapeHtml(item.name)}</div>
        <div class="bar-line">
          <span>${escapeHtml(item.label)}</span>
          <div class="bar"><span style="--w:${item.value}%"></span></div>
          <span>${item.value}%</span>
        </div>
      </div>
    </div>
  `).join("");

  const colorHtml = normalized.colors.map(item => `
    <div class="color-row">
      <span class="chip" style="--c:${item.hex}"></span>
      <span class="color-name">${escapeHtml(item.name)}</span>
      <span>${escapeHtml(item.hex.toUpperCase())}</span>
    </div>
  `).join("");

  const objectHtml = normalized.objects.map((item, i) => `
    <div class="object-item">
      <span class="object-index">0${i + 1}</span>
      <span><b>${escapeHtml(item.name)}</b><br>${escapeHtml(item.meaning)}</span>
    </div>
  `).join("");

  const itemHtml = normalized.items.map(item => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${item.qty}</td>
      <td>${item.intensity}%</td>
    </tr>
  `).join("");

  els.receiptBody.innerHTML = `
    <section class="section">
      <div class="section-label"><span>靈魂解讀</span><span>01</span></div>
      <p class="soul">${escapeHtml(normalized.soul)}</p>
      <p class="tagline">${escapeHtml(normalized.tagline)}</p>
    </section>

    <section class="section">
      <div class="section-label"><span>情緒標籤</span><span>02</span></div>
      <div class="emotion-list">${emotionHtml}</div>
    </section>

    <section class="section">
      <div class="section-label"><span>色彩語言</span><span>03</span></div>
      <div class="palette">${colorHtml}</div>
    </section>

    <section class="section">
      <div class="section-label"><span>旋律輪廓</span><span>04</span></div>
      ${makeMelodySvg(normalized.melody, normalized.colors)}
      <p class="melody-label">${escapeHtml(normalized.melody.label)}</p>
    </section>

    <section class="section">
      <div class="section-label"><span>歌曲具現化</span><span>05</span></div>
      <div class="object-list">${objectHtml}</div>
    </section>

    <section class="section">
      <div class="section-label"><span>心情結帳</span><span>06</span></div>
      <table class="items-table">
        <thead><tr><th>項目</th><th>數量</th><th>強度</th></tr></thead>
        <tbody>${itemHtml}</tbody>
      </table>
      <div class="barcode" aria-hidden="true">${makeBarcode(normalized.melody.contour)}</div>
    </section>

    <section class="section total">
      <div class="total-label">整體氛圍</div>
      <div class="total-vibe">${escapeHtml(normalized.vibe)}</div>
      <p class="closing">${escapeHtml(normalized.closing)}</p>
    </section>
  `;
}

function applyTheme() {
  els.receipt.classList.remove("minimal", "night");
  els.captureArea.classList.remove("theme-thermal", "theme-minimal", "theme-night");
  els.captureArea.classList.add(`theme-${els.themeSelect.value}`);

  if (els.themeSelect.value === "minimal") els.receipt.classList.add("minimal");
  if (els.themeSelect.value === "night") els.receipt.classList.add("night");
}

function applySize() {
  const themeClass = `theme-${els.themeSelect.value}`;
  els.captureArea.className = `capture-shell ${els.sizeSelect.value} ${themeClass}`;
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entry) {
  const history = getHistory();
  const next = [entry, ...history].slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();

  if (!history.length) {
    els.historyList.innerHTML = `<div style="color: var(--muted); font-size: 12px;">尚無紀錄。</div>`;
    return;
  }

  // 「最近生成」只做為本機瀏覽紀錄展示，不提供點擊載入。
  // 可點擊載入的紀錄只保留在登入後的「我的生成紀錄」，且由後端依照目前使用者篩選。
  els.historyList.innerHTML = history.map(item => `
    <div class="history-item history-item-static" aria-disabled="true">
      <strong>${escapeHtml(item.song || "Unknown Song")}</strong>
      <span>${escapeHtml(item.artist || "Unknown Artist")}</span>
    </div>
  `).join("");
}



function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existed = Array.from(document.scripts).some(script => script.src === src);
    if (existed) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`無法載入 ${src}`));
    document.head.appendChild(script);
  });
}

async function loadSupabaseSdk() {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    return window.supabase;
  }

  const cdnList = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "https://unpkg.com/@supabase/supabase-js@2"
  ];

  for (const src of cdnList) {
    try {
      await loadScript(src);

      if (window.supabase && typeof window.supabase.createClient === "function") {
        return window.supabase;
      }
    } catch (error) {
      console.warn(error);
    }
  }

  throw new Error("Supabase SDK 載入失敗。請確認瀏覽器沒有封鎖 jsDelivr / unpkg，或稍後再試。");
}


async function initAuth() {
  try {
    const configResponse = await fetch("/api/config");
    const config = await configResponse.json();

    if (!configResponse.ok || !config.supabaseUrl || !config.supabaseAnonKey) {
      setAuthState(null, null);
      setStatus(config.error || "尚未設定 Supabase 環境變數。", "error");
      return;
    }

    const supabaseSdk = await loadSupabaseSdk();
    supabaseClient = supabaseSdk.createClient(config.supabaseUrl, config.supabaseAnonKey);

    const { data } = await supabaseClient.auth.getSession();
    currentSession = data.session || null;
    await refreshAccount();

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentSession = session || null;
      await refreshAccount();
    });
  } catch (error) {
    console.error(error);
    setStatus(error.message || "會員系統初始化失敗，請檢查 Supabase 設定。", "error");
  }
}

function setAuthState(session, credits) {
  currentSession = session;
  currentCredits = credits;

  if (!session) {
    els.accountStatus.textContent = "尚未登入｜登入後可領免費 3 次";
    els.creditPill.textContent = "0 次";
    els.authForm.hidden = false;
    els.userPanel.hidden = true;
    els.purchasePlans.hidden = true;
    els.adminTestPanel.hidden = true;
    els.selectedPlanPanel.hidden = true;
    selectedPlanId = null;
    document.querySelectorAll(".plan-card").forEach(card => card.classList.remove("selected"));
    els.cloudReceipts.hidden = true;
    els.userEmail.textContent = "—";
    return;
  }

  const email = session.user && session.user.email ? session.user.email : "已登入";
  els.accountStatus.textContent = "已登入｜每次生成會扣 1 次";
  els.creditPill.textContent = `${credits ?? 0} 次`;
  els.authForm.hidden = true;
  els.userPanel.hidden = false;
  els.purchasePlans.hidden = false;
  els.adminTestPanel.hidden = !currentIsAdmin;
  els.cloudReceipts.hidden = false;
  els.userEmail.textContent = email;
}

async function refreshAccount() {
  if (!currentSession) {
    setAuthState(null, null);
    return;
  }

  try {
    const response = await fetch("/api/me", {
      headers: {
        "Authorization": `Bearer ${currentSession.access_token}`
      }
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result && result.error ? result.error : "讀取會員資料失敗。");
    }

    currentIsAdmin = Boolean(result.isAdmin);
    setAuthState(currentSession, result.remainingCredits);
    await refreshCloudReceipts();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "讀取會員資料失敗。", "error");
  }
}





async function testAddCredits() {
  if (!currentSession) {
    setStatus("請先登入。", "error");
    return;
  }

  if (!currentIsAdmin) {
    setStatus("這個測試加點功能僅限管理員使用。", "error");
    return;
  }

  els.testAddCreditsBtn.disabled = true;
  setStatus("測試加點中…");

  try {
    const response = await fetch("/api/add-test-credits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({
        amount: 10
      })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result && result.error ? result.error : "測試加點失敗。");
    }

    setAuthState(currentSession, result.remainingCredits);
    setStatus(`已測試增加 10 次，目前剩餘 ${result.remainingCredits} 次。`, "ok");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "測試加點失敗。", "error");
  } finally {
    els.testAddCreditsBtn.disabled = false;
  }
}


function togglePurchasePlans() {
  const isCollapsed = els.purchasePlans.classList.toggle("collapsed");
  els.purchaseToggleBtn.setAttribute("aria-expanded", String(!isCollapsed));
}

const CREDIT_PLANS = {
  starter: { credits: 10, price: 49, label: "小包" },
  standard: { credits: 30, price: 129, label: "中包" },
  pro: { credits: 100, price: 299, label: "大包" }
};

function handlePlanClick(event) {
  const button = event.currentTarget;
  const planId = button.dataset.plan;
  const plan = CREDIT_PLANS[planId];

  if (!plan) return;

  selectedPlanId = planId;

  document.querySelectorAll(".plan-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.plan === planId);
  });

  els.selectedPlanPanel.hidden = false;
  els.selectedPlanTitle.textContent = `${plan.label}｜${plan.credits} 次｜NT$${plan.price}`;
  els.selectedPlanSubtitle.textContent = "確認後才會建立購買訂單，不會因為單純點選方案就產生訂單。";
  els.confirmPurchaseBtn.textContent = `加 ${plan.credits} 次`;
  setStatus(`已選擇 ${plan.label}，請按「加 ${plan.credits} 次」確認。`, "ok");
}

async function confirmPurchaseOrder() {
  if (!selectedPlanId) {
    setStatus("請先選擇一個生成次數方案。", "error");
    return;
  }

  const plan = CREDIT_PLANS[selectedPlanId];

  if (!currentSession) {
    setStatus("請先登入，再購買生成次數。", "error");
    return;
  }

  els.confirmPurchaseBtn.disabled = true;
  setStatus("正在建立付款訂單…");

  try {
    const response = await fetch("/api/create-purchase-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({ planId: selectedPlanId })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result && result.error ? result.error : "建立訂單失敗。");
    }

    setStatus(`已建立訂單 #${result.order.id}：${plan.label} ${plan.credits} 次 / NT$${plan.price}。下一步接金流後，會導向付款頁。`, "ok");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "建立訂單失敗。", "error");
  } finally {
    els.confirmPurchaseBtn.disabled = false;
  }
}


function formatReceiptDate(value) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("zh-Hant", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function refreshCloudReceipts() {
  if (!currentSession) {
    els.cloudReceiptList.innerHTML = `<div class="cloud-empty">登入後會顯示你的生成紀錄。</div>`;
    return;
  }

  els.cloudReceiptList.innerHTML = `<div class="cloud-empty">讀取生成紀錄中…</div>`;

  try {
    const response = await fetch("/api/receipts", {
      headers: {
        "Authorization": `Bearer ${currentSession.access_token}`
      }
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result && result.error ? result.error : "讀取生成紀錄失敗。");
    }

    const receipts = Array.isArray(result.receipts) ? result.receipts : [];

    if (!receipts.length) {
      els.cloudReceiptList.innerHTML = `<div class="cloud-empty">尚無生成紀錄。</div>`;
      return;
    }

    els.cloudReceiptList.innerHTML = receipts.map((item, index) => `
      <button class="cloud-receipt-item" data-index="${index}">
        <strong>${escapeHtml(item.song || "Unknown Song")}</strong>
        <span>${escapeHtml(item.artist || "Unknown Artist")}</span>
        <span class="cloud-receipt-date">${escapeHtml(formatReceiptDate(item.created_at))}</span>
      </button>
    `).join("");

    els.cloudReceiptList.querySelectorAll(".cloud-receipt-item").forEach(button => {
      button.addEventListener("click", () => {
        const item = receipts[Number(button.dataset.index)];
        if (!item) return;

        els.artist.value = item.artist || "";
        els.song.value = item.song || "";
        renderReceipt(item.result_json, { artist: item.artist, song: item.song });
        setStatus("已載入雲端生成紀錄。", "ok");
      });
    });
  } catch (error) {
    console.error(error);
    els.cloudReceiptList.innerHTML = `<div class="cloud-empty">${escapeHtml(error.message || "讀取生成紀錄失敗。")}</div>`;
  }
}


async function signUp() {
  if (!supabaseClient) {
    await initAuth();
  }

  if (!supabaseClient) {
    setStatus("會員系統尚未初始化。請強制重新整理，或確認 Supabase SDK 沒有被瀏覽器封鎖。", "error");
    return;
  }

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;

  if (!email || !password) {
    setStatus("請輸入 Email 與密碼。", "error");
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("註冊完成。請到信箱點擊驗證連結，驗證後會回到本站，再回來登入即可。", "ok");
}

async function signIn() {
  if (!supabaseClient) {
    await initAuth();
  }

  if (!supabaseClient) {
    setStatus("會員系統尚未初始化。請強制重新整理，或確認 Supabase SDK 沒有被瀏覽器封鎖。", "error");
    return;
  }

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;

  if (!email || !password) {
    setStatus("請輸入 Email 與密碼。", "error");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  currentSession = data.session;
  await refreshAccount();
  setStatus("登入成功。", "ok");
}

async function signOut() {
  if (!supabaseClient) return;

  await supabaseClient.auth.signOut();
  currentSession = null;
  currentIsAdmin = false;
  setAuthState(null, null);
  setStatus("已登出。", "ok");
}


async function generateReceipt() {
  const artist = els.artist.value.trim();
  const song = els.song.value.trim();
  const note = els.listenerNote.value.trim();
  const nl = String.fromCharCode(10);

  if (!currentSession) {
    setStatus("請先登入，才能使用生成次數。", "error");
    return;
  }

  if (!artist || !song) {
    setStatus("請輸入歌手與歌名。", "error");
    return;
  }

  if (currentCredits !== null && currentCredits <= 0) {
    setStatus("你的生成次數已用完。下一步可以接付款系統來購買次數。", "error");
    return;
  }

  setStatus("分析中：正在把歌曲拆成情緒、色彩、物件與收據明細…");
  els.generateBtn.disabled = true;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({
        artist,
        song,
        note,
        depth: currentDepth
      })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const message = result && result.error ? result.error : `後端 API 回應失敗：${response.status}`;
      throw new Error(message);
    }

    if (!result || !result.data) {
      throw new Error("後端沒有回傳可解析內容。請稍後再試。");
    }

    const normalized = normalizeData(result.data);

    renderReceipt(normalized, { artist, song });
    saveHistory({ artist, song, data: normalized, createdAt: new Date().toISOString() });

    if (typeof result.remainingCredits === "number") {
      currentIsAdmin = Boolean(result.isAdmin);
    setAuthState(currentSession, result.remainingCredits);
    await refreshCloudReceipts();
    }

    await refreshCloudReceipts();
    setStatus("完成。已扣除 1 次生成次數。", "ok");
  } catch (error) {
    console.error(error);
    setStatus(`${error.message || "產生失敗，請確認後端 API 或網路狀態。"}${nl}如果剛設定完 Vercel 環境變數，請重新部署一次。`, "error");
  } finally {
    els.generateBtn.disabled = false;
  }
}

function dataUrlToFile(dataUrl, filename) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

async function downloadPng() {
  if (!window.htmlToImage) {
    setStatus("圖片輸出套件尚未載入完成，請確認網路後重新整理。", "error");
    return;
  }

  setStatus("正在輸出 PNG…");
  els.savePanel.classList.remove("show");

  try {
    const node = els.captureArea;
    const dataUrl = await window.htmlToImage.toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: els.sizeSelect.value === "receiptOnly" ? null : "#0d0d0d"
    });

    const filename = `song-receipt-${Date.now()}.png`;
    const file = dataUrlToFile(dataUrl, filename);

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Song Receipt" });
      setStatus("已開啟分享選單。", "ok");
      return;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      els.saveImage.src = dataUrl;
      els.savePanelText.textContent = "圖片已產生。請長按圖片，選擇「儲存到照片」或「加入照片」。";
      els.savePanel.classList.add("show");
      els.savePanel.scrollIntoView({ behavior: "smooth", block: "center" });
      setStatus("圖片已顯示在下方。", "ok");
      return;
    }

    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus("PNG 已下載。", "ok");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "圖片產生失敗，請換 Chrome 或 Safari 再試。", "error");
  }
}

function loadDemo() {
  els.artist.value = "Taylor Swift";
  els.song.value = "cardigan";
  els.listenerNote.value = "偏文青、像獨立唱片行的情緒小票";
  renderReceipt(demoData, { artist: els.artist.value, song: els.song.value });
  setStatus("已載入範例。可以切換風格與尺寸測試。", "ok");
}

function resetApp() {
  els.artist.value = "";
  els.song.value = "";
  els.listenerNote.value = "";
  els.savePanel.classList.remove("show");
  renderReceipt(demoData, { artist: "Demo Artist", song: "Demo Song" });
  setStatus("已清空輸入，保留範例預覽。", "ok");
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentDepth = tab.dataset.depth;
  });
});

els.generateBtn.addEventListener("click", generateReceipt);
els.demoBtn.addEventListener("click", loadDemo);
els.downloadBtn.addEventListener("click", downloadPng);
els.resetBtn.addEventListener("click", resetApp);
els.signInBtn.addEventListener("click", signIn);
els.signUpBtn.addEventListener("click", signUp);
els.signOutBtn.addEventListener("click", signOut);
els.refreshReceiptsBtn.addEventListener("click", refreshCloudReceipts);
els.purchaseToggleBtn.addEventListener("click", togglePurchasePlans);
els.testAddCreditsBtn.addEventListener("click", testAddCredits);
document.querySelectorAll(".plan-card").forEach(button => {
  button.addEventListener("click", handlePlanClick);
});
els.confirmPurchaseBtn.addEventListener("click", confirmPurchaseOrder);
els.historyToggleBtn.addEventListener("click", () => {
  els.historyBox.classList.toggle("show");
  renderHistory();
});

els.themeSelect.addEventListener("change", () => {
  applyTheme();
  applySize();
});

els.sizeSelect.addEventListener("change", applySize);

renderReceipt(demoData, { artist: "Demo Artist", song: "Demo Song" });
