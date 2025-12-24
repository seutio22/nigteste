# 🔧 SOLUÇÃO: Erro "Could not find root directory: demandas-api"

## ❌ Erro Identificado

O Railway está retornando este erro:
```
"configErrors": [
  "Could not find root directory: demandas-api"
]
```

## ✅ SOLUÇÃO OBRIGATÓRIA

### **Opção 1: Configurar Root Directory no Dashboard (RECOMENDADO)**

1. **Acesse o Dashboard do Railway:**
   - https://railway.app
   - Projeto: `perpetual-imagination`
   - Serviço: `nigteste`

2. **Configure o Root Directory:**
   - Vá em **Settings** → **Source**
   - Procure por **"Root Directory"** ou **"Working Directory"**
   - Configure para: `demandas-api`
   - **Salve as configurações**

3. **Force um Redeploy:**
   - Após salvar, o Railway fará um redeploy automaticamente
   - OU vá em **Deployments** → **Redeploy**

### **Opção 2: Fazer Deploy a Partir do Diretório Correto**

Se você estiver fazendo deploy via CLI, certifique-se de estar no diretório correto:

```powershell
# Navegar para o diretório demandas-api
cd C:\Users\Larissa\nigteste\nigteste\demandas-api

# Fazer deploy
npx @railway/cli up
```

## 🔍 Verificação

Após configurar, verifique se funcionou:

```powershell
npx @railway/cli status --json
```

Procure por:
- `"configErrors": []` (deve estar vazio)
- `"status": "SUCCESS"` ou `"status": "BUILDING"`

## 📝 Nota Importante

O servidor atual está rodando (deploy anterior), mas os novos deploys estão falhando porque o Railway não encontra o diretório `demandas-api`. 

**A configuração do Root Directory no dashboard é ESSENCIAL para projetos com estrutura de monorepo!**

