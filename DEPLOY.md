# Deployment (Railway, Vercel, vb.)

## Ortam değişkenleri (hepsi `web` servisi / Next.js için)

| Değişken | Zorunlu | Nerede |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Evet | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Evet | Aynı (anon / public key) |
| `FAL_KEY` | AI özellikleri için evet | [fal.ai](https://fal.ai/dashboard) → API Keys |

**Asla repoya commit etmeyin:** `.env.local`, gerçek `FAL_KEY` veya `service_role` anahtarı.

- `FAL_KEY` sadece **sunucuda** okunur (`web/src/lib/ai/fal-openai.ts`). `NEXT_PUBLIC_` ile başlatmayın.
- Yerelde: `web/.env.local` içine `FAL_KEY=...` ekleyin, `npm run dev` yeniden başlatın.
- **Railway:** Project → service (`web` kökü) → **Variables** → `FAL_KEY` adıyla yapıştırın → redeploy.
- **iOS uygulaması** FAL kullanmaz; analiz istekleri Next.js API üzerinden gider, anahtar yalnızca deploy ortamında kalır.

## Supabase (üretim URL)

- **Site URL** ve **Redirect URLs** listesine canlı sitenizi ve `https://.../auth/callback` ekleyin.

## Monorepo kökü

Bu repoda kök `package.json` `web/` içinde `npm ci` + build çalıştırır; Railway **Root Directory** boş/kök veya dokümantasyondaki gibi ayarlı olmalı.
