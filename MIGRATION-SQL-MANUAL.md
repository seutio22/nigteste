# 🔧 Migration SQL - Remover Constraint Única de Contrato.numero

## 📋 Objetivo

Remover a constraint única do campo `numero` na tabela `Contrato` para permitir múltiplos contratos com o mesmo número, desde que tenham grupos econômicos diferentes.

## 🚀 Como Aplicar

### **Opção 1: Via Script Node.js (Recomendado)**

Execute no Railway ou localmente (com DATABASE_URL configurada):

```bash
cd demandas-api
node execute-migration-sql.js
```

### **Opção 2: Via SQL Direto no Railway**

1. Acesse o Railway Dashboard
2. Vá para o serviço `demandas-api`
3. Clique em "Settings" → "PostgreSQL" ou acesse o banco diretamente
4. Execute o SQL:

```sql
ALTER TABLE "Contrato" DROP CONSTRAINT IF EXISTS "Contrato_numero_key";
```

### **Opção 3: Via Prisma Migrate**

Se você tiver acesso ao banco localmente:

```bash
cd demandas-api
npx prisma migrate deploy
```

Ou execute a migration manualmente:

```bash
cd demandas-api
npx prisma migrate resolve --applied 20260114134415_remove_contrato_numero_unique
```

## ✅ Verificação

Após aplicar a migration, verifique se funcionou:

```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'Contrato' 
AND constraint_name = 'Contrato_numero_key';
```

Se retornar 0 linhas, a constraint foi removida com sucesso!

## 📝 Notas

- A validação de duplicatas agora é feita no código da aplicação (considerando `numero` + `grupoEconomico`)
- Contratos com o mesmo número mas grupos econômicos diferentes são permitidos
- Contratos com o mesmo número e mesmo grupo econômico são bloqueados
