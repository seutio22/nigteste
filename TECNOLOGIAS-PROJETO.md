# 🚀 Tecnologias Utilizadas - Sistema de Demandas v0.5.8

## 📋 Sumário
- [Linguagens de Programação](#linguagens-de-programação)
- [Frontend](#frontend)
- [Backend](#backend)
- [Banco de Dados](#banco-de-dados)
- [Deploy e Infraestrutura](#deploy-e-infraestrutura)
- [Bibliotecas e Frameworks Principais](#bibliotecas-e-frameworks-principais)

---

## 💻 Linguagens de Programação

### **TypeScript** (Principal)
- **Versão:** 5.5.4 (Frontend) / 5.9.2 (Backend)
- **Uso:** 100% do projeto (Frontend + Backend)
- **Benefícios:**
  - Tipagem estática
  - Melhor autocompletar e detecção de erros
  - Código mais robusto e manutenível

### **JavaScript** (Gerado)
- Código final compilado para produção
- Scripts de setup e utilitários

---

## 🎨 Frontend (`demandas-web`)

### **Framework Base**
- **React 18.3.1**
  - Biblioteca JavaScript para interfaces de usuário
  - Hooks modernos (useState, useEffect, useMemo, useCallback)
  - Functional Components

### **Build Tool**
- **Vite 5.4.2**
  - Build ultra-rápido
  - Hot Module Replacement (HMR)
  - Otimização de bundle automática

### **Roteamento**
- **React Router DOM 6.26.2**
  - Navegação entre páginas (SPA)
  - Rotas protegidas
  - Parâmetros dinâmicos

### **Gerenciamento de Estado**
- **Zustand 4.5.2**
  - State management simples e eficiente
  - Stores: authStore, demandStore, maillingStore, masterDataStore, etc.
  - Persistência em localStorage

### **UI Framework**
- **Material-UI (MUI) 5.15.20**
  - Componentes React prontos
  - Design system completo
  - Temas customizáveis
- **Pacotes MUI:**
  - `@mui/material` - Componentes base
  - `@mui/icons-material` - Ícones
  - `@mui/lab` - Componentes experimentais
  - `@mui/x-data-grid` - Tabelas avançadas

### **Estilização**
- **Tailwind CSS 3.4.0**
  - Utility-first CSS
  - Responsivo
  - Customização via classes
- **Emotion**
  - CSS-in-JS
  - Usado pelo MUI
  - Estilização dinâmica

### **Animações**
- **Framer Motion 12.23.12**
  - Animações fluidas
  - Transições de página
  - Gestos e interações

### **Formulários**
- **React Hook Form 7.53.0**
  - Performance otimizada
  - Validação integrada
  - Menor re-renderizações
- **Validação:**
  - Yup 1.7.0
  - Zod 3.23.8
  - @hookform/resolvers 3.9.0

### **Requisições HTTP**
- **TanStack React Query 5.51.1**
  - Cache inteligente
  - Sincronização automática
  - Loading/Error states
- **Fetch API nativa**
  - Requisições REST
  - Integração com backend

### **Manipulação de Dados**
- **date-fns 3.6.0** - Datas
- **xlsx 0.18.5** - Excel (import/export)
- **file-saver 2.0.5** - Download de arquivos

### **Editor de Texto Rico**
- **React Quill 2.0.0**
  - Editor WYSIWYG
  - Formatação de texto
  - Imagens e links

### **Gráficos**
- **Recharts 2.15.4**
  - Gráficos responsivos
  - Dashboard analytics
  - Visualização de dados

### **Drag & Drop**
- **React Beautiful DnD 13.1.1**
  - Kanban board
  - Reordenação de itens
  - Interface intuitiva

### **PDF**
- **jsPDF 3.0.1**
  - Geração de PDFs
  - Relatórios exportáveis
- **jspdf-autotable 5.0.2**
  - Tabelas em PDF

### **Ícones**
- **Lucide React 0.539.0**
  - Ícones modernos e leves
  - Customizáveis

### **Internacionalização**
- **i18next 23.11.5**
- **react-i18next 15.2.0**
  - Suporte multi-idioma
  - Traduções dinâmicas

### **Fontes**
- **Plus Jakarta Sans**
  - Fonte moderna
  - Carregada via @fontsource

---

## ⚙️ Backend (`demandas-api`)

### **Framework**
- **Fastify 5.4.0**
  - Framework Node.js ultra-rápido
  - Baixa overhead
  - Schema validation
  - Plugins ecosystem

### **Runtime**
- **Node.js**
  - Ambiente JavaScript server-side
  - Event-driven, non-blocking

### **ORM (Object-Relational Mapping)**
- **Prisma 6.13.0**
  - ORM moderno
  - Type-safe database client
  - Migrations automáticas
  - Schema-first approach
- **@prisma/client 6.16.3**

### **Autenticação**
- **@fastify/jwt 9.1.0**
  - JSON Web Tokens
  - Autenticação stateless
- **jsonwebtoken 9.0.2**
  - Geração de tokens
- **bcryptjs 3.0.2**
  - Hash de senhas
  - Segurança

### **CORS**
- **@fastify/cors 11.1.0**
  - Controle de acesso cross-origin
  - Configuração de headers

### **Validação**
- **Zod 4.0.16**
  - Schema validation
  - Type inference
  - Error handling

### **Database Driver**
- **pg 8.11.3**
  - PostgreSQL client
  - Connection pooling

### **Desenvolvimento**
- **ts-node-dev 2.0.0**
  - Hot reload
  - Desenvolvimento rápido
- **ts-node 10.9.2**
  - Executar TypeScript diretamente

---

## 🗄️ Banco de Dados

### **PostgreSQL**
- **Provider:** Railway (Cloud)
- **Características:**
  - Banco relacional robusto
  - ACID compliant
  - Suporte a JSON
  - Performance escalável
  - Backup diário automático (Railway Pro)

### **Modelos Principais:**
- User (Usuários)
- Demanda (Demandas)
- Manutencao (Manutenções)
- Atendimento (Atendimentos)
- Comunicado (Comunicados)
- Reajuste (Reajustes)
- Validation (Validações)
- Report (Analytics)
- Mailling (Contatos Mailing)
- Project (Projetos)
- Area, Analista, Cliente (Master Data)
- + Diversos modelos de suporte

---

## 🌐 Deploy e Infraestrutura

### **Frontend Hosting**
- **Vercel**
  - Deploy automático via Git push
  - CDN global
  - Preview deployments
  - SSL automático
  - Rollback instantâneo

### **Backend Hosting**
- **Railway**
  - Deploy automático via Git push
  - PostgreSQL integrado
  - Logs em tempo real
  - Escalabilidade automática
  - Backup diário (Pro Plan)

### **Controle de Versão**
- **Git + GitHub**
  - Versionamento
  - Colaboração
  - CI/CD integrado

### **Monitoramento (Opcional)**
- **Grafana**
  - Dashboard de métricas
  - Visualização de logs
  - Alertas (configurável)

---

## 📦 Bibliotecas e Frameworks Principais

### **Categorias de Dependências:**

#### **UI/UX:**
- Material-UI (Design System)
- Tailwind CSS (Estilos)
- Framer Motion (Animações)
- Lucide React (Ícones)

#### **Estado e Dados:**
- Zustand (State Management)
- TanStack Query (Server State)
- React Hook Form (Formulários)

#### **Validação:**
- Yup
- Zod
- @hookform/resolvers

#### **Visualização:**
- Recharts (Gráficos)
- React Beautiful DnD (Drag & Drop)
- React Quill (Editor Rico)

#### **Exportação:**
- xlsx (Excel)
- jsPDF (PDF)
- file-saver (Downloads)

#### **Datas:**
- date-fns (Manipulação de datas)

#### **Navegação:**
- React Router DOM

#### **Backend:**
- Fastify (Framework)
- Prisma (ORM)
- JWT (Autenticação)
- bcryptjs (Segurança)

---

## 📊 Estrutura do Projeto

```
nigteste/
├── demandas-web/          # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas do sistema
│   │   ├── store/         # Zustand stores
│   │   ├── hooks/         # Custom hooks
│   │   ├── types/         # Tipos TypeScript
│   │   ├── lib/           # Utilitários
│   │   └── config/        # Configurações
│   ├── public/            # Assets estáticos
│   └── package.json
│
├── demandas-api/          # Backend (Fastify + TypeScript)
│   ├── src/
│   │   └── server.ts      # Servidor principal
│   ├── prisma/
│   │   └── schema.prisma  # Schema do banco
│   └── package.json
│
└── prisma/                # Schema compartilhado (legacy)
```

---

## 🔐 Segurança

- **Autenticação JWT**
- **Hash de senhas com bcryptjs**
- **CORS configurado**
- **Validação de entrada (Zod)**
- **HTTPS (Vercel + Railway)**
- **Variáveis de ambiente (.env)**
- **Timeout automático de sessão**
- **Proteção de rotas**

---

## 🎯 Principais Funcionalidades Técnicas

### **Frontend:**
- ✅ SPA (Single Page Application)
- ✅ Responsive Design
- ✅ Dark/Light Mode (implementável)
- ✅ Offline-first (localStorage)
- ✅ Smart Import (Excel)
- ✅ Export (Excel/PDF)
- ✅ Real-time updates
- ✅ Filtros avançados
- ✅ Drag & Drop (Kanban)
- ✅ Editor rico de texto
- ✅ Gráficos interativos
- ✅ Notificações
- ✅ Multi-seleção
- ✅ Paginação

### **Backend:**
- ✅ RESTful API
- ✅ CRUD completo
- ✅ Autenticação JWT
- ✅ Validação de schemas
- ✅ Relacionamentos complexos
- ✅ Soft delete
- ✅ Timestamps automáticos
- ✅ Logs estruturados
- ✅ Error handling
- ✅ CORS configurado

---

## 📈 Versão Atual

**Frontend:** v0.5.8  
**Backend:** v2.4.1  
**Última atualização:** 14/10/2025

---

## 🚀 Performance

- **Build Otimizado:** Code splitting, tree shaking
- **Cache:** React Query + localStorage
- **CDN:** Vercel Edge Network
- **Lazy Loading:** Componentes sob demanda
- **Bundle Size:** ~780KB (gzipped)
- **First Paint:** < 2s
- **API Response:** < 200ms

---

## 🛠️ Ferramentas de Desenvolvimento

- **VS Code** (IDE recomendada)
- **Cursor** (AI Code Assistant)
- **Git** (Versionamento)
- **Node.js** (Runtime)
- **npm** (Gerenciador de pacotes)
- **TypeScript** (Type checking)
- **Vite** (Dev server + Build)
- **Prisma Studio** (Database GUI)

---

## 📝 Comandos Úteis

### **Frontend:**
```bash
cd demandas-web
npm install          # Instalar dependências
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run preview      # Preview build
npm run type-check   # Verificar tipos
```

### **Backend:**
```bash
cd demandas-api
npm install              # Instalar dependências
npm run dev              # Desenvolvimento
npm run build            # Build produção
npm start                # Produção
npm run db:push          # Sync schema
npm run db:generate      # Gerar Prisma Client
```

---

## 🔄 Fluxo de Deploy

1. **Desenvolvedor** → Commit + Push (GitHub)
2. **GitHub** → Webhook (Vercel + Railway)
3. **Vercel** → Build Frontend → Deploy CDN
4. **Railway** → Build Backend → Deploy Server
5. **Sistema** → Online em ~2-3 minutos

---

## 📚 Documentação Oficial

- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
- [Material-UI](https://mui.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Fastify](https://fastify.dev)
- [Prisma](https://www.prisma.io)
- [PostgreSQL](https://www.postgresql.org)
- [Vercel](https://vercel.com/docs)
- [Railway](https://docs.railway.app)
- [Zustand](https://zustand-demo.pmnd.rs)
- [TanStack Query](https://tanstack.com/query)

---

## 💡 Por que essas tecnologias?

### **React + TypeScript:**
- Componentes reutilizáveis
- Type safety
- Ecossistema maduro
- Grande comunidade

### **Fastify:**
- Performance superior
- Baixa latência
- Schema validation nativa
- Plugins robustos

### **Prisma:**
- Type-safe queries
- Migrations automáticas
- Desenvolvimento ágil
- Melhor DX (Developer Experience)

### **PostgreSQL:**
- Confiabilidade
- Performance
- Recursos avançados
- Backup robusto

### **Vercel + Railway:**
- Deploy automático
- Zero config
- Escalabilidade
- Monitoramento integrado

---

**Sistema desenvolvido com tecnologias modernas e best practices! 🚀**

