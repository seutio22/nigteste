# Build explícito via Docker para evitar falhas do Railpack no planejamento do build.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3333

CMD ["node", "scripts/start-production.cjs"]
