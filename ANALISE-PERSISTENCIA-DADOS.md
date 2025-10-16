# 📊 Análise Completa de Persistência de Dados

## ✅ Dados salvos NO BANCO DE DADOS (PostgreSQL Railway)

### 1. **Demandas** (`demandStore.ts`)
- ✅ Criação: `add()` → API POST `/demandas`
- ✅ Atualização: `upsert()` → API PUT `/demandas/:id`
- ✅ Exclusão: `remove()` → API DELETE `/demandas/:id`
- ✅ Sincronização: `syncFromApi()` → API GET `/demandas`
- ✅ Timeline: Persistido no banco via `timelineEvents`

### 2. **Manutenção** (`manutencaoStore.ts`)
- ✅ Criação: `add()` → API POST `/manutencoes`
- ✅ Atualização: `upsert()` → API PUT `/manutencoes/:id`
- ✅ Exclusão: `remove()` → API DELETE `/manutencoes/:id`
- ✅ Sincronização: `syncFromApi()` → API GET `/manutencoes`
- ✅ Timeline: Persistido no banco via `timelineEvents`

### 3. **Atendimento** (`atendimentoStore.ts`)
- ✅ Criação: `add()` → API POST `/atendimentos`
- ✅ Atualização: `upsert()` → API PUT `/atendimentos/:id`
- ✅ Exclusão: `remove()` → API DELETE `/atendimentos/:id`
- ✅ Sincronização: `syncFromApi()` → API GET `/atendimentos`
- ✅ Timeline: Persistido no banco via `timelineEvents`

### 4. **Validação** (`validationStore.ts`)
- ✅ Criação: `add()` → API POST `/validacoes`
- ✅ Atualização: `update()` → API PUT `/validacoes/:id`
- ✅ Exclusão: `delete()` → API DELETE `/validacoes/:id`
- ✅ Sincronização: `syncFromApi()` → API GET `/validacoes`
- ✅ Timeline: Persistido no banco via `timelineEvents`

### 5. **Analytics / Relatórios** (`reportStore.ts`)
- ✅ Criação: `add()` → API POST `/analytics`
- ✅ Atualização: `update()` → API PUT `/analytics/:id`
- ✅ Exclusão: `delete()` → API DELETE `/analytics/:id`
- ✅ Sincronização: `syncFromApi()` → API GET `/analytics`
- ✅ Timeline: Persistido no banco via `timelineEvents`

### 6. **Reajuste** (`reajusteStore.ts`)
- ✅ Criação: `add()` → API POST `/reajusteLancamentos`
- ✅ Atualização: `upsert()` → API PUT `/reajusteLancamentos/:id`
- ✅ Exclusão: `remove()` → API DELETE `/reajusteLancamentos/:id`
- ✅ Sincronização: `syncFromApi()` → API GET `/reajusteLancamentos`
- ✅ Timeline: Persistido no banco via `timelineEvents`

### 7. **Mailing / Contatos** (`maillingStore.ts`)
- ✅ Criação: `add()` → API POST `/contatos`
- ✅ Atualização: `update()` → API PUT `/contatos/:id`
- ✅ Exclusão: `remove()` → API DELETE `/contatos/:id`
- ✅ Sincronização: `syncFromApi()` → API GET `/contatos`

### 8. **Kanban** (`kanbanStore.ts`)
- ✅ Criação: `addTicket()` → API POST `/kanban/tickets`
- ✅ Atualização: `updateTicket()` → API PUT `/kanban/tickets/:id`
- ✅ Mover: `moveTicket()` → API PUT `/kanban/tickets/:id`
- ✅ Exclusão: `deleteTicket()` → API DELETE `/kanban/tickets/:id`
- ✅ Sincronização: `syncFromApi()` → API GET `/kanban/tickets`

### 9. **Comunicados** (`comunicadoStore.ts`)
- ✅ Criação: `add()` → API POST `/comunicados`
- ✅ Atualização: `update()` → API PUT `/comunicados/:id`
- ✅ Exclusão: `remove()` → API DELETE `/comunicados/:id`
- ✅ Sincronização: `fetchComunicados()` → API GET `/comunicados`
- ✅ Publicar rascunho: `publicarRascunho()` → API PUT

### 10. **Master Data / Dados** (`masterDataStore.ts`)
- ✅ Sincronização: `syncFromApi()` → API GET para todas as entidades:
  - `/clientes`
  - `/contratos`
  - `/operadoras`
  - `/produtos`
  - `/sistemas`
  - `/grupos`
  - `/analistas`
  - `/areas`
  - `/tiposCadastro`
  - `/tiposServico`
  - `/tiposDemanda`
  - `/solicitantes`
  - `/relatorios`
  - `/modelos`
  - `/usuarios`

---

## ⚠️ Dados salvos PARCIALMENTE no banco (problemas identificados)

### 11. **Projetos** (`projectStore.ts`)
- ✅ Criação: `add()` → API POST `/projetos` ✅
- ❌ Atualização: `upsert()` → **NÃO salva no banco** (apenas localStorage)
- ❌ Exclusão: `remove()` → **NÃO remove do banco** (apenas localStorage)
- ✅ Sincronização: `syncFromApi()` → API GET `/projetos`

**⚠️ PROBLEMA:** Quando você edita ou exclui um projeto na interface, as alterações **não são salvas no banco de dados**. Apenas a criação funciona corretamente.

---

## ❌ Dados salvos APENAS no localStorage (sem integração com banco)

### 12. **Tickets Antigos** (`ticketStore.ts`)
- ❌ Todas operações apenas em localStorage
- 📝 **NOTA:** Parece ser uma versão antiga/duplicada do Kanban
- **RECOMENDAÇÃO:** Remover este store, pois `kanbanStore` já tem integração completa

### 13. **Notificações** (`notificationStore.ts`)
- ❌ Todas operações apenas em localStorage
- **IMPACTO:** Notificações são perdidas ao limpar navegador ou trocar de dispositivo
- **RECOMENDAÇÃO:** Implementar persistência no banco para notificações importantes

### 14. **Dashboard** (`dashboardStore.ts`)
- ❌ Todas operações apenas em localStorage
- 📝 **NOTA:** Comentário no código diz "Dashboard não tem endpoints específicos na API ainda"
- **IMPACTO:** Configurações de dashboard personalizados são perdidas ao limpar navegador
- **RECOMENDAÇÃO:** Implementar endpoints na API para salvar configurações de dashboard por usuário

---

## 🔐 Stores Especiais

### 15. **Autenticação** (`authStore.ts`)
- Gerenciado pelo backend
- Session storage para token JWT
- Não precisa de alteração

### 16. **Timeline** (`timelineStore.ts`)
- ✅ Persistido no banco via `timelineEvents`
- Usado por múltiplas entidades (demandas, atendimento, manutenção, reajuste, analytics)

---

## 📋 Resumo Executivo

| Status | Quantidade | Stores |
|--------|-----------|--------|
| ✅ Totalmente integrado com banco | 10 | demandas, manutenção, atendimento, validação, analytics, reajuste, mailing, kanban, comunicados, masterData |
| ⚠️ Parcialmente integrado | 1 | projetos (criar OK, editar/excluir FALHA) |
| ❌ Apenas localStorage | 3 | ticketStore (duplicado), notificationStore, dashboardStore |

---

## 🎯 Recomendações de Ação

### Prioridade ALTA 🔴
1. **Corrigir `projectStore.upsert()` e `remove()`** para salvar no banco
   - Adicionar API PUT `/projetos/:id` em `upsert`
   - Adicionar API DELETE `/projetos/:id` em `remove`

### Prioridade MÉDIA 🟡
2. **Implementar persistência para Dashboard**
   - Criar endpoints `/dashboards` na API
   - Salvar configurações personalizadas por usuário
   
3. **Implementar persistência para Notificações**
   - Criar endpoints `/notificacoes` na API
   - Permitir sincronização entre dispositivos

### Prioridade BAIXA 🟢
4. **Remover `ticketStore.ts`** (duplicado/obsoleto)
   - Verificar se há alguma página ainda usando
   - Migrar para `kanbanStore` se necessário
   - Deletar o arquivo

---

## 📅 Data da Análise
16 de outubro de 2025

