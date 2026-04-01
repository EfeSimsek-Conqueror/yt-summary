# Deployment (Railway, Vercel, vb.)

## Ortam değişkenleri (hepsi `web` servisi / Next.js için)

| Değişken | Zorunlu | Nerede |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Evet | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Evet | Aynı (anon / public key) |
| `FAL_KEY` | AI özellikleri için evet | [fal.ai](https://fal.ai/dashboard) → API Keys |
| `SUPADATA_API_KEY` | Transcript (YouTube) için evet | [supadata.ai](https://supadata.ai) — **tam isim** `SUPADATA_API_KEY` ( `NEXT_PUBLIC_` değil). Railway’de **bu Next.js servisinin** Variables sekmesinde olmalı; ekledikten sonra **Redeploy**. Doğrulama: canlı sitede `GET /api/health/env` → `{"supadataConfigured":true}` olmalı. |
| `NEXT_PUBLIC_APP_URL` | Önerilir (OAuth + metadata) | Railway’de servisin public URL’si, örn. `https://yt-summary-production-xxxx.up.railway.app` — custom domain yokken bunu kullanın; Supabase **Site URL** ve redirect listesi ile aynı olmalı. DNS çalışmayan `vidsum.ai` burada ve Supabase’te tanımlıysa giriş hata verir; geçici olarak Railway URL’sine çevirin. |

**Asla repoya commit etmeyin:** `.env.local`, gerçek `FAL_KEY` veya `service_role` anahtarı.

- `FAL_KEY` sadece **sunucuda** okunur (`web/src/lib/ai/fal-openai.ts`). `NEXT_PUBLIC_` ile başlatmayın.
- Yerelde: `web/.env.local` içine `FAL_KEY=...` ekleyin, `npm run dev` yeniden başlatın.
- **Railway:** Project → service (`web` kökü) → **Variables** → `FAL_KEY` adıyla yapıştırın → redeploy.
- **iOS uygulaması** FAL kullanmaz; analiz istekleri Next.js API üzerinden gider, anahtar yalnızca deploy ortamında kalır.

## Supabase (üretim URL)

- **Site URL** ve **Redirect URLs** listesine, uygulamanın gerçekten açıldığı adresi yazın (`NEXT_PUBLIC_APP_URL` ile aynı). Callback path: **`/oauth/return`** (örn. `https://xxxxx.up.railway.app/oauth/return`). Eski `/auth/callback` uygulama içinde `/oauth/return`’e yönlendirilir. Custom domain gelince `https://vidsum.ai/oauth/return` ekleyin. Ana sayfaya düşen `/?code=…` middleware ile `/oauth/return`’e alınır.

## Monorepo kökü

Bu repoda kök `package.json` `web/` içinde `npm ci` + build çalıştırır; Railway **Root Directory** boş/kök veya dokümantasyondaki gibi ayarlı olmalı.
