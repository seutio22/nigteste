// Configuração da API - Força URL do Railway
export const API_CONFIG = {
  BASE_URL: 'https://nigteste-production.up.railway.app',
  TIMEOUT: 10000
};

// Função para obter a URL base
export function getBaseUrl(): string {
  // Prioridade: variável de ambiente > URL forçada > localhost
  return import.meta.env.VITE_API_URL || API_CONFIG.BASE_URL || 'http://localhost:3333';
}

// Debug da configuração
console.log('🔧 API Config Debug:');
console.log('  - VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('  - BASE_URL forçada:', API_CONFIG.BASE_URL);
console.log('  - URL final:', getBaseUrl());
