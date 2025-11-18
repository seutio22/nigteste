# Migração de Status - Normalização

Este script normaliza os status de demandas no banco de dados, convertendo variações para o padrão "Concluída".

## Status que serão normalizados:

- `CONCLUIDO` → `Concluída`
- `Concluido` → `Concluída`
- `concluido` → `Concluída`
- `Concluído` → `Concluída`
- `concluído` → `Concluída`
- `Concluida` → `Concluída`
- `concluida` → `Concluída`
- `Concluída` → `Concluída` (mantém se já estiver correto)
- `concluída` → `Concluída`
- `Encerrado` → `Concluída`
- `encerrado` → `Concluída`
- `Resolvido` → `Concluída`
- `resolvido` → `Concluída`

## Como executar:

### Opção 1: Via API (Recomendado)

Após fazer o deploy no Railway, faça uma requisição POST:

```bash
curl -X POST https://nigteste-production.up.railway.app/migrate/normalize-status
```

Ou usando um cliente HTTP como Postman/Insomnia:
- **Método**: POST
- **URL**: `https://nigteste-production.up.railway.app/migrate/normalize-status`
- **Headers**: Não é necessário autenticação para esta rota

### Opção 2: Via Script Local

Se tiver acesso ao servidor:

```bash
cd demandas-api
npm run migrate:normalize-status
```

## Resposta esperada:

```json
{
  "success": true,
  "message": "Status normalizados com sucesso",
  "count": 150,
  "normalized": "CONCLUIDO, Concluido, Encerrado, Resolvido -> Concluída"
}
```

## Observações:

- Esta é uma operação **irreversível** - os dados serão atualizados permanentemente
- Recomenda-se fazer backup do banco antes de executar
- A rota `/migrate/normalize-status` pode ser removida após a migração

