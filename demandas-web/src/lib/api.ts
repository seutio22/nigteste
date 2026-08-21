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

    // Adicionar token de auth (preferir Zustand; fallback localStorage)
    let token: string | null = null;
    let userId: string | null = null;
    let userRole: string | null = null;
    try {
      // Preferir o store em memória
      const store = await import('../store/authStore');
      try {
        const st = store.useAuthStore.getState();
        token = st.token || null;
        userId = st.user?.id || null;
        userRole = (st.user as any)?.role || null;
      } catch {}
      // Fallback para localStorage se necessário
      if (!token || !userId || !userRole) {
        const authStore = localStorage.getItem('auth-store');
        if (authStore) {
          const parsed = JSON.parse(authStore);
          token = token || (parsed?.state?.token || null);
          userId = userId || (parsed?.state?.user?.id || null);
          userRole = userRole || (parsed?.state?.user?.role || null);
        }
      }
    } catch (e) {
      console.error('❌ API: Erro ao obter credenciais do auth-store:', e);
    }

    const { isPublicApiPath } = await import('./authSession')
    if (!isPublicApiPath(endpoint) && !(token && String(token).trim().length > 10)) {
      const { handleUnauthorizedOnce } = await import('./handleUnauthorized')
      handleUnauthorizedOnce(url)
      const errorData: ApiError = {
        message: 'Sessão expirada ou não autenticado',
        status: 401,
        data: null,
      }
      throw errorData
    }
    
    const headers: Record<string, string> = { ...(config.headers as Record<string, string>) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userId) headers['x-user-id'] = userId;
    if (userRole) headers['x-user-role'] = userRole;
    config.headers = headers;

    // Log para depuração de projetos privados
    if (endpoint.includes('/projetos/')) {
      console.log('📤 API Request - Headers enviados:', {
        'x-user-id': headers['x-user-id'] || 'não definido',
        'x-user-role': headers['x-user-role'] || 'não definido',
        'Authorization': headers['Authorization'] ? 'Bearer ***' : 'não definido',
        endpoint
      })
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          const { handleUnauthorizedOnce } = await import('./handleUnauthorized')
          handleUnauthorizedOnce(url)
        }
        
        // Tentar ler a mensagem de erro do corpo da resposta
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorDetails = null;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorBody = await response.json();
            errorDetails = errorBody;
            
            // Extrair mensagem de erro (pode vir em diferentes formatos)
            if (errorBody.message) {
              errorMessage = errorBody.message;
            } else if (errorBody.error) {
              errorMessage = typeof errorBody.error === 'string' ? errorBody.error : errorMessage;
            }
          }
        } catch (e) {
          // Se não conseguir parsear o erro, usar mensagem padrão
          console.warn('⚠️ Não foi possível parsear o corpo do erro:', e);
        }
        
        const errorData: ApiError = {
          message: errorMessage,
          status: response.status,
          data: errorDetails
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


