/**
 * 任务管理API服务
 * 与后端任务管理接口进行交互
 */

import { http } from '../utils/http';
import type { 
  TaskInstance,
  TaskListResponse,
  TaskFormData,
  TaskFormDefinition,
  ClaimTaskRequest,
  CompleteTaskRequest,
  DelegateTaskRequest
} from '../types/task';
import type { PaginationParams } from '../types/api';

export const taskApi = {
  /**
   * 获取用户任务列表
   */
  async getUserTasks(params: PaginationParams & {
    status?: string;
    priority?: string;
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
   * 释放任务
   */
  async releaseTask(taskId: number): Promise<void> {
    await http.post(`/task/${taskId}/release`);
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
  async getTaskForm(taskId: number): Promise<{
    task: TaskInstance;
    form_definition?: TaskFormDefinition;
    form_data?: string;
  }> {
    const response = await http.get(`/task/${taskId}/form`);
    return response.data;
  },

  /**
   * 提交任务表单
   */
  async submitTaskForm(taskId: number, data: {
    action: 'save' | 'complete';
    form_data: Record<string, any>;
    comment?: string;
  }): Promise<void> {
    await http.post(`/task/${taskId}/form`, data);
  },

  /**
   * 根据状态获取任务列表（管理员功能）
   */
  async getTasksByStatus(status: string, params: PaginationParams): Promise<TaskListResponse> {
    const response = await http.get(`/tasks/status/${status}`, { params });
    return response.data;
  }
};
