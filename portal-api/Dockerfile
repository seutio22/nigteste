# Node 22: fast-jwt / find-my-way exigem >=20.
FROM node:22-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Prisma valida DATABASE_URL em `prisma generate` (incl. postinstall do npm). No build do Docker
# o Railway muitas vezes não injeta secrets — URL fictícia só para gerar o client. Em runtime o
# Railway sobrescreve DATABASE_URL com a variável do serviço.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Railway/Node pode definir NODE_ENV=production no build e omitir devDependencies (tsc, etc.).
# Usar --include=dev evita o aviso antigo «npm warn config production» (NPM_CONFIG_PRODUCTION).
RUN npm install --include=dev

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate && npm run build

ENV NODE_ENV=production

EXPOSE 4001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
