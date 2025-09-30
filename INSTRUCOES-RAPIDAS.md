# 🚀 INSTRUÇÕES RÁPIDAS - NIGTESTE

## 📁 **ESTRUTURA DE DIRETÓRIOS**
```
nigteste/
└── nigteste/                    ← DIRETÓRIO PRINCIPAL
    ├── demandas-api/            ← BACKEND (API)
    └── demandas-web/            ← FRONTEND
```

## 🔧 **COMANDOS CORRETOS POR DIRETÓRIO**

### **BACKEND (API) - Porta 3333**
```bash
# Navegar para o diretório da API (do diretório principal)
cd demandas-api

# Instalar dependências
npm install

# Executar servidor de desenvolvimento
npm run dev

# Executar seed do banco
npm run seed

# Verificar se está rodando
netstat -an | findstr :3333
```

### **FRONTEND - Porta 5173**
```bash
# Navegar para o diretório do frontend (do diretório principal)
cd demandas-web

# Instalar dependências
npm install

# Executar servidor de desenvolvimento
npm run dev

# Verificar se está rodando
netstat -an | findstr :5173
```

## ⚠️ **ERROS COMUNS E SOLUÇÕES**

### **Erro: "Could not read package.json"**
**Causa:** Executando comando do diretório raiz em vez do diretório correto
**Solução:** Sempre navegar para o diretório específico primeiro

```bash
# ❌ ERRADO (executar do diretório raiz)
cd nigteste
npm run dev

# ✅ CORRETO (executar do diretório da API)
cd nigteste\demandas-api
npm run dev
```

### **Erro: "JWT_SECRET não configurado"**
**Solução:** Copiar arquivo de ambiente
```bash
cd nigteste\demandas-api
copy env.example .env
```

## 🗄️ **BANCO DE DADOS**
```bash
cd nigteste\demandas-api

# Aplicar schema
npx prisma db push

# Executar seed
npm run seed

# Abrir Prisma Studio
npx prisma studio --port 5555
```

## 🌐 **URLS LOCAIS**
- **Backend API:** http://localhost:3333
- **Frontend:** http://localhost:5173
- **Prisma Studio:** http://localhost:5555

## 📋 **CHECKLIST DE INICIALIZAÇÃO**
1. ✅ Navegar para `nigteste\demandas-api`
2. ✅ Executar `npm run dev` (Backend)
3. ✅ Navegar para `nigteste\demandas-web`
4. ✅ Executar `npm run dev` (Frontend)
5. ✅ Verificar portas 3333 e 5173 ativas

## 🔍 **VERIFICAÇÃO RÁPIDA**
```bash
# Verificar todas as portas relevantes
netstat -an | findstr ":3333\|:5173\|:5555"

# Verificar processos Node.js
tasklist | findstr node
```

