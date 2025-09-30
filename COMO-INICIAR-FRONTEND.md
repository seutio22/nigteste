# 🚀 COMO INICIAR O FRONTEND MANUALMENTE

## ❌ PROBLEMA IDENTIFICADO:
O terminal está confuso com os diretórios e não está executando os comandos no local correto.

## ✅ SOLUÇÃO - EXECUTAR MANUALMENTE:

### **1. Abra um NOVO PowerShell**

### **2. Navegue para o diretório correto:**
```powershell
cd C:\Users\Larissa\nigteste\nigteste\demandas-web
```

### **3. Verifique se está no lugar certo:**
```powershell
pwd
```
**Deve mostrar:** `C:\Users\Larissa\nigteste\nigteste\demandas-web`

### **4. Verifique se o package.json existe:**
```powershell
ls package.json
```
**Deve mostrar o arquivo package.json**

### **5. Inicie o frontend:**
```powershell
npm run dev:local
```

### **6. Aguarde a mensagem:**
```
VITE v5.4.19  ready in XXX ms
➜  Local:   http://localhost:5174/
```

## 🎯 RESULTADO ESPERADO:
- Frontend rodando em `http://localhost:5174`
- Console mostrando logs de carregamento
- Colunas da aba "Demandas" mostrando nomes (não IDs vazios)

## 🚨 SE NÃO FUNCIONAR:
Me diga exatamente qual erro aparece!
