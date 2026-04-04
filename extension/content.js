(function () {
  const ROOT_ID = "vidsum-extension-root";
  const DEFAULT_BASE = "http://localhost:3000";

  function normalizeBaseUrl(raw) {
    let v = String(raw ?? "").trim();
    if (!v) return DEFAULT_BASE;
    if (!/^https?:\/\//i.test(v)) {
      const lower = v.toLowerCase();
      if (
        lower.startsWith("localhost") ||
        lower.startsWith("127.0.0.1") ||
        lower.startsWith("0.0.0.0")
      ) {
        v = `http://${v}`;
      } else {
        v = `https://${v}`;
      }
    }
    return v.replace(/\/$/, "");
  }

  /** @type {ShadowRoot | null} */
  let shadow = null;
  /** @type {HTMLElement | null} */
  let panelEl = null;
  let lastUrl = location.href;
  let videoId = new URLSearchParams(location.search).get("v") || "";

  /** Only show overlay on real watch URLs (SPA-safe: script runs on all youtube.com). */
  function isWatchPage() {
    try {
      if (location.hostname.replace(/^www\./, "") !== "youtube.com") {
        return false;
      }
      if (location.pathname !== "/watch") return false;
      return new URLSearchParams(location.search).has("v");
    } catch {
      return false;
    }
  }

  function removeOverlayHost() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) existing.remove();
    shadow = null;
    panelEl = null;
  }

  function getSettings(cb) {
    chrome.storage.sync.get(
      {
        vidSumBaseUrl: DEFAULT_BASE,
        vidSumAutoAnalyze: false,
        vidSumShowTimestamps: true,
        vidSumLanguage: "en",
        vidSumShowOverlay: true,
        vidSumOverlayLeft: null,
        vidSumOverlayTop: null,
      },
      cb,
    );
  }

  function parseVideoId() {
    return new URLSearchParams(location.search).get("v") || "";
  }

  function getVideoTitle() {
    const meta = document.querySelector('meta[name="title"]');
    if (meta?.content) return meta.content.trim();
    const h = document.querySelector(
      "h1.ytd-watch-metadata yt-formatted-string",
    );
    if (h?.textContent) return h.textContent.trim();
    const t = document.title;
    return t.replace(/\s*-\s*YouTube\s*$/i, "").trim() || "Video";
  }

  function getVideoDurationSec() {
    const v = document.querySelector("video");
    if (v && Number.isFinite(v.duration) && v.duration > 0) {
      return Math.round(v.duration);
    }
    return null;
  }

  function formatMmSs(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildVidSumVideoUrl(base, id) {
    const b = normalizeBaseUrl(base);
    return `${b}/video/${encodeURIComponent(id)}`;
  }

  function css() {
    return `
:root {
  color-scheme: dark;
  --vs-bg: #0b0e14;
  --vs-surface: #151b26;
  --vs-tab-inactive-bg: #1a2332;
  --vs-tab-active: #1d4ed8;
  --vs-line: #334155;
  --vs-text: #f8fafc;
  --vs-muted: #b8c5d6;
  --vs-muted-soft: #94a3b8;
  --vs-accent: #60a5fa;
  --vs-purple: #a855f7;
  --vs-radius: 12px;
  --vs-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
* { box-sizing: border-box; }
.vs-wrap {
  position: fixed;
  z-index: 2147483647;
  width: min(400px, calc(100vw - 24px));
  min-height: 320px;
  max-height: min(580px, calc(100vh - 24px));
  font-family: var(--vs-font);
  color: var(--vs-text);
  border-radius: var(--vs-radius);
  border: 1px solid #3b82f6;
  background-color: var(--vs-bg);
  background-image: none;
  box-shadow: 0 16px 48px #000000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  isolation: isolate;
  opacity: 1;
  mix-blend-mode: normal;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.vs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 10px 10px 14px;
  cursor: grab;
  border-bottom: 1px solid var(--vs-line);
  background-color: #0d1118;
}
.vs-header:active { cursor: grabbing; }
.vs-header-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.vs-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vs-close:hover {
  background: #334155;
  color: #ffffff;
}
button.vs-logo {
  width: 40px;
  height: 40px;
  border: none;
  padding: 0;
  margin: 0;
  border-radius: 10px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  font: inherit;
  overflow: hidden;
}
button.vs-logo:hover {
  filter: brightness(1.08);
}
button.vs-logo:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}
.vs-logo img {
  width: 40px;
  height: 40px;
  display: block;
  object-fit: cover;
  border-radius: 10px;
}
.vs-logo svg { width: 22px; height: 22px; color: #fff; }
.vs-titles h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.vs-titles p {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--vs-muted);
}
.vs-tabs {
  display: flex;
  gap: 4px;
  padding: 0 10px;
  border-bottom: 1px solid var(--vs-line);
  background-color: var(--vs-bg);
}
.vs-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
  background-color: var(--vs-tab-inactive-bg);
  border: none;
  border-bottom: 3px solid var(--vs-tab-inactive-bg);
  cursor: pointer;
  border-radius: 8px 8px 0 0;
}
.vs-tab:hover:not([data-active="true"]) {
  color: #f1f5f9;
  background-color: #243044;
  border-bottom-color: #243044;
}
.vs-tab svg { width: 16px; height: 16px; opacity: 1; color: currentColor; }
.vs-tab[data-active="true"] {
  color: #ffffff;
  border-bottom-color: #60a5fa;
  background-color: var(--vs-tab-active);
}
.vs-body {
  flex: 1;
  min-height: 220px;
  overflow-y: auto;
  padding: 12px 14px 16px;
  user-select: text;
  background-color: var(--vs-bg);
  color: var(--vs-text);
}
.vs-section-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vs-text);
}
.vs-card {
  border: 1px solid var(--vs-line);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  background-color: var(--vs-surface);
}
.vs-card--outline {
  border: 1px solid #3b82f6;
  background-color: #151d2e;
}
.vs-card-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}
.vs-time { font-size: 12px; font-weight: 700; color: var(--vs-accent); }
.vs-dur { font-size: 11px; color: var(--vs-muted-soft); }
.vs-desc { font-size: 12px; line-height: 1.45; color: #e2e8f0; }
.vs-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--vs-muted);
  margin-bottom: 10px;
}
.vs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid #2563eb;
  background: #1d4ed8;
  color: #eff6ff;
  cursor: pointer;
  text-decoration: none;
}
.vs-btn:hover { background: #2563eb; }
.vs-kp-title { font-size: 12px; font-weight: 700; color: #60a5fa; margin: 0 0 8px; }
.vs-kp-title.purple { color: #c4b5fd; }
.vs-kp ul { margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.5; }
.vs-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.vs-stat label { display: block; font-size: 10px; color: var(--vs-muted-soft); text-transform: uppercase; letter-spacing: .04em; }
.vs-stat span { font-size: 13px; font-weight: 700; color: var(--vs-text); }
.vs-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--vs-line);
  border-radius: 10px;
  margin-bottom: 10px;
  background: var(--vs-surface);
}
.vs-setting-row p { margin: 0; font-size: 11px; color: var(--vs-muted); }
.vs-setting-row strong { display: block; font-size: 12px; color: var(--vs-text); margin-bottom: 2px; }
.vs-switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: #334155;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.vs-switch[data-on="true"] { background: var(--vs-accent); }
.vs-switch::after {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  top: 3px;
  left: 3px;
  transition: transform .15s;
}
.vs-switch[data-on="true"]::after { transform: translateX(20px); }
.vs-select {
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--vs-line);
  background: #0b0e14;
  color: var(--vs-text);
  font-size: 13px;
}
.vs-signout {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #b91c1c;
  background: #450a0a;
  color: #fecaca;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.vs-signout:hover { background: #7f1d1d; }
.vs-hidden { display: none !important; }
`;
  }

  function logoMarkHtml() {
    const src = chrome.runtime.getURL("icons/icon48.png");
    return `<img src="${src}" width="40" height="40" alt="" draggable="false" />`;
  }

  function iconCamera() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
  }
  function iconChart() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>';
  }
  function iconGear() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  }

  function demoSegments() {
    return [
      { start: 0, end: 45, label: "Introduction and question setup" },
      { start: 45, end: 90, label: "First round of answers" },
      { start: 90, end: 135, label: "Contestant responses" },
      { start: 135, end: 172, label: "Final answer and results" },
    ];
  }

  function renderSegments(settings) {
    const showTs = settings.vidSumShowTimestamps !== false;
    const list = demoSegments();
    let cards = "";
    for (const seg of list) {
      const len = seg.end - seg.start;
      cards += `
          <div class="vs-card">
            <div class="vs-card-row">
              <span class="vs-time">${showTs ? `${formatMmSs(seg.start)} – ${formatMmSs(seg.end)}` : "Segment"}</span>
              <span class="vs-dur">${len}s</span>
            </div>
            <div class="vs-desc">${escapeHtml(seg.label)}</div>
          </div>`;
    }

    return `
      <h2 class="vs-section-title">Video Segments</h2>
      <p class="vs-hint">Placeholder layout. Real segments will appear here when analysis is wired in the extension.</p>
      ${cards}
      <button type="button" class="vs-btn" data-action="open-vidsum">Open in VidSum</button>
    `;
  }

  function renderSummary(settings) {
    const dur = getVideoDurationSec();
    const durLabel = dur != null ? formatMmSs(dur) : "—";
    const title = getVideoTitle();

    return `
      <h2 class="vs-section-title">Video Summary</h2>
      <div class="vs-card vs-card--outline">
        <p class="vs-kp-title">Key Points</p>
        <ul>
          <li>Use <strong>VidSum</strong> for AI summary, key points, and segments for this title.</li>
          <li>${escapeHtml(title.slice(0, 120))}${title.length > 120 ? "…" : ""}</li>
        </ul>
      </div>
      <div class="vs-card vs-card--outline" style="margin-top:12px">
        <p class="vs-kp-title purple">Statistics</p>
        <div class="vs-stats">
          <div class="vs-stat"><label>Duration</label><span>${durLabel}</span></div>
          <div class="vs-stat"><label>Segments</label><span>—</span></div>
          <div class="vs-stat"><label>Category</label><span>—</span></div>
          <div class="vs-stat"><label>Type</label><span>YouTube</span></div>
        </div>
      </div>
      <button type="button" class="vs-btn" data-action="open-vidsum">Open in VidSum</button>
    `;
  }

  function renderSettings(settings) {
    const langs = [
      { v: "en", t: "English" },
      { v: "tr", t: "Türkçe" },
    ];
    const langOpts = langs
      .map(
        (l) =>
          `<option value="${l.v}" ${settings.vidSumLanguage === l.v ? "selected" : ""}>${l.t}</option>`,
      )
      .join("");

    return `
      <h2 class="vs-section-title">Extension Settings</h2>
      <div class="vs-setting-row">
        <div>
          <strong>Auto-analyze videos</strong>
          <p>Automatically analyze when video loads (coming soon).</p>
        </div>
        <button type="button" class="vs-switch" data-key="vidSumAutoAnalyze" data-on="${settings.vidSumAutoAnalyze ? "true" : "false"}" aria-label="Toggle auto analyze"></button>
      </div>
      <div class="vs-setting-row">
        <div>
          <strong>Show timestamps</strong>
          <p>Display segment timestamps in overlay.</p>
        </div>
        <button type="button" class="vs-switch" data-key="vidSumShowTimestamps" data-on="${settings.vidSumShowTimestamps !== false ? "true" : "false"}" aria-label="Toggle timestamps"></button>
      </div>
      <div class="vs-setting-row" style="flex-direction:column;align-items:stretch">
        <strong>Analysis Language</strong>
        <select class="vs-select" data-key="vidSumLanguage">${langOpts}</select>
      </div>
      <button type="button" class="vs-btn" data-action="open-vidsum" style="margin-top:4px">Open VidSum (this video)</button>
      <button type="button" class="vs-signout" data-action="signout">Sign Out</button>
      <p class="vs-hint" style="margin-top:10px">To hide this panel, turn off “Show floating panel on YouTube” in the extension toolbar menu. Full sign-out of Google is on the VidSum website.</p>
    `;
  }

  function renderBody(active, settings) {
    if (active === "segments") return renderSegments(settings);
    if (active === "summary") return renderSummary(settings);
    return renderSettings(settings);
  }

  function attachDrag(header, panel) {
    let startX = 0,
      startY = 0,
      origLeft = 0,
      origTop = 0,
      dragging = false;

    header.addEventListener("mousedown", (e) => {
      if (e.target.closest("button, a, input, select")) return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      origLeft = r.left;
      origTop = r.top;
      startX = e.clientX;
      startY = e.clientY;
      panel.style.right = "auto";
      panel.style.left = `${origLeft}px`;
      panel.style.top = `${origTop}px`;
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let left = origLeft + dx;
      let top = origTop + dy;
      const maxL = window.innerWidth - panel.offsetWidth - 8;
      const maxT = window.innerHeight - panel.offsetHeight - 8;
      left = Math.max(8, Math.min(left, maxL));
      top = Math.max(8, Math.min(top, maxT));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    });

    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      const r = panel.getBoundingClientRect();
      chrome.storage.sync.set({
        vidSumOverlayLeft: Math.round(r.left),
        vidSumOverlayTop: Math.round(r.top),
      });
    });
  }

  function wireCloseOverlay(root) {
    const btn = root.querySelector("[data-action=close-overlay]");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      chrome.storage.sync.set({ vidSumShowOverlay: false });
    });
  }

  /** Opens VidSum web app for this video (or dashboard if no id). */
  function wireOpenVidSum(root) {
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-action=open-vidsum]");
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      getSettings((d) => {
        const base = normalizeBaseUrl(d.vidSumBaseUrl || DEFAULT_BASE);
        const id = parseVideoId();
        const url = id ? buildVidSumVideoUrl(base, id) : `${base}/dashboard`;
        chrome.tabs.create({ url });
      });
    });
  }

  function wireTab(root) {
    const tabs = root.querySelectorAll(".vs-tab");
    const body = root.querySelector(".vs-body");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.getAttribute("data-tab");
        tabs.forEach((t) =>
          t.setAttribute("data-active", t === tab ? "true" : "false"),
        );
        getSettings((settings) => {
          if (body) body.innerHTML = renderBody(name, settings);
          wireBody(root, settings, name);
        });
      });
    });
  }

  function wireBody(root, settings, active) {
    root.querySelectorAll(".vs-switch").forEach((sw) => {
      sw.addEventListener("click", () => {
        const key = sw.getAttribute("data-key");
        const on = sw.getAttribute("data-on") === "true";
        const next = !on;
        sw.setAttribute("data-on", next ? "true" : "false");
        if (key) chrome.storage.sync.set({ [key]: next });
      });
    });
    const sel = root.querySelector(".vs-select");
    if (sel) {
      sel.addEventListener("change", () => {
        chrome.storage.sync.set({ vidSumLanguage: sel.value });
      });
    }
    const so = root.querySelector("[data-action=signout]");
    if (so) {
      so.addEventListener("click", () => {
        chrome.storage.sync.set({
          vidSumSignedInHint: false,
          vidSumUserEmail: "",
        });
        chrome.storage.local.remove(["vidSumAccessToken"]);
      });
    }
  }

  function mountOverlay(settings) {
    if (!isWatchPage()) {
      removeOverlayHost();
      return;
    }

    if (!settings.vidSumShowOverlay) {
      removeOverlayHost();
      return;
    }

    videoId = parseVideoId();
    let host = document.getElementById(ROOT_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = ROOT_ID;
      document.documentElement.appendChild(host);
      shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = css();
      shadow.appendChild(style);
    } else {
      shadow = host.shadowRoot;
    }

    const active =
      shadow.querySelector('.vs-tab[data-active="true"]')?.getAttribute("data-tab") ||
      "segments";

    const inner = `
      <div class="vs-wrap">
        <div class="vs-header">
          <div class="vs-header-main">
            <button type="button" class="vs-logo" data-action="open-vidsum" aria-label="Open this video in VidSum" title="Open in VidSum">${logoMarkHtml()}</button>
            <div class="vs-titles">
              <h1>VidSum Extension</h1>
              <p>Current Video Analysis</p>
            </div>
          </div>
          <button type="button" class="vs-close" data-action="close-overlay" aria-label="Close panel" title="Close">×</button>
        </div>
        <div class="vs-tabs">
          <button type="button" class="vs-tab" data-tab="segments" data-active="${active === "segments" ? "true" : "false"}">${iconCamera()}<span>Segments</span></button>
          <button type="button" class="vs-tab" data-tab="summary" data-active="${active === "summary" ? "true" : "false"}">${iconChart()}<span>Summary</span></button>
          <button type="button" class="vs-tab" data-tab="settings" data-active="${active === "settings" ? "true" : "false"}">${iconGear()}<span>Settings</span></button>
        </div>
        <div class="vs-body">${renderBody(active, settings)}</div>
      </div>`;

    shadow.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = css();
    shadow.appendChild(style);
    const wrap = document.createElement("div");
    wrap.innerHTML = inner.trim();
    shadow.appendChild(wrap.firstElementChild);

    panelEl = shadow.querySelector(".vs-wrap");
    const header = shadow.querySelector(".vs-header");
    if (panelEl && header) {
      const left = settings.vidSumOverlayLeft;
      const top = settings.vidSumOverlayTop;
      if (typeof left === "number" && typeof top === "number") {
        panelEl.style.right = "auto";
        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
      } else {
        panelEl.style.top = "16px";
        panelEl.style.right = "16px";
        panelEl.style.left = "auto";
      }
      attachDrag(header, panelEl);
    }
    wireCloseOverlay(shadow);
    wireOpenVidSum(shadow);
    wireTab(shadow);
    wireBody(shadow, settings, active);
  }

  function init() {
    getSettings((s) => mountOverlay(s));
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" && area !== "local") return;
    getSettings((s) => mountOverlay(s));
  });

  /** YouTube is a SPA; poll for URL changes so overlay appears when entering /watch. */
  setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    init();
  }, 500);

  init();
})();
