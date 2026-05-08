# Build explícito via Docker para evitar falhas do Railpack no planejamento do build.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Monorepo: o contexto de build no Railway é o repositório inteiro.
# Copiar manifests e prisma APENAS do `demandas-api/`.
COPY demandas-api/package*.json ./demandas-api/
COPY demandas-api/prisma ./demandas-api/prisma/

WORKDIR /app/demandas-api

RUN if [ -f package-lock.json ]; then npm ci; else npm install --include=dev; fi

COPY demandas-api/ .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3333

CMD ["node", "scripts/start-production.cjs"]
