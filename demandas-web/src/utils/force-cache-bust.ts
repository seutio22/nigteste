// Force cache bust - versão 2025-01-30
export const CACHE_BUST_VERSION = '2025-01-30-v3';

// Função para forçar limpeza do cache
export function forceCacheBust() {
  // Limpar localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('auth') || key.includes('store')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Limpar sessionStorage
  sessionStorage.clear();
  
  console.log('🧹 Cache limpo forçadamente - versão:', CACHE_BUST_VERSION);
}

// Executar limpeza automática
if (typeof window !== 'undefined') {
  forceCacheBust();
}
