// Force cache bust - versão 2025-01-30
export const CACHE_BUST_VERSION = '2025-01-30-v4';

// Importar sistema inteligente de limpeza
import { smartCacheCleaner, forceSmartCleanup, getCleanupStats, isSystemClean } from './smart-cache-cleaner';

// Função para forçar limpeza do cache (compatibilidade)
export function forceCacheBust() {
  console.log('🔄 Usando sistema inteligente de limpeza...');
  return forceSmartCleanup();
}

// Funções de utilidade para debugging
export const getCacheStats = getCleanupStats;
export const checkSystemClean = isSystemClean;

// Executar limpeza automática inteligente
if (typeof window !== 'undefined') {
  console.log('🧠 Sistema inteligente de limpeza de cache ativado');
  console.log('📊 Versão atual:', CACHE_BUST_VERSION);
  
  // O sistema inteligente já executa automaticamente
  // Apenas logar informações
  setTimeout(() => {
    const stats = getCleanupStats();
    console.log('📈 Estatísticas de limpeza:', stats);
  }, 2000);
}
