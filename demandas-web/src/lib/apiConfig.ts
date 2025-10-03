// Import estático da API de produção para evitar problemas de build
import { api } from './api'

// Função para obter a API (sempre produção no build)
export function getApi() {
  return api;
}
