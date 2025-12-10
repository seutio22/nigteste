# 🔗 Como Configurar Integração Git-Vercel

## 📋 O QUE É NECESSÁRIO:

### **1. Token do Vercel (opcional, mas recomendado)**
- Acesse: https://vercel.com/account/tokens
- Clique em "Create Token"
- Copie o token gerado
- **Guarde em local seguro!**

### **2. Informações do Projeto:**
- **Project ID**: `prj_YCSWa1BsHC0v96zzKpf9KYypIVG6`
- **Org ID**: `team_E3rouVsN5DmrJbiNvzq5JIEv`
- **Project Name**: `nigteste`
- **Repository**: `seutio22/nigteste`
- **Branch de Produção**: `main`

---

## 🚀 PASSOS PARA CONFIGURAR:

### **OPÇÃO 1: Pela Interface Web do Vercel (RECOMENDADO)**

1. **Acesse o Dashboard do Vercel:**
   - https://vercel.com/denisons-projects-6adcf8ff/nigteste/settings/git

2. **Conecte o Repositório:**
   - Clique em **"Connect Git Repository"**
   - Selecione **GitHub**
   - Autorize o Vercel a acessar seus repositórios
   - Selecione o repositório: **`seutio22/nigteste`**

3. **Configure as Opções de Build:**
   - **Production Branch**: `main`
   - **Root Directory**: `demandas-web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Salve as Configurações:**
   - Clique em **"Save"**
   - O Vercel fará um deploy automático imediatamente

---

### **OPÇÃO 2: Usando Vercel CLI (Alternativa)**

Se você tiver o token do Vercel, posso tentar configurar via CLI:

```bash
# 1. Autenticar
npx vercel@latest login

# 2. Linkar o projeto
cd demandas-web
npx vercel@latest link --yes --project nigteste --scope denisons-projects-6adcf8ff

# 3. Configurar Git (pode não funcionar via CLI, precisa ser pela web)
```

---

## ✅ O QUE ACONTECE APÓS CONFIGURAR:

1. **Deploy Automático:**
   - Cada push na branch `main` fará deploy automático
   - Não precisa mais fazer deploy manual

2. **Preview Deploys:**
   - Pull Requests terão preview deployments automáticos

3. **Build Logs:**
   - Logs de build disponíveis no dashboard do Vercel

4. **Notificações:**
   - Notificações de deploy no GitHub e email

---

## 🔧 CONFIGURAÇÕES ADICIONAIS:

### **Variáveis de Ambiente:**
Certifique-se de que estas variáveis estão configuradas no Vercel:
- `VITE_API_URL`: `https://nigteste-production.up.railway.app`

**Como configurar:**
1. Acesse: https://vercel.com/denisons-projects-6adcf8ff/nigteste/settings/environment-variables
2. Adicione a variável `VITE_API_URL` com o valor acima
3. Marque para **Production**, **Preview** e **Development**

---

## 🆘 TROUBLESHOOTING:

### **Problema: Deploy não está acontecendo automaticamente**
- Verifique se o repositório está conectado: https://vercel.com/denisons-projects-6adcf8ff/nigteste/settings/git
   - Verifique se a branch `main` está configurada como Production Branch

### **Problema: Build falha**
- Verifique os logs em: https://vercel.com/denisons-projects-6adcf8ff/nigteste
- Verifique se o `Root Directory` está correto: `demandas-web`

### **Problema: Erro de permissões**
- Verifique se o Vercel tem acesso ao repositório GitHub
- Vá em: https://github.com/settings/installations
- Verifique se o Vercel está autorizado

---

## 📝 RESUMO RÁPIDO:

1. ✅ Acesse: https://vercel.com/denisons-projects-6adcf8ff/nigteste/settings/git
2. ✅ Clique em "Connect Git Repository"
3. ✅ Selecione GitHub → `seutio22/nigteste`
4. ✅ Configure:
   - Production Branch: `main`
   - Root Directory: `demandas-web`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. ✅ Salve e aguarde o deploy automático

**Pronto! Agora cada push em `main` fará deploy automático! 🚀**
