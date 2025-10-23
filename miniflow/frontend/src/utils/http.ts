import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import type { ApiResponse, ApiError } from '../types/api';

// HTTP client configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const API_TIMEOUT = 10000;

class HttpClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request in development
        if (import.meta.env.DEV) {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (import.meta.env.DEV) {
          console.log(`✅ ${response.status} ${response.config.url}`, response.data);
        }

        return response;
      },
      (error: AxiosError) => {
        // Handle common HTTP errors
        this.handleHttpError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleHttpError(error: AxiosError) {
    if (error.response) {
      const { status, data } = error.response;
      
      // Log error in development
      if (import.meta.env.DEV) {
        console.error(`❌ ${status} ${error.config?.url}`, data);
      }

      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          this.clearAuth();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          // Forbidden - show permission error
          console.warn('Access forbidden:', data);
          break;
        case 404:
          // Not found
          console.warn('Resource not found:', error.config?.url);
          break;
        case 500:
          // Server error
          console.error('Server error:', data);
          break;
        default:
          console.error('HTTP error:', status, data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      // Other error
      console.error('Request error:', error.message);
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('miniflow_token');
  }

  private clearAuth(): void {
    localStorage.removeItem('miniflow_token');
    localStorage.removeItem('miniflow_user');
  }

  // HTTP methods
  public async get<T = any>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.get(url, config);
  }

  public async post<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.post(url, data, config);
  }

  public async put<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.put(url, data, config);
  }

  public async delete<T = any>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.delete(url, config);
  }

  // Convenience methods for common patterns
  public async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.request<ApiResponse<T>>(config);
      const { data } = response;

      if ('error' in data) {
        throw new Error(data.error);
      }

      return data.data as T;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as ApiError;
        throw new Error(errorData.error || 'Unknown API error');
      }
      throw error;
    }
  }

  // File upload method
  public async uploadFile(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      },
    });
  }

  // Get instance for advanced usage
  public getInstance(): AxiosInstance {
    return this.instance;
  }

  // Update base URL (for environment switching)
  public setBaseURL(baseURL: string): void {
    this.instance.defaults.baseURL = baseURL;
  }

  // Set auth token
  public setAuthToken(token: string): void {
    localStorage.setItem('miniflow_token', token);
    this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Clear auth token
  public clearAuthToken(): void {
    this.clearAuth();
    delete this.instance.defaults.headers.common['Authorization'];
  }
}

// Export singleton instance
export const http = new HttpClient();

// Export class for testing
export { HttpClient };
