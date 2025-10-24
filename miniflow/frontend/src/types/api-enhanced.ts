/**
 * 增强的API类型定义
 * 提供更强的类型安全性和错误处理
 */

// 基础API响应类型
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface ApiSuccessResponse<T = unknown> {
  message: string;
  data: T;
  timestamp?: string;
  metadata?: {
    page?: number;
    page_size?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// API响应类型守卫
export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return 'error' in response;
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return 'data' in response;
}

// HTTP方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 请求配置类型
export interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
  retries?: number;
  validateStatus?: (status: number) => boolean;
}

// 分页参数类型
export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// 搜索参数类型
export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  facets?: string[];
  highlight?: boolean;
}

// 排序参数类型
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// 批量操作类型
export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  options?: {
    continueOnError?: boolean;
    validateBeforeOperation?: boolean;
  };
}

export interface BatchOperationResult<T> {
  success: T[];
  failed: Array<{
    item: T;
    error: string;
    code: string;
  }>;
  summary: {
    total: number;
    success_count: number;
    failed_count: number;
  };
}

// API错误类型
export class ApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string, 
    code: string, 
    status?: number, 
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static fromResponse(response: ApiErrorResponse, status?: number): ApiError {
    return new ApiError(
      response.error,
      response.code,
      status,
      response.details
    );
  }
}

// API客户端配置类型
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
  interceptors: {
    request?: Array<(config: RequestConfig) => RequestConfig>;
    response?: Array<(response: ApiResponse) => ApiResponse>;
    error?: Array<(error: ApiError) => ApiError>;
  };
}

// 缓存配置类型
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
  strategy: 'lru' | 'fifo' | 'lfu'; // Cache eviction strategy
}

// 请求重试配置
export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  retryCondition: (error: ApiError) => boolean;
}
