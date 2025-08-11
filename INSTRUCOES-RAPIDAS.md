# 🚀 INSTRUÇÕES RÁPIDAS - Deploy Automático

## ⚡ **DEPLOY EM 3 PASSOS SIMPLES:**

### **1️⃣ EXECUTAR SCRIPT PRINCIPAL:**
```bash
./deploy-completo.sh
```
- Escolha opção 1 (Deploy Completo)
- Siga as instruções na tela
- O script fará TUDO automaticamente!

### **2️⃣ CONFIGURAR SECRETS (se necessário):**
```bash
./setup-secrets.sh
```
- Forneça tokens do Railway e Vercel
- Será configurado automaticamente no GitHub

### **3️⃣ DEPLOY RÁPIDO (para futuras atualizações):**
```bash
./quick-deploy.sh
```
- Ou simplesmente: `git push origin main`

---

## 🎯 **OPÇÕES DISPONÍVEIS:**

| Script | Função | Quando Usar |
|--------|--------|-------------|
| `./deploy-completo.sh` | 🚀 **Deploy completo** | **Primeira vez** |
| `./setup-secrets.sh` | 🔑 **Configurar secrets** | Configurar tokens |
| `./setup-railway.sh` | 🔧 **Configurar Railway** | Apenas backend |
| `./setup-vercel.sh` | 🌐 **Configurar Vercel** | Apenas frontend |
| `./quick-deploy.sh` | 📤 **Deploy rápido** | Atualizações |

---

## 🔑 **TOKENS NECESSÁRIOS:**

### **Railway (Backend):**
1. Acesse: https://railway.app/account/tokens
2. Clique em "Create Token"
3. Copie o token

### **Vercel (Frontend):**
1. Acesse: https://vercel.com/account/tokens
2. Clique em "Create"
3. Copie o token

---

## 🚀 **FLUXO AUTOMÁTICO:**

```
Git Push → GitHub Actions → Deploy Automático
    ↓              ↓              ↓
  Frontend    Backend    Banco de Dados
   (Vercel)   (Railway)   (PostgreSQL)
```

---

## 📱 **URLS DE ACESSO:**

- **Frontend**: https://seu-projeto.vercel.app
- **Backend**: https://seu-projeto.railway.app
- **GitHub Actions**: https://github.com/seu-usuario/seu-repo/actions

---

## ⚠️ **IMPORTANTE:**

1. **Execute sempre na raiz do projeto**
2. **Tenha o repositório no GitHub**
3. **Configure os tokens primeiro**
4. **Use o script principal para primeira vez**

---

## 🆘 **PROBLEMAS COMUNS:**

| Problema | Solução |
|----------|---------|
| "GitHub CLI não instalado" | Execute: `winget install GitHub.cli` |
| "Erro no build" | Verifique se `npm install` foi executado |
| "Token inválido" | Gere novo token na plataforma |
| "Deploy falhou" | Verifique logs no GitHub Actions |

---

## 📞 **SUPORTE:**

- **README.md**: Instruções detalhadas
- **GitHub Actions**: Logs de deploy
- **Railway**: Logs do backend
- **Vercel**: Logs do frontend

---

## 🎉 **PRONTO PARA USAR!**

Execute `./deploy-completo.sh` e siga as instruções na tela!

