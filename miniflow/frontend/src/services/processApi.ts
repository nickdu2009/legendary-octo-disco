/**
 * 流程管理API服务
 * 与后端流程管理接口进行交互
 */

import { http } from '../utils/http';
import type { 
  ProcessDefinition, 
  CreateProcessRequest, 
  UpdateProcessRequest,
  ProcessListResponse,
  ProcessStats
} from '../types/process';
import type { PaginationParams } from '../types/api';

export const processApi = {
  /**
   * 创建流程定义
   */
  async createProcess(data: CreateProcessRequest): Promise<ProcessDefinition> {
    const response = await http.post('/process', data);
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data.data;
  },

  /**
   * 获取流程列表
   */
  async getProcesses(params?: PaginationParams & {
    search?: string;
    category?: string;
    status?: string;
  }): Promise<ProcessListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category && params.category !== 'all') queryParams.append('category', params.category);
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
    
    const url = `/process${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await http.get(url);
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data.data;
  },

  /**
   * 获取流程详情
   */
  async getProcess(id: number): Promise<ProcessDefinition> {
    const response = await http.get(`/process/${id}`);
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data.data;
  },

  /**
   * 更新流程定义
   */
  async updateProcess(id: number, data: UpdateProcessRequest): Promise<ProcessDefinition> {
    const response = await http.put(`/process/${id}`, data);
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data.data;
  },

  /**
   * 删除流程定义
   */
  async deleteProcess(id: number): Promise<void> {
    const response = await http.delete(`/process/${id}`);
    if (response.data.error) {
      throw new Error(response.data.error);
    }
  },

  /**
   * 复制流程定义
   */
  async copyProcess(id: number): Promise<ProcessDefinition> {
    const response = await http.post(`/process/${id}/copy`);
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data.data;
  },

  /**
   * 获取流程统计信息
   */
  async getProcessStats(): Promise<ProcessStats> {
    const response = await http.get('/process/stats');
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data.data;
  },

  /**
   * 导出流程定义
   */
  async exportProcess(id: number, format: 'json' | 'xml' = 'json'): Promise<Blob> {
    const response = await http.get(`/process/${id}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};