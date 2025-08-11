# 🚀 PROJETO DEMANDAS - Guia de Deploy

Sistema de gestão de demandas empresariais com frontend React e backend Fastify.

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no [Vercel](https://vercel.com) (frontend)
- Conta no [Railway](https://railway.app) (backend)
- Banco PostgreSQL (Railway ou externo)

## 🚀 Deploy do Backend (Railway)

### 1. Preparar o Projeto
```bash
cd demandas-api
npm install
npm run build
```

### 2. Deploy no Railway
1. Acesse [railway.app](https://railway.app)
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Selecione este repositório
6. Configure as variáveis de ambiente:
   - `DATABASE_URL`: URL do PostgreSQL
   - `JWT_SECRET`: Chave secreta para JWT
   - `NODE_ENV`: production

### 3. Banco de Dados
1. No Railway, vá em "New" → "Database" → "PostgreSQL"
2. Copie a URL de conexão
3. Cole na variável `DATABASE_URL`
4. Execute as migrações:
   ```bash
   npm run db:migrate
   ```

## 🌐 Deploy do Frontend (Vercel)

### 1. Preparar o Projeto
```bash
cd demandas-web
npm install
```

### 2. Deploy no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Faça login com GitHub
3. Clique em "New Project"
4. Importe este repositório
5. Configure:
   - Framework Preset: Vite
   - Root Directory: demandas-web
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 3. Variáveis de Ambiente
No Vercel, adicione:
- `VITE_API_URL`: URL do seu backend Railway

## 🔧 Configurações Finais

### 1. Atualizar CORS no Backend
No arquivo `demandas-api/src/server.ts`, substitua:
```typescript
origin: ['https://seu-frontend.vercel.app']
```
Pela URL real do seu frontend.

### 2. Testar a Aplicação
1. Acesse o frontend no Vercel
2. Teste o login e funcionalidades
3. Verifique se as chamadas para a API estão funcionando

## 📱 URLs de Acesso

- **Frontend**: https://seu-projeto.vercel.app
- **Backend**: https://seu-projeto.railway.app
- **API Health**: https://seu-projeto.railway.app/health

## 🛠️ Comandos Úteis

### Backend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run start        # Iniciar produção
npm run db:migrate   # Executar migrações
npm run db:push      # Sincronizar schema
```

### Frontend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview da build
```

## 🔒 Segurança

- ✅ JWT com secret único
- ✅ CORS configurado para produção
- ✅ Variáveis de ambiente seguras
- ✅ Banco PostgreSQL em produção

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs no Railway
2. Teste a API localmente
3. Verifique as variáveis de ambiente
4. Confirme se o banco está acessível

