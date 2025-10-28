/**
 * 流程实例相关的TypeScript类型定义
 * 用于流程执行和监控
 */

import type { User } from './user';
import type { ProcessDefinition } from './process';
import type { TaskInstance } from './task';

// 流程实例类型定义
export interface ProcessInstance {
  id: number;
  definition_id: number;
  business_key: string;
  title: string;
  description?: string;
  current_node: string;
  status: InstanceStatus;
  variables: string;
  start_time: string;
  end_time?: string;
  starter_id: number;
  
  // 执行引擎扩展字段
  execution_path: string;
  suspend_reason?: string;
  priority: number;
  due_date?: string;
  actual_duration: number;
  expected_duration: number;
  
  // 监控和统计字段
  task_count: number;
  completed_tasks: number;
  failed_tasks: number;
  active_tasks: number;
  
  // 扩展信息
  tags?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
  
  // 关联数据
  definition?: ProcessDefinition;
  starter?: User;
  tasks?: TaskInstance[];
}

// 流程实例状态枚举
export type InstanceStatus = 
  | 'running'
  | 'suspended'
  | 'completed'
  | 'failed'
  | 'cancelled';

// 流程实例列表响应类型
export interface InstanceListResponse {
  instances: ProcessInstance[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 启动流程请求类型
export interface StartProcessRequest {
  business_key: string;
  title?: string;
  description?: string;
  variables?: Record<string, any>;
  priority?: number;
  due_date?: string;
  tags?: string[];
}

// 暂停实例请求类型
export interface SuspendInstanceRequest {
  reason: string;
}

// 取消实例请求类型
export interface CancelInstanceRequest {
  reason: string;
}

// 执行历史类型
export interface InstanceHistory {
  instance: ProcessInstance;
  tasks: TaskInstance[];
  execution_path: string;
  created_at: string;
  start_time: string;
  end_time?: string;
}

// 执行路径项类型
export interface ExecutionPathItem {
  node: string;
  timestamp: string;
  status?: string;
}

// 流程实例统计类型
export interface InstanceStatistics {
  total_count: number;
  running_count: number;
  suspended_count: number;
  completed_count: number;
  failed_count: number;
  cancelled_count: number;
  today_started: number;
}

// 流程实例筛选参数
export interface InstanceFilterParams {
  status?: InstanceStatus;
  definition_id?: number;
  starter_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
  priority?: number;
}
