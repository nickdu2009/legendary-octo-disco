/**
 * 流程执行API服务
 * 与后端流程执行接口进行交互
 */

import { http } from '../utils/http';
import type { 
  ProcessInstance,
  InstanceListResponse,
  StartProcessRequest,
  SuspendInstanceRequest,
  CancelInstanceRequest
} from '../types/instance';
import type { 
  TaskInstance,
  TaskListResponse,
  CompleteTaskRequest,
  DelegateTaskRequest
} from '../types/task';
import type { PaginationParams } from '../types/api';

export const executionApi = {
  // 流程实例API
  /**
   * 启动流程实例
   */
  async startProcess(definitionId: number, data: StartProcessRequest): Promise<ProcessInstance> {
    const response = await http.post(`/process/${definitionId}/start`, data);
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

  // 任务API
  /**
   * 获取用户任务列表
   */
  async getUserTasks(params: PaginationParams & {
    status?: string;
    priority?: string;
    due_date_from?: string;
    due_date_to?: string;
  }): Promise<TaskListResponse> {
    const response = await http.get('/user/tasks', { params });
    return response.data;
  },

  /**
   * 获取任务详情
   */
  async getTask(taskId: number): Promise<TaskInstance> {
    const response = await http.get(`/task/${taskId}`);
    return response.data;
  },

  /**
   * 认领任务
   */
  async claimTask(taskId: number): Promise<void> {
    await http.post(`/task/${taskId}/claim`);
  },

  /**
   * 完成任务
   */
  async completeTask(taskId: number, data: CompleteTaskRequest): Promise<void> {
    await http.post(`/task/${taskId}/complete`, data);
  },

  /**
   * 委派任务
   */
  async delegateTask(taskId: number, data: DelegateTaskRequest): Promise<void> {
    await http.post(`/task/${taskId}/delegate`, data);
  },

  /**
   * 获取任务表单定义
   */
  /**
   * 获取任务表单定义
   */
  async getTaskForm(taskId: number): Promise<Record<string, unknown>> {
    const response = await http.get(`/task/${taskId}/form`);
    return response.data;
  },

  /**
   * 保存任务表单数据
   */
  async saveTaskForm(taskId: number, data: Record<string, unknown>): Promise<void> {
    await http.post(`/task/${taskId}/form`, data);
  }
};