import { useState, useEffect, useCallback } from 'react';
import { 
  smartCacheCleaner, 
  forceSmartCleanup, 
  getCleanupStats, 
  isSystemClean 
} from '../utils/smart-cache-cleaner';

interface UseSmartCacheReturn {
  stats: any;
  isClean: boolean;
  isLoading: boolean;
  forceCleanup: () => Promise<void>;
  refreshStats: () => void;
}

/**
 * Hook personalizado para gerenciar o sistema inteligente de cache
 */
export const useSmartCache = (): UseSmartCacheReturn => {
  const [stats, setStats] = useState<any>(null);
  const [isClean, setIsClean] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshStats = useCallback(() => {
    try {
      const cleanupStats = getCleanupStats();
      const systemClean = isSystemClean();
      
      setStats(cleanupStats);
      setIsClean(systemClean);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de cache:', error);
    }
  }, []);

  const forceCleanup = useCallback(async () => {
    setIsLoading(true);
    try {
      await forceSmartCleanup();
      refreshStats();
    } catch (error) {
      console.error('Erro ao forçar limpeza:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshStats]);

  useEffect(() => {
    refreshStats();
    
    // Atualizar estatísticas a cada 30 segundos
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    isClean,
    isLoading,
    forceCleanup,
    refreshStats
  };
};

export default useSmartCache;
