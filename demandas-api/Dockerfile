# Usar espelho GCR para evitar falha de rede ao Docker Hub (ex.: us-east4)
FROM mirror.gcr.io/library/node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci --only=production

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Railway injeta PORT - usar 0.0.0.0 para aceitar conexões externas
ENV HOST=0.0.0.0
EXPOSE 3333

# Servidor mínimo primeiro para healthcheck passar; depois troque para: node dist/server.js
CMD ["node", "health-server.js"]

