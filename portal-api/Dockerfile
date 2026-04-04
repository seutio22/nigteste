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

# Railway/Node às vezes definem produção no build e omitem devDependencies (typescript, etc.).
ENV NPM_CONFIG_PRODUCTION=false

# npm install (não npm ci): se o lock no Git atrasar face ao package.json, o ci falha; o install reconcilia.
# Mantenha package-lock.json atualizado com `npm install` na pasta portal-api e commit.
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate && npm run build

ENV NODE_ENV=production

EXPOSE 4001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
