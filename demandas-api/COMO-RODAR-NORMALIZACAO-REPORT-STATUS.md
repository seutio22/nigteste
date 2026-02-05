# Como rodar a correção de status antigos (Report / Analytics)

Os status da tabela **Report** são corrigidos para o **padrão do Cadastro**:
**Pendente** | **Em andamento** | **Transf. Analista** | **Concluída** | **Entregue** | **Cancelada**

---

## Opção 1: Script Node (Prisma) – recomendado

Requer `DATABASE_URL` no `.env` (ou variáveis de ambiente) e Prisma configurado.

**Na pasta `demandas-api`:**

```bash
cd demandas-api
node normalize-report-status.js
```

**No Railway** (no diretório do projeto da API):

```bash
railway run node normalize-report-status.js
```

O script:
- Lista os status atuais no banco
- Mostra quantos registros serão alterados e de qual valor para qual
- Atualiza cada registro e exibe o resumo ao final

---

## Opção 2: SQL direto no banco

Use quando preferir executar no cliente SQL (Railway Query, pgAdmin, `psql`).

1. Abra o arquivo **`normalize-report-status.sql`**.
2. Copie todo o conteúdo.
3. Cole e execute no banco da aplicação (mesmo schema onde está a tabela `Report`).

**Conferir depois (opcional):**

```sql
SELECT status, COUNT(*) FROM "Report" GROUP BY status ORDER BY status;
```

---

## Segurança

- Faça **backup** ou confirme que pode reverter antes de rodar em produção.
- Em ambiente de produção, teste antes em cópia do banco ou em staging.
