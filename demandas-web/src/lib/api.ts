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
};

export function endpoint(resource: string) {
  return `/${resource}`
}


