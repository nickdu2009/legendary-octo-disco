/**
 * 流程实例API服务
 * 与后端流程执行接口进行交互
 */

import { http } from '../utils/http';
import type { 
  ProcessInstance,
  InstanceListResponse,
  StartProcessRequest,
  SuspendInstanceRequest,
  CancelInstanceRequest,
  InstanceHistory
} from '../types/instance';
import type { PaginationParams } from '../types/api';

export const instanceApi = {
  /**
   * 启动流程实例
   */
  async startProcess(processId: number, data: StartProcessRequest): Promise<ProcessInstance> {
    const response = await http.post(`/process/${processId}/start`, data);
    return response.data;
  },

  /**
   * 获取流程实例详情
   */
  async getInstance(instanceId: number): Promise<ProcessInstance> {
    const response = await http.get(`/instance/${instanceId}`);
    return response.data;
  },

  /**
   * 获取流程实例列表
   */
  async getInstances(params: PaginationParams & {
    status?: string;
    definition_id?: number;
    starter_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<InstanceListResponse> {
    const response = await http.get('/instances', { params });
    return response.data;
  },

  /**
   * 暂停流程实例
   */
  async suspendInstance(instanceId: number, data: SuspendInstanceRequest): Promise<void> {
    await http.post(`/instance/${instanceId}/suspend`, data);
  },

  /**
   * 恢复流程实例
   */
  async resumeInstance(instanceId: number): Promise<void> {
    await http.post(`/instance/${instanceId}/resume`);
  },

  /**
   * 取消流程实例
   */
  async cancelInstance(instanceId: number, data: CancelInstanceRequest): Promise<void> {
    await http.post(`/instance/${instanceId}/cancel`, data);
  },

  /**
   * 获取流程执行历史
   */
  async getInstanceHistory(instanceId: number): Promise<InstanceHistory> {
    const response = await http.get(`/instance/${instanceId}/history`);
    return response.data;
  }
};
