# Planejamento – Troca de cores do sistema

## Nova paleta (referência)

| Nome        | Uso sugerido           | Hex       |
|------------|------------------------|-----------|
| Azul       | Cor principal, botões  | `#002561` |
| Azul ciano | Links, destaques, hover | `#009FDF` |
| Roxo       | Secundário, gradientes | `#050032` |
| Apoio 3    | Textos secundários, fundos suaves | `#A3B5BC` |
| Cinza      | Bordas, fundos neutros  | `#DCDFE3` |

---

## 1. Cores atuais mapeadas no sistema

### 1.1 Azuis (primary / botões / links / bordas)

| Cor atual | Onde aparece | Arquivos (exemplos) |
|-----------|--------------|---------------------|
| `#3b82f6` | Botões, ícones, bordas de foco, gradientes | Login.tsx, Listas (Demandas, Manutenção, Atendimento, Validação, Reajuste, Analytics), EmailComunicacaoModal, KanbanBoard |
| `#1e40af` | Gradiente botão (fim) | Login.tsx |
| `#2563eb` | Hover botão, gradientes | Login, várias List.tsx, EmailComunicacaoModal |
| `#1d4ed8` | Hover / gradiente | Login, EmailComunicacaoModal |
| `rgba(59, 130, 246, 0.15)` / `0.3` / `0.4` | boxShadow, glow | Listas, Login (techGlow) |

### 1.2 Roxo / secundário (purple)

| Cor atual | Onde aparece | Arquivos |
|-----------|--------------|----------|
| `#667eea` | Chips “Minhas validações”, botão “Nova validação”, fundo/borda analista | Validacao/List, Analytics, Reajuste, Atendimento, Manutencao, Demandas/List, EmailComunicacaoModal |
| `#9333ea` / `#7e22ce` / `#7c3aed` / `#6d28d9` | Gradientes (roxo → azul) em botões | Várias List.tsx, Demandas/List |
| `rgba(156, 39, 176, 0.15)` | boxShadow botão secundário | Validacao, Analytics, Reajuste, Manutencao, Atendimento, Demandas |
| Tailwind `primary-*` / `secondary-*` (HSL) | Classes text-primary-600, border-primary-300, bg-primary-50, etc. | Tailwind config + várias páginas |

### 1.3 Cinzas e neutros

| Cor atual | Onde aparece | Arquivos |
|-----------|--------------|----------|
| `#2d3748` | Título “Bem-vindo de volta” | Login.tsx |
| `#718096` | Subtítulo login | Login.tsx |
| `#cbd5e0` | Botão disabled | Login.tsx |
| `#374151` | Texto corpo, NotificationDetailModal | EmailComunicacaoModal (HTML email), NotificationDetailModal, index.css (.comunicado-content) |
| `#1f2937` | Texto comunicado (index.css) | index.css |
| Tailwind `gray-50` … `gray-800` | Fundos, bordas, textos | NotificationDropdown, NotificationDetailModal, Listas (border-blue-200, bg-blue-50 → equivalente azul claro) |
| `theme.palette.grey[50]` etc. | MUI (sem tema customizado) | Dashboard, ProjectGantt, AdvancedIndicators, PeriodSelector |
| `#e2e8f0` | Borda tabela email | EmailComunicacaoModal |
| `#ddd` / `#555` | PDF/export (table border, .muted) | Analytics, Reajuste, Manutencao, Demandas (estilo inline HTML) |

### 1.4 Tailwind (theme extend)

| Token | Atual (HSL) | Uso |
|-------|-------------|-----|
| `primary` 50–950 | Azul HSL (215, 100%, …) | gradient-primary, text-primary-600, border-primary-300, etc. |
| `secondary` 50–950 | Roxo HSL (263, 70%, …) | gradient-secondary, text-secondary-600, etc. |
| `accent` 50–950 | Verde HSL (142, …) | gradient-accent (manter para success se desejar) |
| `neutral` 50–950 | Cinza HSL (0, 0%, …) | — |
| boxShadow `glow`, `glow-primary` | rgba(59, 130, 246, …) | — |

### 1.5 useTheme (variáveis CSS light/dark)

| Variável | Light atual | Dark atual |
|----------|-------------|------------|
| `--bg-primary` | #ffffff | #1f2937 |
| `--bg-secondary` | #f9fafb | #374151 |
| `--text-primary` | #111827 | #f9fafb |
| `--text-secondary` | #6b7280 | #d1d5db |
| `--border-color` | #e5e7eb | #4b5563 |

### 1.6 Outros (manter ou ajustar pontualmente)

| Cor | Uso | Ação sugerida |
|-----|-----|----------------|
| `#ef4444`, `#dc2626`, `#fef2f2` | Erro, alertas, bordas erro | Manter (semântico) |
| `#10b981` | Success (edição, etc.) | Manter |
| `theme.palette.success` / `warning` / `error` | MUI (gráficos, status) | Manter; primary/secondary trocar via tema MUI |
| `#764ba2` | Gradiente EmailComunicacaoModal | Trocar para Roxo #050032 ou Azul #002561 |
| `#1a1c2d`, `#262b44` | Header do email (HTML) | Podem ir para Roxo #050032 |
| Dashboard COLORS array | Gráficos (#3b82f6, #8b5cf6, …) | Trocar #3b82f6 → Azul; #8b5cf6 → Roxo ou Azul ciano |
| index.css highlight | #ef4444, #f97316, #eab308 | Manter (destaque animado) |

---

## 2. Projeção de troca (mapeamento atual → nova paleta)

| Contexto | Cor(es) atual(is) | Troca para |
|----------|-------------------|------------|
| **Cor principal (botões, links, ícones, bordas de foco)** | #3b82f6, #2563eb, #1e40af, #1d4ed8 | **Azul** `#002561` (principal); **Azul ciano** `#009FDF` (hover, links, destaque) |
| **Gradientes principal** | linear-gradient(135deg, #3b82f6 0%, #1e40af 100%) | linear-gradient(135deg, #002561 0%, #009FDF 100%) ou (135deg, #002561, #050032) |
| **Secundário / roxo** | #667eea, #9333ea, #7e22ce, #7c3aed, #6d28d9 | **Roxo** `#050032` (ou gradiente com Azul ciano) |
| **boxShadow primary** | rgba(59, 130, 246, 0.15) etc. | rgba(0, 37, 97, 0.15) ou rgba(0, 159, 223, 0.2) |
| **boxShadow secondary** | rgba(156, 39, 176, 0.15) | rgba(5, 0, 50, 0.15) |
| **Título / texto forte** | #2d3748 | **Roxo** `#050032` ou manter cinza escuro |
| **Texto secundário** | #718096, #6b7280, text-secondary | **Apoio 3** `#A3B5BC` |
| **Bordas / fundos neutros** | #e2e8f0, #e5e7eb, gray-100, grey[50] | **Cinza** `#DCDFE3` (bordas); fundos podem ser #DCDFE3 com opacidade ou branco |
| **Botão disabled** | #cbd5e0 | **Cinza** `#DCDFE3` ou tom mais claro |
| **Tailwind primary** (50–950) | HSL azul 215 | Gerar escala a partir de **#002561** (e claro #009FDF para 50–400) |
| **Tailwind secondary** (50–950) | HSL roxo 263 | Gerar escala a partir de **#050032** |
| **Tailwind gradient-primary** | hsl(215,…) | #002561 → #009FDF |
| **Tailwind gradient-secondary** | hsl(263,…) | #050032 (e variantes) |
| **Tailwind gradient-dark** (sidebar) | hsl(215, 100%, 20%) → 10% | **#050032** ou **#002561** (escuro) |
| **Sidebar** | bg-gradient-dark, bg-gradient-primary | gradient com #050032 / #002561 e #009FDF |
| **MUI theme** (quando criado) | primary default #1976d2 | primary.main: #002561; primary.light: #009FDF ou tom claro; secondary: #050032 |
| **Variáveis CSS (useTheme)** | — | Opcional: --color-primary: #002561; --color-cyan: #009FDF; --color-muted: #A3B5BC; --color-border: #DCDFE3 |

---

## 3. Onde alterar (por tipo)

1. **Tailwind** (`tailwind.config.ts`)  
   - Redefinir `colors.primary` e `colors.secondary` com escala baseada em #002561, #009FDF, #050032.  
   - Ajustar `backgroundImage` (gradient-primary, gradient-secondary, gradient-dark).  
   - Ajustar `boxShadow` (glow, glow-primary, glow-secondary) para os novos hex.

2. **Login** (`Login.tsx`)  
   - Trocar todos os #3b82f6, #1e40af, #2563eb, #1d4ed8, #2d3748, #718096, #cbd5e0 e rgba(59,130,246) conforme tabela acima.

3. **Listas** (Demandas, Manutenção, Atendimento, Validação, Reajuste, Analytics)  
   - Botões “Nova …”, chips “Minhas validações”, bordas e sombras: #3b82f6/#2563eb → Azul/Azul ciano; #667eea e gradientes roxo → Roxo; classes Tailwind primary/secondary já seguem o config.

4. **EmailComunicacaoModal**  
   - #667eea, #764ba2, #3b82f6, #1d4ed8, #1f2937, #374151, #e2e8f0, gradientes e bordas conforme tabela.

5. **NotificationDropdown / NotificationDetailModal**  
   - text-blue-*, bg-blue-50, gray-* → Azul ciano claro / Cinza / Apoio 3 conforme hierarquia.

6. **Dashboard**  
   - COLORS array: primeiro item #002561, segundo #050032 ou #009FDF; demais manter ou alinhar à paleta.  
   - theme.palette.primary.secondary (MUI) → definir via tema.

7. **KanbanBoard**  
   - border #3b82f6, bgcolor primary → tema ou #002561/#009FDF.

8. **index.css**  
   - .comunicado-content (cores de texto) e quaisquer hex de cinza → Apoio 3 / Cinza.

9. **useTheme**  
   - Opcional: definir variáveis CSS (--color-primary, --color-cyan, etc.) para uso em componentes que não usem Tailwind/MUI.

10. **MUI**  
   - Criar `createTheme` em `main.tsx` ou `App.tsx` com `palette.primary.main: '#002561'`, `primary.light: '#009FDF'`, `secondary.main: '#050032'`, e usar `grey` ou custom para Apoio 3 e Cinza em textos/bordas.

---

## 4. Resumo da projeção de troca

| Nova cor     | Hex       | Substitui (resumo) |
|--------------|-----------|---------------------|
| **Azul**     | `#002561` | #3b82f6, #1e40af, #2563eb, #1d4ed8 como cor principal; primary Tailwind/MUI |
| **Azul ciano** | `#009FDF` | Links, hover, ícones de destaque; variante clara de primary |
| **Roxo**     | `#050032` | #667eea, #9333ea, #7e22ce, #7c3aed, #6d28d9; secondary; gradient-dark (sidebar) |
| **Apoio 3**  | `#A3B5BC` | #718096, #6b7280, textos secundários, labels |
| **Cinza**    | `#DCDFE3` | #e2e8f0, #e5e7eb, #cbd5e0; bordas, fundos neutros, disabled |

Cores de **erro** (#ef4444, #dc2626), **sucesso** (#10b981) e **aviso** (amarelo/laranja) permanecem para não quebrar semântica de feedback.  
Quando houver tema MUI, primary = Azul, primary.light = Azul ciano, secondary = Roxo; textos secundários e bordas podem usar Apoio 3 e Cinza.
