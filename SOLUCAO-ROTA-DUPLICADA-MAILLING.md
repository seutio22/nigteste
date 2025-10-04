# Solução: Erro de Rota Duplicada /mailling

## Problema Identificado

O servidor Railway estava falhando ao iniciar com o erro:
```
FastifyError [Error]: Method 'GET' already declared for route '/mailling'
```

## Causa Raiz

A rota `/mailling` estava sendo declarada **duas vezes**:

1. **No sistema CRUD genérico** (`demandas-api/src/server.ts` linha 950):
   ```typescript
   mailling: crud('mailling'), // v3 - endpoint principal - FORÇAR DEPLOY
   ```

2. **No arquivo masterData.ts** (`demandas-api/src/routes/masterData.ts` linha 540):
   ```typescript
   app.get('/mailling', async (request, reply) => {
   ```

## Solução Implementada

### 1. Remoção das Rotas Duplicadas do Sistema CRUD Genérico

**Arquivo:** `demandas-api/src/server.ts`

**Alterações:**
```typescript
// ANTES:
mailling: crud('mailling'), // v3 - endpoint principal - FORÇAR DEPLOY
areasMailling: crud('areaMailling'), // v3 - FORÇAR DEPLOY
cargosMailling: crud('cargoMailling'), // v3 - FORÇAR DEPLOY
filiaisMailling: crud('filialMailling'), // v3 - FORÇAR DEPLOY

// DEPOIS:
// mailling: crud('mailling'), // REMOVIDO - CONFLITO COM masterData.ts
// areasMailling: crud('areaMailling'), // REMOVIDO - CONFLITO COM masterData.ts
// cargosMailling: crud('cargoMailling'), // REMOVIDO - CONFLITO COM masterData.ts
// filiaisMailling: crud('filialMailling'), // REMOVIDO - CONFLITO COM masterData.ts
```

### 2. Remoção do Código Especial para Mailling

**Arquivo:** `demandas-api/src/server.ts`

**Alterações:**
```typescript
// ANTES:
} else if (path === 'mailling') {
  // Tratamento especial para mailling - evitar duplicatas de email
  // ... código especial ...

// DEPOIS:
// } else if (path === 'mailling') {
//   // REMOVIDO - AGORA TRATADO EM masterData.ts
//   // ... código comentado ...
```

## Resultado

### ✅ Problema Resolvido
- **Servidor inicia corretamente** (sem erro FST_ERR_DUPLICATED_ROUTE)
- **Endpoint `/health` funcionando** (status 200)
- **Deploy no Railway bem-sucedido**

### ⚠️ Problema Secundário Identificado
- **Rotas do masterData.ts retornando erro 500**
- **Possível problema com Prisma Client no Railway**
- **Não impede o funcionamento básico do servidor**

## Testes Realizados

### 1. Teste de Inicialização
```bash
✅ Status Code: 200
📄 Response: {"status":"ok"}
🎉 Servidor está funcionando corretamente!
```

### 2. Teste de Rotas
- ✅ `/health` - Funcionando (200)
- ❌ `/mailling` - Erro 500 (problema secundário)
- ❌ `/solicitantes` - Erro 500 (problema secundário)

## Arquivos Modificados

1. **`demandas-api/src/server.ts`**
   - Removidas declarações duplicadas de rotas de mailling
   - Removido código especial para mailling

## Commit Realizado

```bash
commit c1fbb65
fix: Remove rota duplicada /mailling que causava erro FST_ERR_DUPLICATED_ROUTE

- Removido declaração duplicada da rota /mailling do sistema CRUD genérico
- Removido código especial para mailling no sistema CRUD genérico  
- Agora as rotas de mailling são tratadas exclusivamente em masterData.ts
- Isso resolve o erro FastifyError que impedia o servidor de iniciar
```

## Status Final

🎉 **PROBLEMA PRINCIPAL RESOLVIDO**: O servidor Railway agora inicia corretamente sem erros de rota duplicada.

⚠️ **PROBLEMA SECUNDÁRIO**: As rotas do masterData.ts precisam de investigação adicional para resolver os erros 500.

## Próximos Passos Recomendados

1. Investigar problema com Prisma Client no Railway
2. Verificar variáveis de ambiente do banco de dados
3. Regenerar Prisma Client no Railway se necessário
4. Testar rotas específicas do masterData.ts
