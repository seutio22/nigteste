# 🎨 Design System - Sistema de Demandas

## 🚀 Visão Geral

Este projeto agora utiliza um design system moderno e rebuscado com:

- **Tailwind CSS** para estilização utilitária
- **Framer Motion** para animações fluidas
- **Plus Jakarta Sans** como fonte principal
- **Tokens HSL personalizados** para cores
- **Gradientes modernos** e efeitos glassmorphism
- **Sidebar colapsável** com animações

## 🎨 Paleta de Cores

### Cores Primárias (HSL)
```css
primary-50: hsl(210, 100%, 98%)   /* Azul muito claro */
primary-500: hsl(215, 100%, 65%)  /* Azul principal */
primary-900: hsl(215, 100%, 20%)  /* Azul escuro */
```

### Cores Secundárias (HSL)
```css
secondary-500: hsl(263, 70%, 65%) /* Roxo principal */
secondary-900: hsl(263, 70%, 25%) /* Roxo escuro */
```

### Cores de Acento (HSL)
```css
accent-500: hsl(142, 71%, 45%)    /* Verde principal */
accent-900: hsl(145, 80%, 20%)    /* Verde escuro */
```

## 🌈 Gradientes Disponíveis

```css
bg-gradient-primary    /* Azul para azul escuro */
bg-gradient-secondary  /* Roxo para roxo escuro */
bg-gradient-accent     /* Verde para verde escuro */
bg-gradient-dark       /* Azul escuro para preto */
bg-gradient-glass      /* Transparência com blur */
```

## ✨ Animações

### Float (Flutuação)
```css
animate-float          /* 6s - velocidade normal */
animate-float-fast     /* 4s - velocidade rápida */
animate-float-slow     /* 8s - velocidade lenta */
```

### Entrada e Saída
```css
animate-slide-in       /* Desliza da esquerda */
animate-slide-out      /* Desliza para a esquerda */
animate-fade-in        /* Aparece suavemente */
animate-scale-in       /* Escala de 0.95 para 1 */
```

## 🧩 Componentes Utilitários

### Glass Card
```css
glass-card             /* Card com efeito glassmorphism */
```

### Botões
```css
btn-primary            /* Botão azul com gradiente */
btn-secondary          /* Botão roxo com gradiente */
btn-accent             /* Botão verde com gradiente */
```

### Sidebar
```css
sidebar-item           /* Item da sidebar */
sidebar-item.active    /* Item ativo da sidebar */
```

## 🎭 Componentes Principais

### Sidebar
- **Colapsável** por ícone
- **Animações suaves** de entrada/saída
- **Responsiva** para mobile
- **Context API** para estado global

### Header
- **SidebarTrigger** para mobile
- **Barra de pesquisa** integrada
- **Notificações** com indicador
- **Perfil do usuário** com avatar

### AppLayout
- **Layout responsivo** com sidebar
- **Animações de transição** suaves
- **Adaptação automática** ao estado da sidebar

## 📱 Responsividade

### Breakpoints
```css
xs: 0px      /* Mobile pequeno */
sm: 640px    /* Mobile grande */
md: 768px    /* Tablet */
lg: 1024px   /* Desktop pequeno */
xl: 1280px   /* Desktop grande */
```

### Sidebar
- **Desktop**: Sempre visível, colapsável
- **Mobile**: Ocultada por padrão, acionada por trigger

## 🎨 Uso das Classes

### Exemplo de Card
```tsx
<motion.div className="glass-card p-6 card-hover">
  <h3 className="text-lg font-semibold text-neutral-900">
    Título do Card
  </h3>
  <p className="text-neutral-600">
    Conteúdo do card com efeito glassmorphism
  </p>
</motion.div>
```

### Exemplo de Botão
```tsx
<button className="btn-primary">
  Ação Principal
</button>

<button className="btn-secondary">
  Ação Secundária
</button>
```

### Exemplo de Animações
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
  className="animate-float"
>
  Elemento flutuante
</motion.div>
```

## 🔧 Configuração

### Tailwind Config
- **Cores HSL personalizadas**
- **Gradientes customizados**
- **Animações personalizadas**
- **Plugins**: forms, typography

### PostCSS
- **Autoprefixer** para compatibilidade
- **Tailwind CSS** como plugin principal

### Fonte
- **Plus Jakarta Sans** importada via @fontsource
- **Pesos**: 300, 400, 500, 600, 700, 800

## 🚀 Próximos Passos

1. **Implementar** componentes para outras páginas
2. **Adicionar** mais variações de gradientes
3. **Criar** sistema de temas (claro/escuro)
4. **Desenvolver** mais componentes utilitários
5. **Otimizar** animações para performance

## 📚 Recursos

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
- [HSL Color Picker](https://hslpicker.com/)
