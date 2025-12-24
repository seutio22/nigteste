# 🔧 Solução: Deploy via CLI com Root Directory

## ❌ Problema

Quando fazemos deploy via CLI a partir do diretório `demandas-api`:
- O Railway faz upload apenas desse diretório
- O dashboard está configurado para procurar `demandas-api` dentro do que foi enviado
- Como já estamos dentro de `demandas-api`, ele não encontra

## ✅ Soluções

### **Opção 1: Remover Root Directory Temporariamente (RECOMENDADO para CLI)**

1. **No Dashboard do Railway:**
   - Settings → Source → Root Directory
   - **Remova** o valor `demandas-api` (deixe vazio)
   - **Salve**

2. **Faça o Deploy via CLI:**
   ```powershell
   cd C:\Users\Larissa\nigteste\nigteste\demandas-api
   npx @railway/cli up
   ```

3. **Depois, recolocar o Root Directory:**
   - Settings → Source → Root Directory
   - Configure novamente: `demandas-api`
   - **Salve** (para futuros deploys via Git)

### **Opção 2: Usar Apenas Git Push (RECOMENDADO)**

O deploy via Git push respeita o Root Directory configurado no dashboard:

```powershell
cd C:\Users\Larissa\nigteste\nigteste\demandas-api
git commit --allow-empty -m "trigger: Deploy"
git push
```

### **Opção 3: Fazer Deploy a Partir da Raiz**

1. **Linkar serviço a partir da raiz:**
   ```powershell
   cd C:\Users\Larissa\nigteste\nigteste
   npx @railway/cli service link nigteste
   ```

2. **Fazer deploy:**
   ```powershell
   npx @railway/cli up --service nigteste
   ```

## 📝 Nota Importante

- **Deploy via CLI**: Ignora o Root Directory do dashboard
- **Deploy via Git**: Respeita o Root Directory do dashboard

Para manter o Root Directory configurado, use sempre **Git push** para fazer deploy.

