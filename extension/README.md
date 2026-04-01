# VidSum Chrome extension

Floating overlay on **YouTube watch** pages (`youtube.com/watch?v=…`): **Segments**, **Summary**, **Settings** — matching the VidSum web app workflow.

## Where are Segments / Summary / Settings?

Those **three tabs are on the floating overlay** on a **YouTube watch** page (`youtube.com/watch?v=…`), top-right — **not** inside the toolbar popup. The toolbar popup is for URL, overlay toggle, and cookie checks while **signed out**. After you are **signed in** (VidSum cookies present), opening the popup **skips that screen** and switches to **YouTube** (prefers an existing `/watch` tab) so you land on the **floating VidSum panel**. The extension still **does not open the VidSum website** from the popup. Change URL / overlay while signed in via **Extension options** (Chrome → Extensions → VidSum → Details).

Enable **“Show floating panel on YouTube”** in the popup, then open a **normal video** (not Shorts). The content script runs on all `youtube.com` pages so the panel still appears when you navigate from Home → Watch inside the SPA. After updating the extension, click **Reload** on `chrome://extensions`.

## Load unpacked (development)

1. Open Chrome → **Extensions** (`chrome://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select this folder: `youtube-summary-fullstack/extension`.
4. Open any YouTube video. The panel appears **top-right** (drag the header to move).

## VidSum URL

- Click the extension icon → set **VidSum site URL**:
  - **Local dev:** `http://localhost:3000` (must be **http**, not `https://localhost`, unless you use HTTPS locally).
  - **Production:** `https://your-domain.com` (no trailing slash).
- **Sign in on VidSum** in a normal browser tab (paste your VidSum URL in the address bar). OAuth runs on the website. The extension only **reads cookies** to show “signed in” in the popup; it does not open tabs for you.

### “I can’t sign in”

1. Wrong URL → fix base URL (especially `http` vs `https` for localhost).
2. Supabase **Redirect URLs** must include `http://localhost:3000/oauth/return` (and your prod callback URL) in the Supabase dashboard.
3. After Google login in a normal VidSum tab, **Refresh status** in the popup or options so the extension sees your `sb-*-auth-token` cookies.
4. After updating the extension, click **Reload** on `chrome://extensions` so new permissions (`cookies`, `https://*/*`) apply.

### Popup shows “not signed in” after logging in on the site

- The **VidSum site URL** in the popup must exactly match where you signed in (same host, `http` vs `https`, and port for localhost).
- You must complete Google OAuth on that origin so Supabase sets `sb-*-auth-token` cookies for that host.

The YouTube overlay does **not** open VidSum URLs; it stays on the video page.

## Permissions

- **storage** — base URL, overlay position, toggles.
- **cookies** — read VidSum session cookies for the configured origin (same browser profile as where you signed in).
- **host_permissions** — `youtube.com`, `localhost` / `127.0.0.1` for the content script on YouTube and local dev.

## Next steps (not in v0.1)

- Call `/api/ai/video-analysis` from the extension with a Supabase session token (same project as web).
- Replace placeholder segment cards with live API data.

## Icons

`icons/` are resized from `web/public/vidsum-logo.png`.
