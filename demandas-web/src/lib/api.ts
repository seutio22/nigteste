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

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Interceptor para erro 401 (Token expirado/inválido)
        if (response.status === 401) {
          console.warn('🔒 Token expirado ou inválido - fazendo logout automático');
          
          // Importar dinamicamente para evitar dependência circular
          import('../store/authStore').then(({ useAuthStore }) => {
            useAuthStore.getState().logout();
            // Redirecionar para login após logout
            window.location.href = '/login';
          });
        }
        
        const errorData: ApiError = {
          message: `HTTP error! status: ${response.status}`,
          status: response.status,
        };
        throw errorData;
      }
      
      return await response.json();
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
  limparDuplicatasClientes: (): Promise<any> => 
    api.delete<any>('/limpeza/clientes-duplicatas'),
  limparDemandasSimples: (): Promise<any> => 
    api.delete<any>('/demandas/limpar-atv-demandas'),
  limparContratosOrfaos: (): Promise<any> => 
    api.delete<any>('/contratos/limpar-orfaos'),
};

export function endpoint(resource: string) {
  return `/${resource}`
}


