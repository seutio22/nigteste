# 🚀 Como Forçar Deploy no Railway

## ⚠️ Problema: Railway não está detectando mudanças automaticamente

## ✅ Soluções (Escolha uma):

### **OPÇÃO 1: Forçar Redeploy pelo Dashboard (MAIS FÁCIL)**

1. **Acesse o Dashboard do Railway:**
   - Vá para: https://railway.app
   - Faça login
   - Selecione o projeto `nigteste`

2. **Abra o Serviço:**
   - Clique no serviço `demandas-api` (ou o nome do seu serviço)

3. **Force um Redeploy:**
   - Vá na aba **"Deployments"** ou **"Settings"**
   - Role até o final
   - Clique em **"Redeploy"** ou **"Deploy"**
   - Aguarde o deploy completar

### **OPÇÃO 2: Verificar Integração GitHub**

1. **Verificar se o GitHub está conectado:**
   - Settings → Source
   - Deve estar conectado ao repositório: `seutio22/nigteste`
   - Branch: `main`
   - Se não estiver conectado, clique em **"Connect GitHub"**

2. **Verificar se o Auto-Deploy está ativado:**
   - Settings → Source
   - Deve ter **"Auto Deploy"** ativado
   - Se não estiver, ative e salve

### **OPÇÃO 3: Fazer Commit Vazio para Forçar Deploy**

Execute no terminal (do diretório `demandas-api`):

```powershell
cd C:\Users\Larissa\nigteste\nigteste\demandas-api
git commit --allow-empty -m "trigger: Forçar deploy Railway v2.4.27"
git push
```

Isso cria um commit vazio que força o Railway a detectar mudanças.

### **OPÇÃO 4: Instalar Railway CLI e Fazer Deploy Direto**

1. **Instalar Railway CLI:**
```powershell
npm install -g @railway/cli
```

2. **Fazer Login:**
```powershell
railway login
```

3. **Fazer Deploy:**
```powershell
cd C:\Users\Larissa\nigteste\nigteste\demandas-api
railway link  # Conectar ao projeto (se ainda não estiver)
railway up    # Fazer deploy
```

### **OPÇÃO 5: Verificar Logs do Railway**

1. **Acesse o Dashboard:**
   - Vá para o serviço `demandas-api`
   - Clique na aba **"Logs"**

2. **Verifique se há erros:**
   - Procure por mensagens de erro
   - Verifique se o build está falhando
   - Verifique se há problemas de conexão

## 🔍 Verificações Importantes

### 1. Verificar Root Directory:
- Settings → Root Directory deve ser: `demandas-api`
- Se estiver vazio, configure para `demandas-api`

### 2. Verificar Variáveis de Ambiente:
- Settings → Variables
- Certifique-se de que `DATABASE_URL` está configurada:
  ```
  postgresql://postgres:hQecKMnfKGEXUUHnXBXuFOqNSapcDTAM@trolley.proxy.rlwy.net:54166/railway
  ```

### 3. Verificar Build Settings:
- Settings → Build
- Build Command deve estar vazio (usa railway.toml) OU:
  ```
  rm -rf dist && npx prisma generate && npm run build
  ```

### 4. Verificar Deploy Settings:
- Settings → Deploy
- Start Command: `npm run railway:start`
- Healthcheck Path: `/health`

## 📝 Status Atual

- ✅ Código commitado e enviado para GitHub
- ✅ Versão atualizada para 2.4.27
- ✅ DATABASE_URL corrigida (sem modificações de pool)
- ⚠️ Railway não detectou automaticamente (precisa forçar deploy)

## 🎯 Recomendação

**Use a OPÇÃO 1 (Redeploy pelo Dashboard)** - É a mais rápida e confiável!

