// Configuração da API — em dev usa proxy Vite (/api) ou VITE_API_URL
const PRODUCTION_API = 'https://nigteste-production.up.railway.app'

function resolveApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv
  if (import.meta.env.DEV) return '/api'
  return PRODUCTION_API
}

export const API_CONFIG = {
  BASE_URL: resolveApiBaseUrl(),
  TIMEOUT: 10000,
};

if (import.meta.env.DEV) {
  console.info('[Nexus] API local:', API_CONFIG.BASE_URL)
}

// Função para obter a URL base
export function getBaseUrl(): string {
  return API_CONFIG.BASE_URL;
}
