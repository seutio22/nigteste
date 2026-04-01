# Planejamento: Renovação da Home

Objetivo: incluir na página Home (1) acesso com resumo à caixa de entrada, (2) saudações conforme datas festivas (Páscoa, Natal, etc.) com ilustração, e (3) cadastro e exibição de aniversariantes.

---

## 1. Resumo da Caixa de Entrada na Home

### 1.1 O que fazer
- Na Home, exibir um **bloco/card** com resumo da caixa de entrada (notificações).
- O usuário clica e é levado para `/notificacoes` (página já existente).

### 1.2 Conteúdo do resumo
- **Número de não lidas** (ex.: “3 não lidas”).
- **Total de notificações** (opcional).
- **Uma ou duas últimas** em preview (título + “há X min”), se houver.
- Ícone de envelope/sino e texto tipo “Caixa de entrada” ou “Notificações”.
- Botão/link “Ver todas” → `/notificacoes`.

### 1.3 Onde buscar dados
- Usar o **store de notificações** já existente (`useNotificationStore`):
  - `notifications`, `unreadCount`, lógica de `visibleNotifications` (respeitando `dismissedKeys` e filtros atuais).
- Nada de nova API; apenas leitura do store no frontend.

### 1.4 Onde posicionar na Home
- Opção A: novo card na área de **Ações Rápidas** (ex.: primeiro card “Caixa de entrada”).
- Opção B: card dedicado **acima ou ao lado** das “Atividades Recentes”.
- **Recomendação:** card dedicado entre “Ações Rápidas” e “Atividades Recentes”, ou como primeiro item das ações rápidas.

### 1.5 Regras
- Se não houver notificações: mostrar “Nenhuma notificação” e mesmo assim o link “Abrir caixa de entrada”.
- Estilo alinhado à paleta do sistema (primary, apoio, etc.) e ao restante da Home.

---

## 2. Saudações por Datas Festivas

### 2.1 Objetivo
- Alterar a **saudação do banner** (ou área de boas-vindas) da Home conforme a data:
  - Texto específico da data (ex.: “Feliz Páscoa”, “Feliz Natal”).
  - **Ilustração ou ícone** temático (desenho de Páscoa, Natal, etc.).

### 2.2 Quais datas considerar (sugestão)
| Data / Período      | Saudação / Tema     | Ícone/Ilustração (sugestão)     |
|---------------------|---------------------|---------------------------------|
| 01/01               | Ano Novo            | Fogos, sino, “Feliz Ano Novo”  |
| Carnaval (móvel)    | Carnaval            | Máscara, confete                |
| Páscoa (móvel)      | Páscoa              | Ovo, coelho, “Feliz Páscoa”    |
| 21/04               | Tiradentes          | Opcional (bandeira / histórico) |
| 01/05               | Dia do Trabalho     | Opcional                        |
| 12/06               | Dia dos Namorados   | Coração                         |
| 07/09               | Independência       | Opcional                        |
| 12/10               | Dia das Crianças    | Opcional                        |
| 15/11               | Proclamação         | Opcional                        |
| 25/12               | Natal               | Árvore, estrela, “Feliz Natal” |
| 31/12               | Réveillon           | Fogos, “Feliz Ano Novo”        |

- **Fase 1 (mínimo):** Ano Novo (01/01), Páscoa (móvel), Natal (25/12), Réveillon (31/12).
- **Fase 2:** incluir Carnaval, Dia dos Namorados e outros conforme prioridade.

### 2.3 Cálculo de datas móveis
- **Páscoa:** algoritmo de cálculo da Páscoa (ex.: Meeus/Jones) para obter domingo de Páscoa no ano atual.
- **Carnaval:** 47 dias antes da Páscoa (terça-feira de Carnaval); pode-se considerar também segunda e domingo (intervalo de dias).

### 2.4 Implementação (visão geral)
- **Frontend:** módulo/arquivo de “festividades” (ex.: `utils/festividades.ts` ou `config/festividades.ts`):
  - Função que recebe `Date` e retorna `{ tipo, saudacao, emojiOuIcone }` (e opcionalmente chave para ilustração).
- **Ilustração:**
  - **Opção A (rápida):** emojis ou ícones (Lucide/React Icons) por tipo (ovo/coelho Páscoa, árvore/sino Natal, etc.).
  - **Opção B:** imagens/desenhos em SVG ou PNG em `public/` (ex.: `pascoa.svg`, `natal.svg`) e exibir conforme `tipo`.
- No **Home**, no bloco de boas-vindas:
  - Chamar a função com `new Date()`.
  - Se houver festividade no dia (ou na “semana da festa”, conforme regra definida), exibir a saudação + ícone/ilustração; senão, manter saudação padrão “Olá, [nome]!”.

### 2.5 Regras de exibição
- Definir se a saudação festiva aparece **só no dia** ou em um **intervalo** (ex.: semana do Natal: 23–26/12).
- Evitar sobrepor muitas festas no mesmo dia; prioridade por ordem na config (ex.: Natal > Ano Novo se 01/01 cair em contexto natalino).

---

## 3. Aniversariantes

### 3.1 Objetivo
- **Cadastrar** pessoas como aniversariantes (data de aniversário).
- Na Home, exibir **saudação/parabéns** para quem faz aniversário **no dia** (e opcionalmente “aniversariantes do mês”).

### 3.2 Onde cadastrar
- **Opção A – Usuários do sistema:** usar o próprio modelo `User` e adicionar campo opcional `birthDate` (ou `dataNascimento`).
  - Cadastro/edição em **Admin → Usuários** (formulário de usuário com campo “Data de nascimento”).
  - Na Home: “Parabéns, [Nome]!” para usuários com aniversário hoje (e lista opcional do mês).
- **Opção B – Lista própria de aniversariantes:** nova entidade no backend, ex.: `Aniversariante` (nome, data de aniversário, talvez email ou vínculo com User).
  - Tela de cadastro em **Dados** (nova aba “Aniversariantes”) ou em **Admin**.
  - Na Home: listar aniversariantes do dia (e opcionalmente do mês) a partir dessa lista.

**Recomendação:** Opção A para não criar nova entidade e reaproveitar usuários; se precisar parabenizar pessoas que não são usuárias (ex.: clientes, parceiros), usar Opção B.

### 3.3 Backend (se Opção A)
- **Prisma:** adicionar ao modelo `User`:
  - `birthDate DateTime?` (ou `dataNascimento DateTime?`).
- **Migração:** `npx prisma migrate dev --name add_user_birthdate`.
- **API:** 
  - No endpoint de atualização de usuário (PUT/PATCH), aceitar `birthDate` e persistir.
  - Novo endpoint opcional: `GET /users/birthdays?day=MM-DD` ou `GET /users/birthdays?month=MM` para listar aniversariantes do dia ou do mês (retornando id, name, birthDate conforme necessário).

### 3.4 Backend (se Opção B)
- **Prisma:** novo modelo, ex.:
  - `Aniversariante { id, nome, dataAniversario (DateTime ou só dia/mês), createdAt, updatedAt }`.
- **CRUD:** criar rotas e tela para listar/criar/editar/excluir aniversariantes.
- **API:** `GET /aniversariantes?day=MM-DD` (e opcionalmente `?month=MM`) para usar na Home.

### 3.5 Frontend – Cadastro
- **Opção A:** na tela **Admin → Usuários**, ao criar/editar usuário: campo “Data de nascimento” (date ou month-day, conforme regra de negócio).
- **Opção B:** nova aba “Aniversariantes” em Dados (ou nova página em Admin) com tabela e formulário (nome + data de aniversário).

### 3.6 Frontend – Exibição na Home
- Bloco “Aniversariantes” ou “Parabéns”:
  - **Hoje:** “Parabéns, [Nome 1], [Nome 2]! 🎂” (e ícone/ilustração de bolo).
  - **Este mês (opcional):** lista “Aniversariantes de [Mês]: Nome 1 (dia X), Nome 2 (dia Y)”.
- Posição sugerida: próximo ao banner de boas-vindas (abaixo ou ao lado) ou dentro do próprio banner quando houver aniversariante do dia.

### 3.7 Privacidade
- Decidir se aniversariantes do dia/mês são visíveis para **todos** os usuários ou só para admin/gerentes. Por padrão, exibir para todos na Home (parabéns é público no contexto interno).

---

## 4. Ordem de implementação sugerida

1. **Fase 1 – Caixa de entrada na Home**  
   - Sem backend.  
   - Card na Home com resumo (unread, preview, link para `/notificacoes`).  
   - Rápido e independente.

2. **Fase 2 – Saudações festivas**  
   - Apenas frontend (utils + Home).  
   - Datas fixas + Páscoa (e opcionalmente Carnaval).  
   - Saudação + emoji/ícone no banner da Home.

3. **Fase 3 – Aniversariantes**  
   - Definir Opção A (User.birthDate) ou B (entidade Aniversariante).  
   - Backend: campo ou modelo + API.  
   - Frontend: tela de cadastro + bloco na Home.

---

## 5. Resumo das decisões a confirmar

- **Caixa de entrada:** posição do card (ações rápidas vs bloco dedicado).
- **Festividades:** lista final de datas e se usamos emoji/ícone ou imagens SVG/PNG.
- **Aniversariantes:** Opção A (User) ou B (entidade separada); se “só dia” ou “dia + mês” na Home.

Com esse planejamento aprovado, o desenvolvimento pode seguir por fases (1 → 2 → 3) conforme acima.
