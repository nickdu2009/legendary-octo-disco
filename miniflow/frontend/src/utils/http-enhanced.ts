/**
 * 增强的HTTP客户端
 * 提供强类型安全和错误处理
 */

import axios, { type AxiosResponse, type AxiosRequestConfig } from 'axios';
import type { 
  ApiResponse, 
  ApiError, 
  RequestConfig,
  ApiErrorResponse,
  ApiSuccessResponse
} from '../types/api-enhanced';

class EnhancedHttpClient {
  private baseURL: string;
  private defaultTimeout: number;

  constructor(baseURL: string = 'http://localhost:8080/api/v1', timeout: number = 10000) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
    
    // 设置axios默认配置
    axios.defaults.timeout = timeout;
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    
    // 请求拦截器
    axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 处理API响应，确保类型安全
   */
  private handleResponse<T>(response: AxiosResponse): T {
    const data = response.data;
    
    if (this.isApiError(data)) {
      throw ApiError.fromResponse(data, response.status);
    }
    
    if (this.isApiSuccess(data)) {
      return data.data;
    }
    
    throw new ApiError(
      'Invalid API response format',
      'INVALID_RESPONSE_FORMAT',
      response.status
    );
  }

  /**
   * 类型守卫：检查是否为API错误响应
   */
  private isApiError(response: unknown): response is ApiErrorResponse {
    return typeof response === 'object' && 
           response !== null && 
           'error' in response && 
           'code' in response;
  }

  /**
   * 类型守卫：检查是否为API成功响应
   */
  private isApiSuccess<T>(response: unknown): response is ApiSuccessResponse<T> {
    return typeof response === 'object' && 
           response !== null && 
           'data' in response;
  }

  /**
   * GET请求
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const fullUrl = `${this.baseURL}${url}`;
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      timeout: config?.timeout || this.defaultTimeout,
    };

    try {
      const response = await axios.get(fullUrl, axiosConfig);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data;
        if (this.isApiError(apiError)) {
          throw ApiError.fromResponse(apiError, error.response?.status);
        }
        throw new ApiError(
          error.message || 'Network error',
          'NETWORK_ERROR',
          error.response?.status
        );
      }
      throw error;
    }
  }

  /**
   * POST请求
   */
  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const fullUrl = `${this.baseURL}${url}`;
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      timeout: config?.timeout || this.defaultTimeout,
    };

    try {
      const response = await axios.post(fullUrl, data, axiosConfig);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data;
        if (this.isApiError(apiError)) {
          throw ApiError.fromResponse(apiError, error.response?.status);
        }
        throw new ApiError(
          error.message || 'Network error',
          'NETWORK_ERROR',
          error.response?.status
        );
      }
      throw error;
    }
  }

  /**
   * PUT请求
   */
  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const fullUrl = `${this.baseURL}${url}`;
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      timeout: config?.timeout || this.defaultTimeout,
    };

    try {
      const response = await axios.put(fullUrl, data, axiosConfig);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data;
        if (this.isApiError(apiError)) {
          throw ApiError.fromResponse(apiError, error.response?.status);
        }
        throw new ApiError(
          error.message || 'Network error',
          'NETWORK_ERROR',
          error.response?.status
        );
      }
      throw error;
    }
  }

  /**
   * DELETE请求
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const fullUrl = `${this.baseURL}${url}`;
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      timeout: config?.timeout || this.defaultTimeout,
    };

    try {
      const response = await axios.delete(fullUrl, axiosConfig);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data;
        if (this.isApiError(apiError)) {
          throw ApiError.fromResponse(apiError, error.response?.status);
        }
        throw new ApiError(
          error.message || 'Network error',
          'NETWORK_ERROR',
          error.response?.status
        );
      }
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async upload<T>(url: string, file: File, config?: RequestConfig): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const fullUrl = `${this.baseURL}${url}`;
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
      timeout: config?.timeout || this.defaultTimeout * 3, // 上传超时时间更长
    };

    try {
      const response = await axios.post(fullUrl, formData, axiosConfig);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data;
        if (this.isApiError(apiError)) {
          throw ApiError.fromResponse(apiError, error.response?.status);
        }
        throw new ApiError(
          error.message || 'Upload error',
          'UPLOAD_ERROR',
          error.response?.status
        );
      }
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async download(url: string, filename?: string, config?: RequestConfig): Promise<Blob> {
    const fullUrl = `${this.baseURL}${url}`;
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      responseType: 'blob',
      timeout: config?.timeout || this.defaultTimeout * 2,
    };

    try {
      const response = await axios.get(fullUrl, axiosConfig);
      
      // 如果指定了文件名，触发下载
      if (filename) {
        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.message || 'Download error',
          'DOWNLOAD_ERROR',
          error.response?.status
        );
      }
      throw error;
    }
  }

  /**
   * 批量请求
   */
  async batch<T>(requests: Array<{
    method: HttpMethod;
    url: string;
    data?: unknown;
    config?: RequestConfig;
  }>): Promise<T[]> {
    const promises = requests.map(req => {
      const method = req.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      
      switch (method) {
        case 'get':
          return this.get<T>(req.url, req.config);
        case 'post':
          return this.post<T>(req.url, req.data, req.config);
        case 'put':
          return this.put<T>(req.url, req.data, req.config);
        case 'delete':
          return this.delete<T>(req.url, req.config);
        default:
          throw new ApiError(`Unsupported method: ${req.method}`, 'UNSUPPORTED_METHOD');
      }
    });

    try {
      return await Promise.all(promises);
    } catch (error) {
      throw new ApiError(
        'Batch request failed',
        'BATCH_REQUEST_FAILED',
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * 健康检查
   */
  async health(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version?: string;
    uptime?: number;
  }> {
    try {
      return await this.get('/health');
    } catch (error) {
      throw new ApiError(
        'Health check failed',
        'HEALTH_CHECK_FAILED',
        undefined,
        { originalError: error }
      );
    }
  }
}

// 创建增强HTTP客户端实例
export const httpEnhanced = new EnhancedHttpClient();

// 导出错误类型和工具函数
export { ApiError, isApiError, isApiSuccess };
