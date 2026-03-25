/** Options page — same session logic as popup; does not open browser tabs. */
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

function hasSupabaseSessionCookie(cookies) {
  return cookies.some((c) => {
    if (!c.name.startsWith("sb-")) return false;
    if (!c.name.includes("auth-token")) return false;
    return Boolean(c.value && String(c.value).length > 10);
  });
}

function base64UrlToBytes(segment) {
  let s = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  return s;
}

function decodeJwtEmail(accessToken) {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const json = atob(base64UrlToBytes(parts[1]));
    const payload = JSON.parse(json);
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

function getAuthTokenRawValue(cookies) {
  const exact = cookies.find((c) => /^sb-.+-auth-token$/.test(c.name));
  if (exact?.value) return exact.value;

  const chunks = cookies.filter((c) => /^sb-.+-auth-token\.\d+$/.test(c.name));
  if (chunks.length === 0) return null;
  chunks.sort(
    (a, b) =>
      parseInt(a.name.replace(/^.*\.(\d+)$/, "$1"), 10) -
      parseInt(b.name.replace(/^.*\.(\d+)$/, "$1"), 10),
  );
  return chunks.map((c) => c.value).join("");
}

function emailFromCookies(cookies) {
  const raw = getAuthTokenRawValue(cookies);
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (parsed.access_token) {
      const em = decodeJwtEmail(parsed.access_token);
      if (em) return em;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function setViews(signedIn, email) {
  const out = document.getElementById("view-out");
  const inn = document.getElementById("view-in");
  const elEmail = document.getElementById("signedEmail");
  if (!out || !inn) return;
  if (signedIn) {
    out.classList.add("hidden");
    inn.classList.remove("hidden");
    if (elEmail) {
      elEmail.textContent = email ? email : "Connected (email not read from token)";
    }
  } else {
    inn.classList.add("hidden");
    out.classList.remove("hidden");
  }
}

function refreshSessionStatus(baseUrl, statusEl) {
  const cookieUrl = baseUrl.includes("://") ? `${baseUrl}/` : `http://${baseUrl}/`;
  chrome.cookies.getAll({ url: cookieUrl }, (cookies) => {
    const err = chrome.runtime.lastError;
    if (err) {
      if (statusEl) statusEl.textContent = err.message;
      setViews(false, null);
      return;
    }
    const ok = hasSupabaseSessionCookie(cookies);
    const email = ok ? emailFromCookies(cookies) : null;
    setViews(ok, email);
    if (statusEl) {
      statusEl.textContent = ok
        ? ""
        : cookies.length === 0
          ? "No VidSum cookies for this URL — check the address or sign in on that site in a normal tab."
          : "No Supabase session cookie found. Sign in on VidSum in a browser tab, then tap Refresh status.";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("baseUrl");
  const btnRefresh = document.getElementById("btnRefresh");
  const status = document.getElementById("status");
  const showOverlay = document.getElementById("showOverlay");

  function getBaseThen(fn) {
    chrome.storage.sync.get({ vidSumBaseUrl: DEFAULT_BASE }, (data) => {
      fn(normalizeBaseUrl(data.vidSumBaseUrl || DEFAULT_BASE));
    });
  }

  chrome.storage.sync.get(
    { vidSumBaseUrl: DEFAULT_BASE, vidSumShowOverlay: true },
    (data) => {
      input.value = normalizeBaseUrl(data.vidSumBaseUrl || DEFAULT_BASE);
      showOverlay.checked = data.vidSumShowOverlay !== false;
      getBaseThen((base) => refreshSessionStatus(base, status));
    },
  );

  showOverlay.addEventListener("change", () => {
    chrome.storage.sync.set({ vidSumShowOverlay: showOverlay.checked });
  });

  function saveBaseUrl() {
    const normalized = normalizeBaseUrl(input.value);
    input.value = normalized;
    chrome.storage.sync.set({ vidSumBaseUrl: normalized }, () => {
      refreshSessionStatus(normalized, status);
    });
  }

  input.addEventListener("change", saveBaseUrl);
  input.addEventListener("blur", () => {
    if (input.value.trim()) saveBaseUrl();
  });

  btnRefresh.addEventListener("click", () => {
    const base = normalizeBaseUrl(input.value);
    input.value = base;
    chrome.storage.sync.set({ vidSumBaseUrl: base });
    refreshSessionStatus(base, status);
  });
});
