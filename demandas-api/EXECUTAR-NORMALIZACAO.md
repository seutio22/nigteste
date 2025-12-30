# Como Executar a Normalização de Status de Manutenção

Existem 3 formas de executar a normalização:

## Opção 1: Via Script Node.js (Recomendado)

O script `normalize-manutencao-concluida.js` já está pronto. Você só precisa configurar a `DATABASE_URL`:

### No Windows PowerShell:

```powershell
cd demandas-api

# Configurar DATABASE_URL (obtenha no Railway Dashboard > Variables)
$env:DATABASE_URL = "postgresql://usuario:senha@host:porta/banco"

# Executar o script
node normalize-manutencao-concluida.js
```

### Como obter a DATABASE_URL:

1. Acesse: https://railway.app/project
2. Selecione seu projeto
3. Vá em **Variables** (ou **Settings** > **Variables**)
4. Copie o valor de `DATABASE_URL`

## Opção 2: Via SQL Direto (Railway Dashboard)

1. Acesse o Railway Dashboard
2. Vá em seu projeto > **Data** > **PostgreSQL**
3. Clique em **Query** ou **Connect**
4. Copie e cole o conteúdo do arquivo `normalize-manutencao-status.sql`
5. Execute

## Opção 3: Via Script PowerShell (se tiver psql instalado)

```powershell
cd demandas-api
.\normalize-manutencao-status.ps1
```

**Nota:** Requer PostgreSQL client instalado (`psql`)

---

## O que será normalizado:

Todas estas variações:
- `CONCLUIDO`, `Concluido`, `concluido`
- `CONCLUIDA`, `Concluida`, `concluida`
- `CONCLUÍDO`, `Concluído`, `concluído`
- `CONCLUÍDA`, `concluída`

Serão alteradas para: **`Concluída`**

---

## Verificação:

Após executar, você pode verificar no banco:

```sql
SELECT status, COUNT(*) 
FROM "Manutencao" 
WHERE status LIKE '%conclu%' 
GROUP BY status;
```

Todos devem estar como `Concluída`.

