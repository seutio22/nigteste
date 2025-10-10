// API utility functions
import { ApiRequestOptions, ApiResponse, ApiError, LoginCredentials, LoginResponse, UserData, CreateUserData, UpdateUserData } from '../types/api'
import { getBaseUrl } from '../config/api'

const BASE_URL = getBaseUrl(); // URL configurável por ambiente - CACHE BUST 2025-01-30

export const api = {
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available - ler do Zustand store
    let token: string | null = null;
    try {
      const authStore = localStorage.getItem('auth-store');
      console.log('🔍 API: Verificando auth-store no localStorage...')
      
      if (!authStore) {
        console.warn('⚠️ API: auth-store NÃO encontrado no localStorage')
      } else {
        const parsed = JSON.parse(authStore);
        token = parsed?.state?.token || null;
        
        if (!token) {
          console.warn('⚠️ API: Token NÃO encontrado no auth-store')
        } else {
          console.log('✅ API: Token encontrado:', token.substring(0, 20) + '...')
        }
      }
    } catch (e) {
      console.error('❌ API: Erro ao ler token do auth-store:', e);
    }
    
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
      console.log('✅ API: Token adicionado ao header Authorization')
    } else {
      console.warn('⚠️ API: Requisição será enviada SEM token de autenticação')
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Interceptor para erro 401 (Token expirado/inválido)
        if (response.status === 401) {
          console.error('🔒 ========================================');
          console.error('🔒 ERRO 401 DETECTADO!');
          console.error('🔒 URL que falhou:', url);
          console.error('🔒 Método:', config.method);
          console.error('🔒 Headers:', config.headers);
          console.error('🔒 ========================================');
          console.warn('🔒 Token expirado ou inválido - fazendo logout automático em 5 segundos...');
          
          // Aguardar 5 segundos para dar tempo de ver os logs
          setTimeout(() => {
            // Importar dinamicamente para evitar dependência circular
            import('../store/authStore').then(({ useAuthStore }) => {
              // O logout já limpa todos os dados automaticamente
              useAuthStore.getState().logout();
              // Redirecionar para login após logout
              window.location.href = '/login';
            });
          }, 5000);
        }
        
        const errorData: ApiError = {
          message: `HTTP error! status: ${response.status}`,
          status: response.status,
        };
        throw errorData;
      }
      
      // Se for status 204 (No Content), retornar null ao invés de tentar parse JSON
      if (response.status === 204) {
        return null as T;
      }
      
      // Verificar se há conteúdo antes de fazer parse
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      // Se não for JSON, retornar null
      return null as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // GET request
  get: <T = any>(endpoint: string): Promise<T> => api.request<T>(endpoint),

  // POST request
  post: <T = any>(endpoint: string, data: unknown): Promise<T> => api.request<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // PUT request
  put: <T = any>(endpoint: string, data: unknown): Promise<T> => api.request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // DELETE request
  delete: <T = any>(endpoint: string): Promise<T> => api.request<T>(endpoint, {
    method: 'DELETE',
  }),

  // Métodos específicos
  login: (credentials: LoginCredentials): Promise<LoginResponse> => 
    api.post<LoginResponse>('/auth/login', credentials),

  getUsers: (): Promise<UserData[]> => 
    api.get<UserData[]>('/users'),

  createUser: (userData: CreateUserData): Promise<UserData> => 
    api.post<UserData>('/users', userData),

  updateUser: (id: string, userData: UpdateUserData): Promise<UserData> => 
    api.put<UserData>(`/users/${id}`, userData),

  deleteUser: (id: string): Promise<void> => 
    api.delete<void>(`/users/${id}`),

  // Dados mestres
  getAreas: (): Promise<any[]> => 
    api.get<any[]>('/areas'),
  getAnalistas: (): Promise<any[]> => 
    api.get<any[]>('/analistas'),
  getOperadoras: (): Promise<any[]> => 
    api.get<any[]>('/operadoras'),
  getProdutos: (): Promise<any[]> => 
    api.get<any[]>('/produtos'),
  getSistemas: (): Promise<any[]> => 
    api.get<any[]>('/sistemas'),
  getClientes: (): Promise<any[]> => 
    api.get<any[]>('/clientes'),
  getContratos: (): Promise<any[]> => 
    api.get<any[]>('/contratos'),
  getTiposDemanda: (): Promise<any[]> => 
    api.get<any[]>('/tiposDemanda'),
  getTiposServico: (): Promise<any[]> => 
    api.get<any[]>('/tiposServico'),
  getPadrao: (): Promise<any[]> => 
    api.get<any[]>('/padrao'),

  // Limpeza de dados
  // limparDuplicatasClientes removido - função de limpeza de duplicatas removida
  limparDemandasSimples: (): Promise<any> => 
    api.delete<any>('/demandas/limpar-atv-demandas'),
  limparContratosOrfaos: (): Promise<any> => 
    api.delete<any>('/contratos/limpar-orfaos'),
};

export function endpoint(resource: string) {
  return `/${resource}`
}


