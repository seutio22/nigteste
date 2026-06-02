// Force cache bust - versão 2025-01-30
export const CACHE_BUST_VERSION = '2025-01-30-v4';

// Importar sistema inteligente de limpeza
import { smartCacheCleaner, forceSmartCleanup, getCleanupStats, isSystemClean } from './smart-cache-cleaner';

import { logDev } from './logger';

// Função para forçar limpeza do cache (compatibilidade)
export function forceCacheBust() {
  logDev('🔄 Usando sistema inteligente de limpeza...');
  return forceSmartCleanup();
}

// Funções de utilidade para debugging
export const getCacheStats = getCleanupStats;
export const checkSystemClean = isSystemClean;

// Executar limpeza automática inteligente
if (typeof window !== 'undefined') {
  logDev('🧠 Sistema inteligente de limpeza de cache ativado');
  logDev('📊 Versão atual:', CACHE_BUST_VERSION);

  setTimeout(() => {
    const stats = getCleanupStats();
    logDev('📈 Estatísticas de limpeza:', stats);
  }, 2000);
}
