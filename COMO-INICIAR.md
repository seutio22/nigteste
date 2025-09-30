# 🚀 COMO INICIAR O SISTEMA DE DEMANDAS

## 📋 **OPÇÃO 1: COMANDOS MANUAIS (RECOMENDADO)**

### **Passo 1: Iniciar Backend**
```powershell
cd demandas-api
npm run dev
```

### **Passo 2: Nova janela - Iniciar Frontend**
```powershell
cd demandas-web
npm run dev:local
```

## 📋 **OPÇÃO 2: SCRIPT AUTOMÁTICO**

### **Para iniciar tudo:**
```powershell
.\start-simples.ps1
```

### **Para parar tudo:**
```powershell
.\stop-tudo.ps1
```

### **Para verificar status:**
```powershell
.\check-status.ps1
```

## 🌐 **URLS DO SISTEMA**

- **Backend (API)**: http://localhost:4000
- **Frontend (Web)**: http://localhost:5173
- **Health Check**: http://localhost:4000/health

## ⚠️ **IMPORTANTE**

1. **Backend deve iniciar primeiro** (porta 4000)
2. **Frontend deve iniciar depois** (porta 5173)
3. **Aguarde alguns segundos** para os serviços inicializarem
4. **Use janelas separadas** do PowerShell para cada serviço

## 🔧 **SOLUÇÃO DE PROBLEMAS**

### **Se a porta 4000 estiver ocupada:**
```powershell
netstat -ano | findstr :4000
taskkill /PID [PID] /F
```

### **Se a porta 5173 estiver ocupada:**
```powershell
netstat -ano | findstr :5173
taskkill /PID [PID] /F
```

### **Se houver erro de dependências:**
```powershell
cd demandas-api
npm install

cd ../demandas-web
npm install
```

## 🎯 **SEQUÊNCIA CORRETA**

1. ✅ Iniciar Backend (aguardar mensagem "API rodando")
2. ✅ Iniciar Frontend (aguardar mensagem "Local: http://localhost:5173")
3. ✅ Abrir navegador em http://localhost:5173
4. ✅ Verificar se os dados aparecem
