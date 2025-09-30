// Configuração da API - Força URL do Railway
export const API_CONFIG = {
  BASE_URL: 'https://nigteste-production.up.railway.app',
  TIMEOUT: 10000
};

// Função para obter a URL base - SEMPRE usa Railway
export function getBaseUrl(): string {
  // SEMPRE usa a URL do Railway, ignorando variáveis de ambiente
  return API_CONFIG.BASE_URL;
}

// Debug da configuração
console.log('🔧 API Config Debug - CACHE BUST 2025-01-30:');
console.log('  - VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('  - BASE_URL forçada:', API_CONFIG.BASE_URL);
console.log('  - URL final (FORÇADA):', getBaseUrl());
