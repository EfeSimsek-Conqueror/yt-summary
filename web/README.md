# VidSum

Next.js app for YouTube subscriptions, search, and AI-powered summaries.

**Production URL:** set `NEXT_PUBLIC_APP_URL` to your live origin (e.g. `https://….up.railway.app` until DNS for `vidsum.ai` works), and add **`…/oauth/return`** to Supabase **Redirect URLs** (same origin as Site URL). Root `/?code=` is forwarded to `/oauth/return` in middleware.

**YouTube Data API (subscriptions, search, uploads):** users need a Google OAuth token with `youtube.readonly`. In **Supabase Dashboard → Authentication**, enable **Manual identity linking** so “Grant YouTube access” (`linkIdentity`) works for users who signed in with email first. Set **GOOGLE_OAUTH_CLIENT_ID** and **GOOGLE_OAUTH_CLIENT_SECRET** (same Web client as Supabase Google provider) so refresh-token exchange works after JWT refresh. Enable **YouTube Data API v3** in Google Cloud and add the `youtube.readonly` scope on the OAuth consent screen.

Bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
