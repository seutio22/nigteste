# Normalizar Status de Manutenção

Este script normaliza todos os status de "CONCLUIDO" (e variações) para o padrão do sistema: **"Concluída"**.

## Variações que serão normalizadas:

- `CONCLUIDO` (todo maiúsculo)
- `Concluido` (sem acento)
- `concluido` (todo minúsculo)
- `CONCLUIDA` (todo maiúsculo, feminino)
- `Concluida` (sem acento, feminino)
- `concluida` (todo minúsculo, feminino)
- `CONCLUÍDO` (todo maiúsculo, com acento)
- `Concluído` (com acento, masculino)
- `concluído` (todo minúsculo, com acento)
- `CONCLUÍDA` (todo maiúsculo, com acento, feminino)
- `concluída` (todo minúsculo, com acento, feminino)

**Todas serão normalizadas para:** `Concluída`

## Como executar:

### Opção 1: Via Railway CLI (Recomendado - Produção)

```bash
npx @railway/cli run --service nigteste node normalize-manutencao-concluida.js
```

### Opção 2: Localmente (se tiver DATABASE_URL configurada)

```bash
cd demandas-api
node normalize-manutencao-concluida.js
```

## O que o script faz:

1. **Lista todos os status** encontrados na tabela `Manutencao`
2. **Identifica variações** de "concluido" que precisam ser normalizadas
3. **Normaliza cada variação** para "Concluída"
4. **Exibe relatório final** com quantos registros foram atualizados

## Exemplo de saída:

```
🔍 Normalizando status de Manutenções...

📊 Status encontrados na tabela Manutencao:

  "CONCLUIDO": 15 registro(s)
  "Concluida": 3 registro(s)
  "Concluída": 120 registro(s)
  "Em Andamento": 45 registro(s)
  "Pendente": 30 registro(s)

🔍 Verificando variações de "concluido" que precisam ser normalizadas...

  "CONCLUIDO": 15 registro(s)
  "Concluida": 3 registro(s)

  "Concluída" (padrão correto): 120 registro(s)

  Total a normalizar: 18 registro(s)

✨ Normalizando 15 registro(s) de "CONCLUIDO" para "Concluída"...
✅ 15 registro(s) normalizado(s)!

✨ Normalizando 3 registro(s) de "Concluida" para "Concluída"...
✅ 3 registro(s) normalizado(s)!

📊 Verificando resultado final...

📊 Resultado final:
  "Concluída" (padrão correto): 138 registro(s)

  ✅ Todos os registros foram normalizados para "Concluída"!
  📈 Total de registros normalizados: 18
  📈 Total de registros com status "Concluída": 138

✅ Processo concluído!
```

## Importante:

- ⚠️ Este script **modifica dados no banco de dados**
- ✅ O script é **seguro** e só altera o campo `status`
- ✅ O campo `updatedAt` é atualizado automaticamente
- ✅ O script pode ser executado **múltiplas vezes** sem problemas (idempotente)

