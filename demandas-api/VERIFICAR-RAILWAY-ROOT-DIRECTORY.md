# 🔧 Verificar Configuração do Root Directory no Railway

## ⚠️ PROBLEMA COMUM

O Railway pode não estar detectando o deploy porque o **Root Directory** não está configurado corretamente no dashboard.

## ✅ SOLUÇÃO: Verificar Root Directory no Dashboard

### Passo a Passo:

1. **Acesse o Dashboard do Railway:**
   - Vá para: https://railway.app
   - Faça login
   - Selecione o projeto `nigteste`

2. **Abra as Configurações do Serviço:**
   - Clique no serviço `demandas-api` (ou o nome do seu serviço)
   - Vá na aba **"Settings"**

3. **Verifique o Root Directory:**
   - Role até a seção **"Root Directory"** ou **"Working Directory"**
   - O valor deve ser: `demandas-api`
   - Se estiver vazio ou com outro valor, altere para: `demandas-api`

4. **Salve as Configurações:**
   - Clique em **"Save"** ou **"Update"**
   - O Railway fará um redeploy automaticamente

5. **Config as code (monorepo):** o ficheiro indicado no painel **não** segue automaticamente o Root Directory. Para a API, defina o caminho absoluto no repositório: **`/demandas-api/railway.toml`**. Assim evita-se aplicar por engano um `railway.toml` de outro serviço (ex. portal na raiz).

## 🔍 Verificações Adicionais

### 1. Verificar se o Railway está conectado ao repositório correto:
   - Settings → Source
   - Deve estar conectado ao repositório: `seutio22/nigteste`
   - Branch: `main`

### 2. Verificar Build Settings:
   - Settings → Build
   - Builder: `Nixpacks` (ou `Dockerfile` se estiver usando)
   - Build Command: Deve estar vazio (usa o do railway.toml) OU `rm -rf dist && npx prisma generate && npm run build`

### 3. Verificar Deploy Settings:
   - Settings → Deploy
   - Start Command: `npm run railway:start`
   - Healthcheck Path: `/health`

### 4. Verificar Variáveis de Ambiente:
   - Settings → Variables
   - Certifique-se de que estas variáveis estão configuradas:
     - `DATABASE_URL`
     - `JWT_SECRET`
     - `NODE_ENV=production`

## 🚀 Forçar Redeploy Manual

Se mesmo após configurar o Root Directory o deploy não funcionar:

1. No dashboard do Railway, vá para o serviço
2. Clique em **"Settings"**
3. Role até o final
4. Clique em **"Redeploy"** ou **"Deploy"**
5. Aguarde o deploy completar

## 📝 Notas Importantes

- O Railway prioriza o `railway.toml` sobre o `railway.json`
- Se ambos existirem, o `railway.toml` será usado
- O Root Directory é **ESSENCIAL** para projetos com estrutura de monorepo
- Sem o Root Directory correto, o Railway tentará fazer build na raiz do repositório

## ✅ Checklist Final

- [ ] Root Directory configurado para `demandas-api`
- [ ] Repositório conectado corretamente
- [ ] Branch `main` selecionada
- [ ] Variáveis de ambiente configuradas
- [ ] Build Command correto (ou vazio para usar railway.toml)
- [ ] Start Command: `npm run railway:start`
- [ ] Healthcheck Path: `/health`

