# 🚀 Instruções para Atualizar o Banco de Dados no Railway

## ⚠️ IMPORTANTE

O schema do Prisma foi atualizado para adicionar campos importantes à tabela `Analista`. É necessário aplicar essas mudanças no banco de dados do Railway.

## 📋 Mudanças no Schema

Foi adicionado ao model `Analista`:
- ✅ Campo `email` (String opcional)
- ✅ Campo `telefone` (String opcional)  
- ✅ Campo `cargo` (String opcional)

## 🔧 Como Atualizar o Banco no Railway

### **Opção 1: Via Dashboard do Railway (RECOMENDADO)**

1. **Acesse o Railway**:
   - Vá para: https://railway.app
   - Faça login e selecione o projeto `nigteste`

2. **Abra o Terminal**:
   - Clique no serviço `demandas-api`
   - Vá na aba "Settings"
   - Role até "Environment" e verifique se `DATABASE_URL` está configurado

3. **Execute o Deploy**:
   - O Railway detectará as mudanças automaticamente
   - Aguarde o deploy completar
   - As mudanças no schema serão aplicadas automaticamente

### **Opção 2: Via CLI do Railway (AVANÇADO)**

Se você tem a CLI do Railway instalada:

```bash
# 1. Login no Railway
railway login

# 2. Conecte ao projeto
railway link

# 3. Execute as migrações
railway run npx prisma db push --accept-data-loss
```

### **Opção 3: Forçar Redeploy**

1. Acesse o dashboard do Railway
2. Vá para o serviço `demandas-api`
3. Clique em "Settings"
4. Role até o final e clique em "Redeploy"
5. Aguarde o deploy completar

## ✅ Como Verificar se Funcionou

Após o deploy:

1. **Abra o Console do Navegador** (F12)
2. **Recarregue a página** (Ctrl+R ou F5)
3. **Verifique o erro**:
   - ✅ Se NÃO aparecer mais o erro `The column 'Analista.email' does not exist`, está funcionando!
   - ❌ Se ainda aparecer o erro, aguarde alguns minutos e tente novamente

## 🔍 Monitoramento

Para verificar os logs do Railway:

1. Acesse o dashboard do Railway
2. Clique no serviço `demandas-api`
3. Vá na aba "Logs"
4. Procure por:
   ```
   ✅ Conexão com banco estabelecida
   🚀 Servidor rodando em...
   ```

## ⏱️ Tempo Estimado

- **Deploy automático**: 2-5 minutos
- **Via CLI**: 1-2 minutos
- **Redeploy manual**: 3-7 minutos

## 🆘 Troubleshooting

### **Erro: "Cannot find module '@prisma/client'"**
```bash
# No Railway, execute:
npm install @prisma/client
npx prisma generate
```

### **Erro: "Database connection failed"**
- Verifique se a variável `DATABASE_URL` está configurada no Railway
- Vá em Settings → Variables → DATABASE_URL

### **Erro: "Migration failed"**
- Use a flag `--accept-data-loss` se necessário
- Comando: `npx prisma db push --accept-data-loss`

## 📝 Próximos Passos

Após a atualização bem-sucedida:

1. ✅ Teste o carregamento da página de Usuários
2. ✅ Teste o carregamento de Analistas
3. ✅ Verifique se não há mais erros 500 no console

## 🎉 Sucesso!

Quando tudo estiver funcionando, você verá:
- ✅ Página de Usuários carrega sem erros
- ✅ Dados de Analistas aparecem corretamente
- ✅ Não há erros 500 no console do navegador

---

**Última atualização**: 30/09/2025
**Status**: Schema atualizado e pronto para deploy 🚀
