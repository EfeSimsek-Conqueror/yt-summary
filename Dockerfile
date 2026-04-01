# Monorepo: Next.js in `web/`. Service → Root Directory: empty (repo root).
# Root package.json is required so Railway's default `npm start` / `npm run start`
# (run from /app) delegates to `web/` — without it the container exits → 502.

FROM node:20-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json web/package-lock.json ./web/
RUN npm ci --prefix web

COPY web ./web

ENV NODE_ENV=production
RUN npm run build --prefix web

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
