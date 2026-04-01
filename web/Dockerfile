# Use when Railway Service → Root Directory = `web` (build context is this folder only).

FROM node:20-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production

# Next.js embeds NEXT_PUBLIC_* at `next build` time. Pass these from Railway Variables
# into the build (Railway forwards service variables as Docker build args when ARG matches).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

# Railway sets PORT at runtime (often 8080). Use sh -c so ${PORT} expands here; relying on
# npm's script shell for ${PORT:-3000} is unreliable in some container runtimes.
CMD ["sh", "-c", "exec ./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
