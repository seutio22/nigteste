# Validação: Estrutura da Página Projetos e Permissionamento

## 1. Rotas (Frontend – `AppRoutes.tsx`)

| Rota | Componente | Proteção atual | Observação |
|------|------------|----------------|------------|
| `GET /projetos` | `ProjectListPage` (ListSimple) | `ProtectedRoute module="projetos"` (action = view) | ✅ Acesso à lista exige permissão **view** no módulo **projetos**. |
| `GET /projetos/novo` | `ProjectNewPage` | `ProtectedRoute module="projetos" requiredPermission="create"` | ⚠️ **Bug:** `ProtectedRoute` não usa a prop `requiredPermission`; usa apenas `action` (default `'view'`). Ou seja, a rota de criação está protegida só por **view**, não por **create**. |
| `GET /projetos/:id` | `ProjectDetailPage` | `ProtectedRoute module="projetos"` (action = view) | ✅ Acesso ao detalhe exige **view** no módulo **projetos**. |

**Recomendação:** Trocar `requiredPermission="create"` por `action="create"` na rota `/projetos/novo` e garantir que `ProtectedRoute` use essa prop (já suporta `action`).

---

## 2. Menu (Sidebar)

- O item **Projetos** está em `menuItems` com `module: 'projetos'`.
- Os itens são filtrados por `checkPermission(userPermissions, module, 'view')`.
- Quem não tem **view** no módulo **projetos** não vê o link no menu. ✅

---

## 3. Permissões por módulo (tipos e padrões)

- **Tipo:** `SystemPermissions` em `types/permissions.ts` inclui `projetos: ModulePermission` (view, create, edit, delete, export, import, approve, reject).
- **PermissionManager:** O módulo "Projetos" é listado e editável por ação (view, create, edit, delete, etc.). ✅
- **defaultPermissions.ts:** Roles têm permissões padrão para `projetos`:
  - **admin / gerente:** full (view, create, edit, delete, etc.).
  - **analista:** analistaPermission (view, create, edit, sem delete).
  - **solicitante:** readOnly (view apenas, create/edit/delete false). ✅

---

## 4. Acesso por projeto (lista e detalhe)

### 4.1 Backend – GET `/projetos` (listagem)

- **Admin:** vê todos os projetos (`where = {}`).
- **Usuário logado (não admin):** vê projetos que atendem ao menos um de:
  - `isPrivate: false`, ou
  - `ownerId === userId`, ou
  - `managerId === userId`, ou
  - usuário em `members` (ProjectMember).
- **Não logado:** só projetos públicos (`isPrivate: false`).

Filtro aplicado no backend. ✅

### 4.2 Backend – GET `/projetos/:id` (detalhe)

- Projeto não encontrado → 404.
- Acesso permitido se: **admin** OU **público** OU **owner** OU **manager** OU **membro ativo** (ou fallback para privado sem owner e usuário membro).
- Caso contrário → **403** com mensagem "Acesso negado a este projeto". ✅

### 4.3 Frontend – Lista (`ListSimple.tsx`)

- Chama `syncFromApi()` → GET `/projetos` (já filtrado no backend).
- **Filtro extra no frontend:** projetos com `isPrivate && ownerId !== user.id` e `user.role !== 'admin'` são ocultados da lista (redundante com o backend, mas reforça a segurança na UI). ✅
- **Botões "Novo Projeto", "Incluir Vários" e "Excluir":** não usam `PermissionGate`; qualquer usuário que tenha acesso à página (view) vê os botões. O bloqueio real de criação deveria ser na rota com **create** (que hoje está incorreta). Recomendável usar `PermissionGate module="projetos" action="create"` para Novo/Incluir e `action="delete"` para Excluir.

### 4.4 Frontend – Detalhe (`Detail.tsx`)

- Carrega projeto pela API (GET `/projetos/:id`). Se a API retornar 403, o tratamento de erro genérico pode ser melhorado (ex.: mensagem “Acesso negado a este projeto”).
- Botões de editar/excluir não estão envolvidos em `PermissionGate`; quem tem view no módulo vê tudo. Recomendável usar `PermissionGate` com **edit** e **delete** para esconder ou desabilitar ações não permitidas.

---

## 5. Resumo

| Camada | O que está ok | O que ajustar |
|--------|----------------|----------------|
| **Rotas** | Lista e detalhe protegidos por módulo **projetos** (view). | Rota `/projetos/novo`: usar `action="create"` em vez de `requiredPermission="create"`. |
| **Menu** | Item Projetos exibido só com **view** em **projetos**. | — |
| **Permissões** | Módulo projetos no tipo, no PermissionManager e nos defaults por role. | — |
| **API lista** | Filtro por admin / público / owner / manager / membro. | — |
| **API detalhe** | 403 quando usuário não pode ver o projeto. | — |
| **Lista (UI)** | Filtro extra no frontend para privados. | Opcional: PermissionGate para botões Criar e Excluir. |
| **Detalhe (UI)** | — | Opcional: PermissionGate para Editar/Excluir; tratamento explícito de 403. |

---

## 6. Ação imediata recomendada

1. **Corrigir a rota de criação:** em `AppRoutes.tsx`, na rota `projetos/novo`, trocar `requiredPermission="create"` por `action="create"` (e, se em algum lugar existir uso de `requiredPermission`, remover ou mapear para `action` no `ProtectedRoute`).
2. (Opcional) Usar `PermissionGate` na lista e no detalhe para botões Criar, Editar e Excluir, alinhados às permissões **create**, **edit** e **delete** do módulo **projetos**.
