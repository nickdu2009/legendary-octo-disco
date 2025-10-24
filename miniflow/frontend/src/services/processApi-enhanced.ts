/**
 * 增强的流程管理API服务
 * 使用强类型系统和改进的错误处理
 */

import { httpEnhanced, ApiError } from '../utils/http-enhanced';
import type { 
  ProcessDefinition, 
  CreateProcessRequest, 
  UpdateProcessRequest,
  ProcessListResponse,
  ProcessStats
} from '../types/process';
import type { 
  PaginationParams,
  PaginatedResponse,
  SearchParams,
  BatchOperation,
  BatchOperationResult
} from '../types/api-enhanced';

export class ProcessApiService {
  /**
   * 创建流程定义
   */
  async createProcess(data: CreateProcessRequest): Promise<ProcessDefinition> {
    try {
      return await httpEnhanced.post<ProcessDefinition>('/process', data);
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
   * 获取流程列表（带分页）
   */
  async getProcesses(params?: PaginationParams & SearchParams & {
    category?: string;
    status?: string;
  }): Promise<PaginatedResponse<ProcessDefinition>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params?.query) queryParams.append('search', params.query);
      if (params?.category && params.category !== 'all') {
        queryParams.append('category', params.category);
      }
      if (params?.status && params.status !== 'all') {
        queryParams.append('status', params.status);
      }
      
      const url = `/process${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await httpEnhanced.get<ProcessListResponse>(url);
      
      // 转换为标准分页格式
      return {
        items: response.processes,
        pagination: {
          page: response.page,
          page_size: response.page_size,
          total: response.total,
          total_pages: Math.ceil(response.total / response.page_size),
          has_next: response.page * response.page_size < response.total,
          has_prev: response.page > 1,
        }
      };
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
  }

  /**
   * 获取流程详情
   */
  async getProcess(id: number): Promise<ProcessDefinition> {
    try {
      return await httpEnhanced.get<ProcessDefinition>(`/process/${id}`);
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
  }

  /**
   * 更新流程定义
   */
  async updateProcess(id: number, data: UpdateProcessRequest): Promise<ProcessDefinition> {
    try {
      return await httpEnhanced.put<ProcessDefinition>(`/process/${id}`, data);
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
   * 删除流程定义
   */
  async deleteProcess(id: number): Promise<void> {
    try {
      await httpEnhanced.delete<void>(`/process/${id}`);
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
   * 复制流程定义
   */
  async copyProcess(id: number): Promise<ProcessDefinition> {
    try {
      return await httpEnhanced.post<ProcessDefinition>(`/process/${id}/copy`);
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
   * 发布流程定义
   */
  async publishProcess(id: number): Promise<ProcessDefinition> {
    try {
      return await httpEnhanced.post<ProcessDefinition>(`/process/${id}/publish`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `发布流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 归档流程定义
   */
  async archiveProcess(id: number): Promise<ProcessDefinition> {
    try {
      return await httpEnhanced.post<ProcessDefinition>(`/process/${id}/archive`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `归档流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 获取流程统计信息
   */
  async getProcessStats(): Promise<ProcessStats> {
    try {
      return await httpEnhanced.get<ProcessStats>('/process/stats');
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
   * 搜索流程定义
   */
  async searchProcesses(params: SearchParams & {
    category?: string;
    status?: string;
    limit?: number;
  }): Promise<ProcessDefinition[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.query) queryParams.append('q', params.query);
      if (params.category) queryParams.append('category', params.category);
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      return await httpEnhanced.get<ProcessDefinition[]>(`/process/search?${queryParams.toString()}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `搜索流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 导出流程定义
   */
  async exportProcess(
    id: number, 
    format: 'json' | 'xml' | 'bpmn' = 'json',
    filename?: string
  ): Promise<Blob> {
    try {
      return await httpEnhanced.download(
        `/process/${id}/export?format=${format}`,
        filename || `process_${id}.${format}`
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `导出流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 导入流程定义
   */
  async importProcess(file: File): Promise<ProcessDefinition> {
    try {
      return await httpEnhanced.upload<ProcessDefinition>('/process/import', file);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `导入流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 批量操作流程
   */
  async batchOperateProcesses(
    operation: BatchOperation<{ id: number; data?: unknown }>
  ): Promise<BatchOperationResult<ProcessDefinition>> {
    try {
      return await httpEnhanced.post<BatchOperationResult<ProcessDefinition>>(
        '/process/batch', 
        operation
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `批量操作失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 验证流程定义
   */
  async validateProcess(definition: unknown): Promise<{
    isValid: boolean;
    errors: Array<{
      type: 'error' | 'warning';
      message: string;
      field?: string;
    }>;
    suggestions: string[];
  }> {
    try {
      return await httpEnhanced.post('/process/validate', { definition });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `验证流程失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 获取流程版本历史
   */
  async getProcessVersions(key: string): Promise<ProcessDefinition[]> {
    try {
      return await httpEnhanced.get<ProcessDefinition[]>(`/process/versions/${encodeURIComponent(key)}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `获取流程版本失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }

  /**
   * 获取流程分类列表
   */
  async getProcessCategories(): Promise<Array<{
    name: string;
    label: string;
    count: number;
  }>> {
    try {
      return await httpEnhanced.get('/process/categories');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `获取流程分类失败: ${error.message}`,
          error.code,
          error.status
        );
      }
      throw error;
    }
  }
}

// 创建单例实例
export const processApiEnhanced = new ProcessApiService();

// 向后兼容的默认导出
export default processApiEnhanced;
