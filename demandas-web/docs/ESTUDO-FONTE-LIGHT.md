# Estudo – Uso do peso Light (300) da Geometria

## Especificação

- **font-family:** Geometria  
- **font-weight:** 300 (Light)  
- **font-size:** 32px (em contextos de display); em UI pode ser menor  
- **line-height:** 125% (40px quando size 32px)

## Onde usar Light (300)

| Contexto | Uso | Motivo |
|----------|-----|--------|
| **Caption / legendas** | Texto auxiliar, rótulos secundários, “X concluídas” | Leveza visual, hierarquia |
| **Overline** | Labels de seção, “TOTAL DE ATIVIDADES” | Destaque suave |
| **Lead / intro** | Parágrafo de abertura (“Bem-vindo ao seu painel…”) | Leitura confortável |
| **Subtítulo de hero** | “Faça login para acessar sua conta” | Contraste com título em Bold |
| **Labels em cards** | “Taxa de Conclusão”, “Geral - Histórico Completo” | Secundário ao número |
| **Mensagens de apoio** | “Use as ações rápidas acima…” | Tom mais leve |

## Onde não usar Light

- **Corpo de texto longo** → manter Regular (400) para legibilidade  
- **Botões e CTAs** → Medium (500) ou Bold (700)  
- **Títulos (h1–h6)** → Medium/Bold conforme tema  
- **Dados tabulares** → Regular ou Medium  

## Ajustes realizados

1. **theme.ts** – `caption` e `overline` com `fontWeight: 300`
2. **Login** – Subtítulo do formulário com `fontWeight: 300`
3. **Home** – Textos secundários do hero e dos cards com `font-light` (Tailwind)
4. **index.css** – Classe `.text-lead` com `font-weight: 300` para parágrafos de abertura
5. **Tailwind** – `font-light` já usa 300; com `font-geometria` o resultado é Geometria Light
