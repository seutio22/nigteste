// Configuração da API - Railway para funcionamento
export const API_CONFIG = {
  BASE_URL: 'https://nigteste-production.up.railway.app',
  TIMEOUT: 10000
};

// Função para obter a URL base - Railway para funcionamento
export function getBaseUrl(): string {
  // Usa Railway para funcionamento
  return API_CONFIG.BASE_URL;
}

// Debug da configuração
console.log('🔧 API Config Debug - CACHE BUST 2025-01-30:');
console.log('  - VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('  - BASE_URL forçada:', API_CONFIG.BASE_URL);
console.log('  - URL final (FORÇADA):', getBaseUrl());
