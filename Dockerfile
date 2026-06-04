FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# ── Shared: root packages + Prisma ──────────────────────────────────────────
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/
RUN npm ci
RUN npx prisma generate

# ── API: install + build ─────────────────────────────────────────────────────
COPY api/package.json ./api/package.json
RUN cd api && npm install
COPY api/ ./api/
RUN cd api && npm run build

# ── UI: install + build (Next.js standalone) ────────────────────────────────
COPY ui/package.json ./ui/
RUN cd ui && npm install --legacy-peer-deps
COPY ui/ ./ui/
RUN cd ui && NEXT_PUBLIC_API_URL="" npm run build

# ── Runtime image ────────────────────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Express API
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/node_modules ./api/node_modules
COPY --from=builder /app/api/public ./api/public

# Next.js standalone
COPY --from=builder /app/ui/.next/standalone ./ui
COPY --from=builder /app/ui/.next/static ./ui/.next/static
COPY --from=builder /app/ui/public ./ui/public

COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
