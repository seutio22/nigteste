# 🚀 DESENVOLVIMENTO LOCAL - Projeto Demandas

## 📋 **PRÉ-REQUISITOS**

- ✅ Node.js 18+ instalado
- ✅ npm ou yarn instalado
- ✅ PowerShell (Windows) ou Terminal (Linux/Mac)

## 🚀 **INÍCIO RÁPIDO (RECOMENDADO)**

### **Opção 1: Script Automático (Windows)**
```powershell
# Execute na raiz do projeto
.\start-local.ps1
```

### **Opção 2: Manual (Todos os Sistemas)**
```bash
# 1. Backend
cd demandas-api
npm install
npm run dev:local

# 2. Frontend (nova janela)
cd demandas-web
npm install
npm run dev
```

## 🔧 **CONFIGURAÇÕES LOCAIS CRIADAS**

### **Backend (demandas-api/)**
- `config.local.js` - Configurações de desenvolvimento
- `server.local.ts` - Servidor adaptado para local
- `schema.local.prisma` - Schema SQLite para desenvolvimento
- `package.local.json` - Scripts específicos para local

### **Frontend (demandas-web/)**
- `src/lib/api.local.ts` - Configuração de API local

## 🌐 **URLS DE ACESSO**

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3333
- **Health Check**: http://localhost:3333/health

## 🗄️ **BANCO DE DADOS LOCAL**

- **Tipo**: SQLite
- **Arquivo**: `demandas-api/dev.db`
- **Schema**: Baseado em `schema.local.prisma`

## 📁 **ESTRUTURA DE ARQUIVOS**

```
demandas-api/
├── config.local.js          # Configurações locais
├── server.local.ts          # Servidor local
├── prisma/
│   ├── schema.prisma        # Schema PostgreSQL (produção)
│   └── schema.local.prisma  # Schema SQLite (desenvolvimento)
└── package.local.json       # Scripts locais

demandas-web/
├── src/lib/
│   └── api.local.ts         # API local
└── package.json             # Dependências

start-local.ps1              # Script de inicialização
```

## 🔄 **COMANDOS ÚTEIS**

### **Backend**
```bash
cd demandas-api

# Desenvolvimento
npm run dev:local

# Configurar banco
npm run db:setup

# Resetar banco
npm run db:reset

# Build
npm run build:local
```

### **Frontend**
```bash
cd demandas-web

# Desenvolvimento
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## 🚨 **SOLUÇÃO DE PROBLEMAS**

### **Erro: "Cannot find module"**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### **Erro: "Port already in use"**
```bash
# Verificar portas em uso
netstat -ano | findstr :3333
netstat -ano | findstr :5173

# Matar processo (Windows)
taskkill /PID <PID> /F
```

### **Erro: "Database connection failed"**
```bash
# Resetar banco local
cd demandas-api
npm run db:reset
```

### **Erro: "CORS policy"**
- ✅ CORS já configurado para `http://localhost:5173`
- ✅ Verificar se backend está rodando na porta 3333

## 🔒 **VARIÁVEIS DE AMBIENTE LOCAIS**

```javascript
// config.local.js
{
  NODE_ENV: 'development',
  PORT: 3333,
  JWT_SECRET: 'dev-secret-key-change-in-production',
  DATABASE_URL: 'file:./dev.db',
  CORS_ORIGIN: 'http://localhost:5173'
}
```

## 📱 **FUNCIONALIDADES DISPONÍVEIS**

- ✅ **Autenticação**: Login/Logout com JWT
- ✅ **CRUD Completo**: Todas as entidades do sistema
- ✅ **API REST**: Endpoints para todas as operações
- ✅ **Interface React**: Todas as páginas funcionais
- ✅ **Banco Local**: SQLite para desenvolvimento

## 🎯 **PRÓXIMOS PASSOS**

1. **Executar o script**: `.\start-local.ps1`
2. **Acessar frontend**: http://localhost:5173
3. **Testar funcionalidades**: Login, CRUD, etc.
4. **Desenvolver**: Modificar código e ver mudanças em tempo real

## 🆘 **SUPORTE**

- **Logs do Backend**: Console do PowerShell do backend
- **Logs do Frontend**: Console do navegador
- **Logs do Vite**: Console do PowerShell do frontend
- **Banco de Dados**: Arquivo `dev.db` em `demandas-api/`

---

## 🎉 **PRONTO PARA DESENVOLVER!**

Execute `.\start-local.ps1` e comece a codificar!
