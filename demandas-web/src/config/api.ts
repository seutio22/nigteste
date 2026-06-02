// Configuração da API - Railway para funcionamento
export const API_CONFIG = {
  BASE_URL: 'https://nigteste-production.up.railway.app',
  TIMEOUT: 10000
};

// Função para obter a URL base - Railway para funcionamento
export function getBaseUrl(): string {
  return API_CONFIG.BASE_URL;
}
