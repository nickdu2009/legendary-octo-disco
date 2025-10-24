/**
 * 优化的流程API服务
 * 包含缓存、重试、错误处理、性能优化
 */

import { message } from 'antd';
import { httpEnhanced } from '../utils/http-enhanced';
import { ApiError } from '../types/api-enhanced';
import type { 
  ProcessDefinition, 
  CreateProcessRequest, 
  UpdateProcessRequest,
  ProcessListResponse,
  ProcessStats
} from '../types/process';
import type { PaginationParams } from '../types/api-enhanced';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface RequestQueue {
  key: string;
  promise: Promise<any>;
  timestamp: number;
}

export class OptimizedProcessApi {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestQueue: Map<string, RequestQueue> = new Map();
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize = 100;

  /**
   * 生成缓存键
   */
  private generateCacheKey(method: string, url: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramStr}`;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * 设置缓存
   */
  private setCache<T>(key: string, data: T, ttl: number = this.defaultCacheTTL): void {
    // 清理过期缓存
    this.cleanExpiredCache();

    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 获取缓存
   */
  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }
    
    // 删除过期缓存
    if (entry) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 请求去重
   */
  private async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const existingRequest = this.requestQueue.get(key);
    
    if (existingRequest && Date.now() - existingRequest.timestamp < 1000) {
      return existingRequest.promise;
    }

    const promise = requestFn();
    this.requestQueue.set(key, {
      key,
      promise,
      timestamp: Date.now()
    });

    try {
      const result = await promise;
      this.requestQueue.delete(key);
      return result;
    } catch (error) {
      this.requestQueue.delete(key);
      throw error;
    }
  }

  /**
   * 获取流程列表（带缓存）
   */
  async getProcesses(params?: PaginationParams & {
    search?: string;
    category?: string;
    status?: string;
  }): Promise<ProcessListResponse> {
    const cacheKey = this.generateCacheKey('GET', '/process', params);
    
    // 检查缓存
    const cachedData = this.getCache<ProcessListResponse>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const queryParams = new URLSearchParams();
        
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.category && params.category !== 'all') {
          queryParams.append('category', params.category);
        }
        if (params?.status && params.status !== 'all') {
          queryParams.append('status', params.status);
        }
        
        const url = `/process${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await httpEnhanced.get<ProcessListResponse>(url);
        
        // 缓存结果（列表数据缓存时间较短）
        this.setCache(cacheKey, response, 2 * 60 * 1000); // 2 minutes
        
        return response;
      } catch (error) {
        if (error instanceof ApiError) {
          throw new ApiError(
            `获取流程列表失败: ${error.message}`,
            error.code,
            error.status
          );
        }
        throw error;
      }
    });
  }

  /**
   * 获取流程详情（带缓存）
   */
  async getProcess(id: number): Promise<ProcessDefinition> {
    const cacheKey = this.generateCacheKey('GET', `/process/${id}`);
    
    // 检查缓存
    const cachedData = this.getCache<ProcessDefinition>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const response = await httpEnhanced.get<ProcessDefinition>(`/process/${id}`);
        
        // 缓存详情数据
        this.setCache(cacheKey, response, this.defaultCacheTTL);
        
        return response;
      } catch (error) {
        if (error instanceof ApiError) {
          throw new ApiError(
            `获取流程详情失败: ${error.message}`,
            error.code,
            error.status
          );
        }
        throw error;
      }
    });
  }

  /**
   * 创建流程
   */
  async createProcess(data: CreateProcessRequest): Promise<ProcessDefinition> {
    try {
      const response = await httpEnhanced.post<ProcessDefinition>('/process', data);
      
      // 清除相关缓存
      this.clearProcessListCache();
      this.clearStatsCache();
      
      message.success('流程创建成功');
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `创建流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 更新流程
   */
  async updateProcess(id: number, data: UpdateProcessRequest): Promise<ProcessDefinition> {
    try {
      const response = await httpEnhanced.put<ProcessDefinition>(`/process/${id}`, data);
      
      // 更新缓存
      const detailCacheKey = this.generateCacheKey('GET', `/process/${id}`);
      this.setCache(detailCacheKey, response);
      
      // 清除列表缓存
      this.clearProcessListCache();
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `更新流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 删除流程
   */
  async deleteProcess(id: number): Promise<void> {
    try {
      await httpEnhanced.delete<void>(`/process/${id}`);
      
      // 清除相关缓存
      const detailCacheKey = this.generateCacheKey('GET', `/process/${id}`);
      this.cache.delete(detailCacheKey);
      this.clearProcessListCache();
      this.clearStatsCache();
      
      message.success('流程删除成功');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `删除流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 复制流程
   */
  async copyProcess(id: number): Promise<ProcessDefinition> {
    try {
      const response = await httpEnhanced.post<ProcessDefinition>(`/process/${id}/copy`);
      
      // 清除相关缓存
      this.clearProcessListCache();
      this.clearStatsCache();
      
      message.success('流程复制成功');
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `复制流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 获取流程统计（带缓存）
   */
  async getProcessStats(): Promise<ProcessStats> {
    const cacheKey = 'stats';
    
    // 检查缓存
    const cachedData = this.getCache<ProcessStats>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await httpEnhanced.get<ProcessStats>('/process/stats');
      
      // 缓存统计数据（较短的缓存时间）
      this.setCache(cacheKey, response, 1 * 60 * 1000); // 1 minute
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `获取流程统计失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 搜索流程（带防抖）
   */
  private searchDebounceTimer: NodeJS.Timeout | null = null;
  
  async searchProcesses(
    query: string,
    options?: {
      category?: string;
      status?: string;
      limit?: number;
    }
  ): Promise<ProcessDefinition[]> {
    return new Promise((resolve, reject) => {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = setTimeout(async () => {
        try {
          const params = new URLSearchParams();
          params.append('search', query);
          
          if (options?.category) params.append('category', options.category);
          if (options?.status) params.append('status', options.status);
          if (options?.limit) params.append('limit', options.limit.toString());
          
          const response = await httpEnhanced.get<ProcessDefinition[]>(`/process/search?${params.toString()}`);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      }, 300); // 300ms debounce
    });
  }

  /**
   * 清除流程列表缓存
   */
  private clearProcessListCache(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith('GET:/process') && !key.includes('/process/')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除统计缓存
   */
  private clearStatsCache(): void {
    this.cache.delete('stats');
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.cache.clear();
    message.info('缓存已清除');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; size: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      size: JSON.stringify(entry.data).length
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      entries
    };
  }

  /**
   * 预加载常用数据
   */
  async preloadData(): Promise<void> {
    try {
      // 预加载第一页流程列表
      await this.getProcesses({ page: 1, page_size: 20 });
      
      // 预加载统计数据
      await this.getProcessStats();
      
      console.log('数据预加载完成');
    } catch (error) {
      console.warn('数据预加载失败:', error);
    }
  }
}

// 创建单例实例
export const optimizedProcessApi = new OptimizedProcessApi();

// 默认导出
export default optimizedProcessApi;
