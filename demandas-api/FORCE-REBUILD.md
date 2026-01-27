# 🔄 FORÇAR REBUILD NO RAILWAY

## ⚠️ PROBLEMA

O Prisma Client no Railway ainda está usando o schema antigo em cache, mesmo após remover a constraint e o índice do banco.

## ✅ SOLUÇÃO

É necessário forçar um rebuild completo no Railway para regenerar o Prisma Client com o schema atualizado.

### **Opção 1: Redeploy Manual (RECOMENDADO)**

1. Acesse o Railway Dashboard
2. Vá para o serviço `demandas-api`
3. Clique em "Settings"
4. Role até o final e clique em **"Redeploy"**
5. Aguarde o deploy completar

### **Opção 2: Fazer um commit vazio**

Execute no terminal:

```bash
git commit --allow-empty -m "chore: Force Railway rebuild - regenerate Prisma Client"
git push
```

Isso forçará o Railway a fazer um rebuild completo.

### **Opção 3: Limpar cache e rebuild**

No Railway Dashboard:
1. Vá para `demandas-api` → Settings
2. Procure por "Clear Build Cache" ou similar
3. Limpe o cache
4. Faça um redeploy

## 🔍 Verificação

Após o rebuild, o Prisma Client será regenerado com o schema atualizado (sem `@unique` no campo `numero`).

O erro deve desaparecer após o rebuild!
