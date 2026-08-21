# Plano: Skeleton, Lazy seletivo e Motion no shell

Objetivo: melhorar percepção e performance sem reescrever o app, sem quebrar Vercel/Railway, e sem encher a UI de animação.

Parâmetro-alvo: **lazy seletivo + skeleton nas listas/detalhes principais + motion só no shell**.

## Fora de escopo (nesta iniciativa)

- Motion em tabelas/células/listas
- Lazy em **todas** as rotas de uma vez
- Refatoração grande de stores/API
- Virtualização (pode ser fase 3+)

---

## Fase 0 — Baseline (½ dia)

**Por quê:** medir antes/depois.

- Anotar bundle inicial (build) e LCP/TTI nas telas: Home, Demandas lista, Placement fila, Projeto detalhe
- Listar telas com `CircularProgress` vs `Skeleton` vs nada
- Critério de pronto: checklist de telas + números iniciais

---

## Fase 1 — Skeleton padrão (1–2 dias)

**Por quê:** maior ganho de UX com baixo risco.

1. Criar componentes reutilizáveis, ex.:
   - `ListPageSkeleton` (título + filtros + linhas/cards)
   - `DetailPageSkeleton` (header + blocos)
   - `TableSkeleton` / `CardGridSkeleton`
2. Trocar spinner por skeleton em:
   - Demandas lista/detalhe
   - Manutenção lista/detalhe
   - Placement fila (lista)
   - Validação lista
   - Home (blocos principais)
   - (já ok: Projetos, Comunicados, Dashboard projetos — só alinhar ao padrão)
3. Skeleton deve espelhar o layout final (evitar “pulo”).

**Critério de pronto:** listas/detalhes principais sem spinner genérico no carregamento inicial.

---

## Fase 2 — Lazy seletivo (1–2 dias)

**Por quê:** reduzir JS do first load; manter Vercel estável.

1. Manter rotas leves estáticas (Login, Home shell, listas simples se forem leves)
2. `React.lazy` + `Suspense` (fallback = skeleton da Fase 1) em:
   - Placement: Detail, Comparativo, Slides, Proposta, Etapa
   - Projetos: Detail
   - Dashboards: Produtividade / Projetos (se pesados)
   - Share público Placement (se bundle grande)
3. Testar build Vercel (chunks, prefetch opcional no hover do menu)
4. Não lazy-loadar Sidebar/Header/auth

**Critério de pronto:** first load menor; navegação para Placement/Projeto ainda fluida (skeleton no gap).

---

## Fase 3 — Motion só no shell (½ dia)

**Por quê:** consolidar o que já está certo.

1. Auditar `framer-motion`: manter AppLayout, Sidebar, Header, dropdowns
2. Remover/evitar motion em conteúdo de página (tabelas, cards de lista)
3. Preferir `prefers-reduced-motion` onde fizer sentido

**Critério de pronto:** motion só no chrome; páginas sem animação decorativa.

---

## Fase 4 — Hardening (opcional, 1 dia)

- Prefetch de rotas lazy no hover do menu Placement/Projetos
- Revisar listas muito longas (virtualização só se necessário)
- Re-medir bundle/LCP vs Fase 0

---

## Ordem de execução sugerida

`0 → 1 → 2 → 3 → 4`

Se o tempo apertar: **só Fase 1** já melhora muito a percepção.

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Lazy quebrar Vercel | Lazy por página pesada; testar preview antes de prod |
| Skeleton ≠ layout | Copiar estrutura real da página |
| Duplo loading (rota + API) | Um skeleton cobrindo os dois estados |

## Entregáveis por fase

- PR pequeno e revisável (não um monólito)
- Checklist de telas cobertas
- Nota de “antes/depois” do bundle (Fase 2+)

## Próximo passo de execução

Começar pela **Fase 1 (skeleton padrão)** — ajuste mais seguro e visível.
