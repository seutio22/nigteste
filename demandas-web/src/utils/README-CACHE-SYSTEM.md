# 🧠 Sistema Inteligente de Limpeza de Cache

## Visão Geral

O Sistema Inteligente de Limpeza de Cache é uma solução robusta que limpa automaticamente cookies, localStorage e sessionStorage diariamente, removendo versões anteriores do sistema e dados obsoletos.

## Funcionalidades

### ✅ Limpeza Automática Diária
- Executa limpeza automaticamente uma vez por dia
- Detecta mudanças de versão do sistema
- Preserva dados essenciais do usuário

### 🎯 Limpeza Inteligente
- Remove apenas dados do sistema (stores, configurações)
- Preserva preferências do usuário (tema, idioma, notificações)
- Identifica padrões de chaves do sistema automaticamente

### 📊 Monitoramento e Estatísticas
- Logs detalhados de todas as operações
- Estatísticas de limpeza (itens removidos, preservados)
- Verificação de status do sistema

## Como Usar

### 1. Uso Automático
O sistema é executado automaticamente quando a aplicação carrega:

```typescript
// Já incluído no App.tsx
import './utils/smart-cache-cleaner';
```

### 2. Uso Manual com Hook
```typescript
import { useSmartCache } from '../hooks/useSmartCache';

function MyComponent() {
  const { stats, isClean, isLoading, forceCleanup } = useSmartCache();
  
  return (
    <div>
      <p>Sistema limpo: {isClean ? 'Sim' : 'Não'}</p>
      <button onClick={forceCleanup} disabled={isLoading}>
        Forçar Limpeza
      </button>
    </div>
  );
}
```

### 3. Uso Direto da API
```typescript
import { 
  smartCacheCleaner, 
  forceSmartCleanup, 
  getCleanupStats, 
  isSystemClean 
} from '../utils/smart-cache-cleaner';

// Forçar limpeza imediata
await forceSmartCleanup();

// Verificar se o sistema está limpo
const clean = isSystemClean();

// Obter estatísticas
const stats = getCleanupStats();
```

### 4. Componente de Monitoramento
```typescript
import CacheMonitor from '../components/CacheMonitor';

// Monitor compacto
<CacheMonitor compact />

// Monitor completo com detalhes
<CacheMonitor showDetails />
```

## Configuração

### Chaves Preservadas
```typescript
const PRESERVED_KEYS = [
  'user-preferences',
  'theme-settings', 
  'language-settings',
  'notifications-enabled'
];
```

### Padrões de Chaves do Sistema
```typescript
const SYSTEM_KEY_PATTERNS = [
  'auth-store',
  'demands-v',
  'validations-v',
  'manutencoes-v',
  'atendimentos-v',
  'comunicados-v',
  'mailling-v',
  'master-data-store',
  'kanban-store-v',
  'tickets-v',
  'reports-v',
  'timeline-store-v',
  'notifications-store-v',
  'dashboard-v',
  'project-',
  'reajuste-',
  'analytics-'
];
```

## Estrutura de Dados

### CleanupStats
```typescript
interface CleanupStats {
  localStorageRemoved: number;    // Itens removidos do localStorage
  sessionStorageRemoved: number;  // Itens removidos do sessionStorage
  cookiesRemoved: number;         // Cookies removidos
  preservedKeys: number;          // Chaves preservadas
  totalCleaned: number;           // Total de itens limpos
  lastCleanup: string;            // Data da última limpeza
  version: string;                // Versão do sistema
}
```

## Logs e Debugging

### Console Logs
O sistema gera logs detalhados no console:

```
🧠 Sistema inteligente de limpeza de cache ativado
📊 Versão atual: 2025-01-30-v4
🔄 Iniciando limpeza inteligente de cache...
🗑️ Removido do localStorage: auth-store
🗑️ Removido do localStorage: demands-v1
🗑️ SessionStorage limpo: 5 itens removidos
🗑️ Cookie removido: session-token
✅ Limpeza inteligente concluída: {...}
```

### Verificação de Status
```typescript
// Verificar se o sistema está limpo
const clean = isSystemClean();

// Obter estatísticas detalhadas
const stats = getCleanupStats();
console.log('Estatísticas:', stats);
```

## Benefícios

### 🚀 Performance
- Remove dados obsoletos automaticamente
- Reduz tamanho do localStorage
- Melhora performance da aplicação

### 🔒 Segurança
- Remove dados sensíveis de versões antigas
- Limpa tokens e sessões expiradas
- Previne vazamento de dados

### 🧹 Manutenção
- Limpeza automática sem intervenção manual
- Preserva configurações importantes do usuário
- Sistema auto-gerenciado

## Troubleshooting

### Problema: Sistema não está limpando
**Solução:** Verificar se a versão mudou e forçar limpeza:
```typescript
await forceSmartCleanup();
```

### Problema: Dados importantes foram removidos
**Solução:** Adicionar chave à lista de preservadas:
```typescript
const PRESERVED_KEYS = [
  'user-preferences',
  'theme-settings',
  'language-settings',
  'notifications-enabled',
  'sua-chave-importante' // Adicionar aqui
];
```

### Problema: Logs não aparecem
**Solução:** Verificar se o console está habilitado e se há erros JavaScript.

## Versões

- **v1.0.0** - Sistema básico de limpeza
- **v2.0.0** - Adicionado sistema inteligente
- **v3.0.0** - Adicionado monitoramento e estatísticas
- **v4.0.0** - Sistema completo com hooks e componentes
