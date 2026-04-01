# Use when Railway Service → Root Directory = `web` (build context is this folder only).

FROM node:20-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

# PORT comes from Railway at runtime (e.g. 8080). Do not bake a fixed PORT into the image.
CMD ["npm", "run", "start"]
