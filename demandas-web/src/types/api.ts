// Tipos para API
export interface ApiRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  status: number;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  data?: any;
}

// Tipos para endpoints específicos
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}
