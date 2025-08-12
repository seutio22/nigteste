// API utility functions
const BASE_URL = 'http://localhost:3333'; // URL padrão para desenvolvimento

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // GET request
  get: (endpoint: string) => api.request(endpoint),

  // POST request
  post: (endpoint: string, data: any) => api.request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // PUT request
  put: (endpoint: string, data: any) => api.request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // DELETE request
  delete: (endpoint: string) => api.request(endpoint, {
    method: 'DELETE',
  }),
};

export function endpoint(resource: string) {
  return `/${resource}`
}


