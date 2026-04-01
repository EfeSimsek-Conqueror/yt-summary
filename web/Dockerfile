# Use when Railway Service → Root Directory = `web` (build context is this folder only).

FROM node:20-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

# Railway sets PORT at runtime (often 8080). Use sh -c so ${PORT} expands here; relying on
# npm's script shell for ${PORT:-3000} is unreliable in some container runtimes.
CMD ["sh", "-c", "exec ./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
