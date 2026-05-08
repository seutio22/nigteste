# Build explícito via Docker para evitar falhas do Railpack no planejamento do build.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Railway está com root_dir = `demandas-api`, então o contexto já é essa pasta.
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN if [ -f package-lock.json ]; then npm ci; else npm install --include=dev; fi

COPY . .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3333

CMD ["node", "scripts/start-production.cjs"]
