# Plano de segurança — auditoria ofensiva (defensiva) e contramedidas

**Contexto:** análise no papel de atacante (login → API → dados → links públicos), com foco em contramedidas. Sem PoCs de exploração.

**Data de referência:** 2026-08-21  
**Escopo:** `demandas-web` + `demandas-api` (monorepo nigteste)

---

## 1. Dados sensíveis em risco

| Dado | Onde aparece / vaza se explorado |
|------|----------------------------------|
| Contas (email, role, permissões) | Rotas públicas de usuários, JWT no client |
| Senhas / tokens | Logs de setup, respostas que ecoam senha, JWT forjável |
| Demandas, clientes, contratos, manutenção | CRUD genérico sem auth |
| Placement (cotações, beneficiários, anexos) | API Placement sem JWT |
| Projetos (equipe, tasks, PII) | Share mal gerido + spoof `x-user-*` |
| Monitoramento (presença, atividade) | Endpoints / clear sem auth |
| Segredos de infra | `.env` / backup versionado, connection string no código |

---

## 2. Achados por severidade (visão atacante)

### Crítico — corrigir primeiro

1. **Backdoors / setup sem auth** (`login-temp`, `create-admin-temp`, `setup-admin`, `create-admin`, `create-new-user`) → admin JWT ou reset de senha.
2. **Credencial / export sem auth** (ex.: connection string hardcoded + export) → dump de dados.
3. **Segredos no git** (ex.: `.env.backup` com `DATABASE_URL` / `JWT_SECRET`) → forjar tokens / acessar DB.
4. **Identidade spoofável** (`x-user-id` / `x-user-role` + decode JWT **sem** verificar assinatura) → impersonação / admin falso.
5. **CRUD genérico sem JWT** (demandas, clientes, etc.) → leitura/escrita/exclusão anónima.
6. **Placement API sem JWT** (CRUD + uploads) → dados comerciais e PII.
7. **Gestão de share sem JWT** (criar/listar/revogar projetos e Placement) → links públicos ou revogação maliciosa.

### Alto

8. Login sem rate limit / lockout → brute-force.
9. `JWT_SECRET` com fallback de desenvolvimento → tokens forjáveis se env falhar.
10. Token + permissões no `localStorage` → XSS = roubo de sessão.
11. XSS via `dangerouslySetInnerHTML` (notificações, comunicados, HTML Placement).
12. Share público oversharing (emails, beneficiários além de `allowedViews`).
13. Enumeração de usuários (`/usuarios-publicos`, validate, etc.).
14. `POST /monitoring/clear` e atividade sem auth → apagar/falsificar auditoria.
15. Upload pouco restrito (anexos) → malware / abuse.

### Médio / baixo

16. Sem Helmet/CSP/HSTS; CORS com previews amplos.
17. `bodyLimit` 50MB global → DoS.
18. ProtectedRoute só no client (UI bypass se API estiver aberta).
19. Senha mínima fraca; logs com PII/senha.
20. Share sem TTL default; rotas de debug em produção.

---

## 3. Plano de contramedidas (fases)

### Fase S0 — Emergência (mesmo dia)

**Objetivo:** fechar portas que dão admin ou dump imediato.

1. Remover ou desabilitar em produção: `login-temp`, `create-admin-temp`, `setup-admin`, `create-admin`, `create-new-user`, export com connection string.
2. Remover `.env.backup` do tracking; **rotacionar** `JWT_SECRET` e senha/URL do Postgres.
3. Falhar o boot da API se `JWT_SECRET` ausente ou for o default de desenvolvimento.
4. Desligar `POST /monitoring/clear` público (só admin + JWT).

**Critério:** nenhum endpoint cria admin ou devolve senha/credencial sem auth.

---

### Fase S1 — Deny-by-default na API (1–3 dias)

**Objetivo:** atacante anónimo não lê/escreve dados de negócio.

1. Hook global `onRequest`: JWT obrigatório, com **allowlist** explícita:
   - `/health`, `/auth/login`, `/auth/change-password` (e fluxos públicos necessários)
   - `GET /share/:token`, `GET/POST /share/placement/:token*` (só o necessário ao viewer)
2. Remover confiança em `x-user-id` / `x-user-role` e em decode JWT sem `jwtVerify`.
3. Identidade só de `request.user` / `sub` após verify; role/permissões do **banco** (`requirePermission`).
4. Proteger CRUD genérico, `placement.ts`, master data, gestão de shares com JWT + permissão/ownership.
5. Remover ou autenticar: `/usuarios-publicos`, `/usuario-edicao/:id`, `/users/validate/:id`.

**Critério:** chamada sem Bearer em rotas de negócio → 401; spoof de header não eleva privilégio.

---

### Fase S2 — Login e sessão (1–2 dias)

1. Rate limit por IP + email no login (e change-password).
2. Respostas uniformes (sem enumerar “usuário não existe” vs “senha errada” além do necessário).
3. Bloquear login se usuário sem hash bcrypt; forçar reset.
4. Política de senha mais forte (mínimo ≥ 10–12, não só 6).
5. Front: interceptor 401 único (`api.local` + `api.ts`) → logout.
6. Médio prazo: migrar JWT para **cookie HttpOnly + Secure + SameSite** (reduz impacto de XSS).

**Critério:** brute-force limitado; sessão inválida some do client de forma consistente.

---

### Fase S3 — XSS, headers e uploads (1–2 dias)

1. Sanitizar HTML (`DOMPurify` ou equivalente) em notificações/comunicados/previews; preferir texto.
2. `@fastify/helmet` + CSP básica + HSTS em produção.
3. Upload: allowlist MIME/extensão, tamanho por rota, auth, storage fora de webroot.
4. Reduzir `bodyLimit` global; limites por endpoint.

**Critério:** HTML não executa script; uploads autenticados e tipados.

---

### Fase S4 — Share e PII (1 dia)

1. Gestão de share (POST/GET lista/DELETE) só com JWT + permissão/ownership.
2. GET público: DTO mínimo; respeitar `allowedViews`; não expor emails desnecessários.
3. TTL default nos tokens; rate limit em access/events.
4. Revogação fácil na UI (já existe parcialmente).

**Critério:** só quem tem permissão cria/revoga; link público não vaza além do combinado.

---

### Fase S5 — Hardening contínuo

1. Matriz módulo × ação (`requirePermission`) em todas as mutações.
2. Quem pode alterar `role`/`permissions`: só admin (DB), não só `usuarios.edit`.
3. Remover rotas de debug em prod.
4. Nunca logar senha; mascarar PII em logs.
5. Revisão periódica (checklist) a cada release grande.

---

## 4. Ordem sugerida de execução

`S0 → S1 → S2 → S3 → S4 → S5`

Se o tempo apertar: **S0 + S1** já mudam o risco de “aberto na internet” para “precisa de token válido”.

---

## Status de execução (2026-08-21)

| Fase | Status | O que foi feito |
|------|--------|-----------------|
| **S0** | Feito | Backdoors/`setup`/`export`/`monitoring/clear`/`usuario-edicao` públicos → **410**; credencial hardcoded removida do export; `JWT_SECRET` obrigatório em produção |
| **S1** | Feito | Plugin `jwtGate` deny-by-default (allowlist: health, login, change-password, share público); spoof `x-user-*` / decode sem verify reduzido nas rotas críticas |
| **S1b** | Feito via gate | Placement, shares gestão, monitoring, masterData, CRUD genérico passam a exigir JWT |
| **S2** | Parcial | Rate limit login (20/15min); 401 → logout em `api.local`; login sem hash rejeitado |
| **S3–S5** | Pendente | Helmet/CSP, sanitização XSS, cookie HttpOnly, matriz de permissões |

**Operacional pós-deploy:** confirmar `JWT_SECRET` forte no Railway; rotacionar se já vazou (ex. `.env.backup`); remover `.env.backup` do histórico git se ainda existir.
---

## 5. Relação com a tela de login

Do ponto de vista do atacante:

| Camada | Situação atual (resumo) | Após plano |
|--------|-------------------------|------------|
| UI Login | Formulário normal | Continua; + rate limit no back |
| Token no browser | `localStorage` (XSS = jogo) | Cookie HttpOnly (Fase S2 médio prazo) |
| API atrás do login | Muitas rotas **não** exigem o token | Deny-by-default (S1) |
| Atalhos “temp/admin” | Bypass do login | Removidos (S0) |

Ou seja: **endurecer só a tela de login não basta** — o buraco maior hoje é a API confiar pouco (ou nada) no JWT em grande parte do monólito.

---

## 6. Entregáveis por fase

- PR pequeno e revisável
- Checklist de rotas na allowlist
- Confirmação de rotação de secrets (S0)
- Teste manual: request sem token → 401 nas rotas de negócio

---

## 7. Próximo passo de execução

Começar pela **Fase S0 (emergência)** — remover backdoors, rotacionar secrets, fechar clear/export — antes de skeleton/lazy (performance).

Plano de performance (skeleton/lazy): `docs/plano-perf-skeleton-lazy.md`
