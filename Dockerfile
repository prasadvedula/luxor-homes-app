FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Root packages — contains Prisma client + schema
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/
RUN npm ci
RUN npx prisma generate

# API packages
COPY api/package.json ./api/package.json
RUN cd api && npm install

# Copy API source (includes public/ assets) and compile TypeScript
COPY api/ ./api/
RUN cd api && npm run build

EXPOSE 4000

CMD ["node", "api/dist/server.js"]
