// Configuração de API para desenvolvimento local
import { useAuthStore } from '../store/authStore'
import { getBaseUrl } from '../config/api'
import { rewritePlacementShareEndpoint } from './placementShareSession'
import { hasAuthToken, isPublicApiPath } from './authSession'

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 10000,
  ENDPOINTS: {
    AUTH: '/auth',
    USERS: '/users',
    AREAS: '/areas',
    ANALISTAS: '/analistas',
    OPERADORAS: '/operadoras',
    PRODUTOS: '/produtos',
    SISTEMAS: '/sistemas',
    CLIENTES: '/clientes',
    CONTRATOS: '/contratos',
    TIPOS_SERVICO: '/tiposServico',
    TIPOS_DEMANDA: '/tiposDemanda',
    DEMANDAS: '/demandas',
    PADRAO: '/padrao',
    VALIDACOES: '/validacoes',
    REAJUSTES: '/reajustes',
    MAILLING: '/mailling',
    COMUNICADOS: '/comunicados',
    PROJECTS: '/projetos',
    ANALYTICS: '/analytics',
    HEALTH: '/health'
  }
}

/** Mensagem legível a partir do corpo JSON/texto de erros da API (ex.: 409 Conflict). */
export function messageFromApiErrorBody(status: number, errorText: string): string {
  const raw = (errorText || '').trim()
  if (raw) {
    try {
      const j = JSON.parse(raw) as { message?: unknown; error?: unknown }
      const msg = typeof j.message === 'string' && j.message.trim() ? j.message.trim() : ''
      if (msg) return msg
      const err = typeof j.error === 'string' && j.error.trim() ? j.error.trim() : ''
      if (err) return err
    } catch {
      /* não é JSON */
    }
    return raw.length > 800 ? `${raw.slice(0, 800)}…` : raw
  }
  return `HTTP error! status: ${status}`
}

// Debug removido para limpeza do console

// Função para fazer requisições HTTP
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase()
  const resolved = rewritePlacementShareEndpoint(endpoint, method)
  if (typeof resolved === 'object' && resolved.localNoop) {
    // Modo share: mutações ficam só no React. Nunca devolver o body do PUT como se fosse a cotação
    // (toFormState nisso apaga planos/itens e o fornecedor ATUAL some do comparativo).
    return { __placementShareLocalNoop: true } as T
  }
  const url = `${API_CONFIG.BASE_URL}${resolved}`
  
  // Obter credenciais de autenticação do store
  const authState = useAuthStore.getState()
  const token = authState.token
  const userId = authState.user?.id || null
  const userRole = (authState.user as any)?.role || null

  // Sem sessão: não dispara fetch (evita 401 no Network/console). Rotas públicas ok.
  if (!isPublicApiPath(String(resolved)) && !hasAuthToken()) {
    const { handleUnauthorizedOnce } = await import('./handleUnauthorized')
    handleUnauthorizedOnce(url)
    const err = new Error('Sessão expirada ou não autenticado')
    ;(err as any).status = 401
    ;(err as any).silent = true
    throw err
  }
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(userId && { 'x-user-id': userId }),
      ...(userRole && { 'x-user-role': userRole }),
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)

    // 401 em login/troca de senha = credenciais inválidas (não é sessão expirada)
    if (response.status === 401 && isPublicApiPath(String(resolved))) {
      const errorText = await response.text()
      const error = new Error(messageFromApiErrorBody(response.status, errorText) || 'Credenciais inválidas')
      ;(error as any).responseText = errorText
      ;(error as any).status = 401
      throw error
    }

    if (response.status === 401) {
      const { handleUnauthorizedOnce } = await import('./handleUnauthorized')
      handleUnauthorizedOnce(url)
      throw new Error('Sessão expirada ou não autenticado')
    }
    
    // Para métodos DELETE, aceitar qualquer status HTTP 200+ e deixar o frontend interpretar
    if (options.method === 'DELETE') {
      if (response.ok) {
        // Se a resposta for OK, tentar fazer parse do JSON
        try {
          const data = await response.json()
          return data
        } catch (jsonError) {
          // Se não conseguir fazer parse do JSON, retornar uma resposta vazia
          console.log('Resposta DELETE sem JSON, retornando sucesso')
          return { success: true } as T
        }
      } else {
        const errorText = await response.text()
        console.error('Erro HTTP DELETE:', response.status, errorText)
        throw new Error(messageFromApiErrorBody(response.status, errorText))
      }
    }
    
    // Para outros métodos, verificar se a resposta é OK
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro HTTP:', response.status, errorText)
      const error = new Error(messageFromApiErrorBody(response.status, errorText))
      ;(error as any).responseText = errorText
      ;(error as any).status = response.status
      throw error
    }
    
    // Verificar se a resposta tem conteúdo antes de tentar fazer parse do JSON
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json()
      return data
    } else {
      // Se não for JSON, retornar o texto da resposta
      const text = await response.text()
      return text as T
    }
  } catch (error) {
    if (!(error as any)?.silent) {
      console.error(`Erro na API ${endpoint}:`, error)
    }
    throw error
  }
}

// Funções específicas para cada endpoint
export const api = {
  // Métodos genéricos para compatibilidade
  get: (endpoint: string) => apiRequest(endpoint),
  post: (endpoint: string, data: unknown) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint: string, data: unknown) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  patch: (endpoint: string, data: unknown) => apiRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (endpoint: string) => apiRequest(endpoint, {
    method: 'DELETE',
  }),

  /** POST multipart (ex.: anexos Placement). Não define Content-Type (boundary automático). */
  postFormData: async <T = unknown>(endpoint: string, formData: FormData): Promise<T> => {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    const authState = useAuthStore.getState()
    const token = authState.token
    const userId = authState.user?.id || null
    const userRole = (authState.user as any)?.role || null
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(userId && { 'x-user-id': userId }),
        ...(userRole && { 'x-user-role': userRole }),
      },
      body: formData,
    })
    if (response.status === 401) {
      const { handleUnauthorizedOnce } = await import('./handleUnauthorized')
      handleUnauthorizedOnce(url)
      throw new Error('Sessão expirada ou não autenticado')
    }
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro HTTP (formData):', response.status, errorText)
      const error = new Error(messageFromApiErrorBody(response.status, errorText))
      ;(error as any).responseText = errorText
      ;(error as any).status = response.status
      throw error
    }
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return (await response.json()) as T
    }
    return (await response.text()) as T
  },

  /** GET binário com autenticação (download de anexo). */
  getBlob: async (endpoint: string): Promise<Blob> => {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    const authState = useAuthStore.getState()
    const token = authState.token
    const userId = authState.user?.id || null
    const userRole = (authState.user as any)?.role || null
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(userId && { 'x-user-id': userId }),
        ...(userRole && { 'x-user-role': userRole }),
      },
    })
    if (response.status === 401) {
      const { handleUnauthorizedOnce } = await import('./handleUnauthorized')
      handleUnauthorizedOnce(url)
      throw new Error('Sessão expirada ou não autenticado')
    }
    if (!response.ok) {
      const t = await response.text()
      throw new Error(t || `HTTP ${response.status}`)
    }
    return response.blob()
  },

  // Autenticação
  login: (credentials: { email: string; password: string }) =>
    apiRequest(API_CONFIG.ENDPOINTS.AUTH + '/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  changePassword: (payload: { email: string; currentPassword: string; newPassword: string }) =>
    apiRequest(API_CONFIG.ENDPOINTS.AUTH + '/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Usuários
  getUsers: () => apiRequest(API_CONFIG.ENDPOINTS.USERS),
  createUser: (userData: unknown) =>
    apiRequest(API_CONFIG.ENDPOINTS.USERS, {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  updateUser: (id: string, userData: unknown) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.USERS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
  deleteUser: (id: string) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.USERS}/${id}`, {
      method: 'DELETE',
    }),

  // Demandas
  getDemandas: (queryParams?: string) => apiRequest(`${API_CONFIG.ENDPOINTS.DEMANDAS}${queryParams || ''}`),
  getPadrao: () => apiRequest(API_CONFIG.ENDPOINTS.PADRAO),
  getDemanda: (id: string) => apiRequest(`${API_CONFIG.ENDPOINTS.DEMANDAS}/${id}`),
  createDemanda: (demandaData: unknown) =>
    apiRequest(API_CONFIG.ENDPOINTS.DEMANDAS, {
      method: 'POST',
      body: JSON.stringify(demandaData),
    }),
  updateDemanda: (id: string, demandaData: unknown) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.DEMANDAS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(demandaData),
    }),
  deleteDemanda: (id: string) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.DEMANDAS}/${id}`, {
      method: 'DELETE',
    }),

  // Manutenções
  getManutencoes: (queryParams?: string) => apiRequest(`/manutencoes${queryParams || ''}`),
  getManutencao: (id: string) => apiRequest(`/manutencoes/${id}`),
  createManutencao: (manutencaoData: unknown) =>
    apiRequest('/manutencoes', {
      method: 'POST',
      body: JSON.stringify(manutencaoData),
    }),
  updateManutencao: (id: string, manutencaoData: unknown) =>
    apiRequest(`/manutencoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(manutencaoData),
    }),
  deleteManutencao: (id: string) =>
    apiRequest(`/manutencoes/${id}`, {
      method: 'DELETE',
    }),

  // Timeline Events
  getTimelineEvents: (entityId: string, entityType: string) =>
    apiRequest(`/timelineEvents?entityId=${entityId}&entityType=${entityType}`),
  createTimelineEvent: (eventData: {
    entityId: string
    entityType: string
    eventType: string
    field?: string
    fromValue?: string
    toValue?: string
    comment?: string
    userId?: string
  }) =>
    apiRequest('/timelineEvents', {
      method: 'POST',
      body: JSON.stringify(eventData),
    }),

  // Projetos
  getProject: (id: string) => apiRequest(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`),
  getProjectCanEdit: (id: string) => apiRequest(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}/can-edit`) as Promise<{ canEdit: boolean }>,
  getProjectMembers: (id: string) => apiRequest(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}/members`),
  updateProject: (id: string, projectData: unknown) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    }),
  deleteProject: (id: string) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`, {
      method: 'DELETE',
    }),

  // Validações
  getValidacoes: (queryParams?: string) => apiRequest(`${API_CONFIG.ENDPOINTS.VALIDACOES}${queryParams || ''}`),
  getValidacao: (id: string) => apiRequest(`${API_CONFIG.ENDPOINTS.VALIDACOES}/${id}`),
  createValidacao: (validacaoData: unknown) =>
    apiRequest(API_CONFIG.ENDPOINTS.VALIDACOES, {
      method: 'POST',
      body: JSON.stringify(validacaoData),
    }),
  updateValidacao: (id: string, validacaoData: unknown) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.VALIDACOES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(validacaoData),
    }),
  deleteValidacao: (id: string) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.VALIDACOES}/${id}`, {
      method: 'DELETE',
    }),

  // Reajustes
  getReajustes: (queryParams?: string) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.REAJUSTES}${queryParams || ''}`),
  getReajuste: (id: string) => apiRequest(`/reajusteLancamentos/${id}`),
  deleteReajuste: (id: string) =>
    apiRequest(`/reajusteLancamentos/${id}`, {
      method: 'DELETE',
    }),

  // Dados mestres
  getAreas: () => apiRequest(API_CONFIG.ENDPOINTS.AREAS),
  getAnalistas: () => apiRequest(API_CONFIG.ENDPOINTS.ANALISTAS),
  getOperadoras: () => apiRequest(API_CONFIG.ENDPOINTS.OPERADORAS),
  getProdutos: () => apiRequest(API_CONFIG.ENDPOINTS.PRODUTOS),
  getSistemas: () => apiRequest(API_CONFIG.ENDPOINTS.SISTEMAS),
  getClientes: () => apiRequest(API_CONFIG.ENDPOINTS.CLIENTES),
  getContratos: () => apiRequest(API_CONFIG.ENDPOINTS.CONTRATOS),
  getTiposDemanda: () => apiRequest(API_CONFIG.ENDPOINTS.TIPOS_DEMANDA),
  getTiposServico: () => apiRequest(API_CONFIG.ENDPOINTS.TIPOS_SERVICO),
  /** Busca um solicitante por ID. Retorna null se não existir (ex.: foi excluído da base). */
  getSolicitante: async (id: string): Promise<{ id: string; nome: string } | null> => {
    try {
      return await apiRequest<{ id: string; nome: string }>(`/solicitantes/${id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('404')) return null
      throw err
    }
  },
  getDados: () => apiRequest('/dados'),

  // Comunicados
  getComunicados: () => apiRequest(API_CONFIG.ENDPOINTS.COMUNICADOS),
  getComunicado: (id: string) => apiRequest(`${API_CONFIG.ENDPOINTS.COMUNICADOS}/${id}`),
  createComunicado: (comunicadoData: unknown) => {
    console.log('🔍 API Local: createComunicado chamado com:', comunicadoData)
    console.log('🔍 API Local: Tipo dos dados:', typeof comunicadoData)
    console.log('🔍 API Local: Endpoint:', API_CONFIG.ENDPOINTS.COMUNICADOS)
    console.log('🔍 API Local: BASE_URL:', API_CONFIG.BASE_URL)
    
    return apiRequest(API_CONFIG.ENDPOINTS.COMUNICADOS, {
      method: 'POST',
      body: JSON.stringify(comunicadoData),
    })
  },
  updateComunicado: (id: string, comunicadoData: unknown) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.COMUNICADOS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(comunicadoData),
    }),
  deleteComunicado: (id: string) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.COMUNICADOS}/${id}`, {
      method: 'DELETE',
    }),
  registrarVisualizacao: (comunicadoId: string, usuarioData: unknown) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.COMUNICADOS}/${comunicadoId}/visualizacoes`, {
      method: 'POST',
      body: JSON.stringify(usuarioData),
    }),
  addComentario: (comunicadoId: string, comentarioData: unknown) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.COMUNICADOS}/${comunicadoId}/comentarios`, {
      method: 'POST',
      body: JSON.stringify(comentarioData),
    }),
  removeComentario: (comunicadoId: string, comentarioId: string) =>
    apiRequest(`${API_CONFIG.ENDPOINTS.COMUNICADOS}/${comunicadoId}/comentarios/${comentarioId}`, {
      method: 'DELETE',
    }),
  getAreasMailling: () => Promise.resolve([]), // Dados hardcoded
  getCargosMailling: () => Promise.resolve([]), // Dados hardcoded
  getFiliaisMailling: () => Promise.resolve([]), // Dados hardcoded
  getCategorias: () => Promise.resolve([]), // Dados hardcoded
  getPeriodicidades: () => Promise.resolve([]), // Dados hardcoded
  getStatus: () => Promise.resolve([]), // Dados hardcoded

  // Atendimentos
  getAtendimentos: (queryParams?: string) => apiRequest(`/atendimentos${queryParams || ''}`),
  getAtendimento: (id: string) => apiRequest(`/atendimentos/${id}`),
  createAtendimento: (atendimentoData: unknown) => {
    console.log('🔍 API.createAtendimento: Dados enviados:', atendimentoData)
    return apiRequest('/atendimentos', {
      method: 'POST',
      body: JSON.stringify(atendimentoData),
    })
  },
  updateAtendimento: (id: string, atendimentoData: unknown) =>
    apiRequest(`/atendimentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(atendimentoData),
    }),
  deleteAtendimento: (id: string) =>
    apiRequest(`/atendimentos/${id}`, {
      method: 'DELETE',
    }),

  // Health check
  health: () => apiRequest(API_CONFIG.ENDPOINTS.HEALTH),

  // Kanban
  getKanbanTickets: () => apiRequest('/kanban/tickets'),
  createKanbanTicket: (ticketData: unknown) =>
    apiRequest('/kanban/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    }),
  updateKanbanTicket: (id: string, ticketData: unknown) =>
    apiRequest(`/kanban/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ticketData),
    }),
  deleteKanbanTicket: (id: string) =>
    apiRequest(`/kanban/tickets/${id}`, {
      method: 'DELETE',
    }),
  clearAllKanbanTickets: () =>
    apiRequest('/kanban/tickets/clear', {
      method: 'DELETE',
    }),
  
  // Analytics
  getAnalytics: (queryParams?: string) => apiRequest(`/analytics${queryParams || ''}`),

  // Limpeza de dados
  // limparDuplicatasClientes removido - função de limpeza de duplicatas removida
  limparDemandasSimples: () => 
    apiRequest('/demandas/limpar-atv-demandas', {
      method: 'DELETE',
    }),
  limparContratosOrfaos: () => 
    apiRequest('/contratos/limpar-orfaos', {
      method: 'DELETE',
    }),
}
