/**
 * 任务相关的TypeScript类型定义
 * 用于任务管理和表单处理
 */

import type { User } from './user';
import type { ProcessInstance } from './instance';

// 任务实例类型定义
export interface TaskInstance {
  id: number;
  instance_id: number;
  node_id: string;
  name: string;
  assignee_id?: number;
  status: TaskStatus;
  priority: number;
  due_date?: string;
  claim_time?: string;
  complete_time?: string;
  comment?: string;
  form_data?: string;
  
  // 执行相关字段
  task_type: TaskType;
  execution_data?: string;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  
  // 时间跟踪字段
  estimated_duration: number;
  actual_duration: number;
  start_time?: string;
  
  // 任务配置字段
  auto_assign: boolean;
  requires_approval: boolean;
  notification_sent: boolean;
  escalation_level: number;
  
  // 表单和数据字段
  form_definition?: string;
  output_data?: string;
  
  // 审计字段
  claimed_by?: number;
  completed_by?: number;
  last_modified: string;
  created_at: string;
  updated_at: string;
  
  // 关联数据
  instance?: ProcessInstance;
  assignee?: User;
  claimed_user?: User;
  completed_user?: User;
}

// 任务状态枚举
export type TaskStatus = 
  | 'created'
  | 'assigned'
  | 'claimed'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'escalated';

// 任务类型枚举
export type TaskType = 
  | 'userTask'
  | 'serviceTask'
  | 'scriptTask'
  | 'mailTask'
  | 'manualTask';

// 任务列表响应类型
export interface TaskListResponse {
  tasks: TaskInstance[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 任务操作请求类型
export interface ClaimTaskRequest {
  // 认领任务无需额外参数
}

export interface CompleteTaskRequest {
  form_data?: Record<string, any>;
  comment?: string;
}

export interface DelegateTaskRequest {
  to_user_id: number;
  comment?: string;
}

export interface ReleaseTaskRequest {
  // 释放任务无需额外参数
}

// 动态表单相关类型
export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  props?: Record<string, any>;
  dependencies?: string[];
  conditional?: {
    field: string;
    value: any;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  };
  description?: string;
  group?: string;
}

// 表单字段类型枚举
export type FormFieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'daterange'
  | 'time'
  | 'datetime'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'slider'
  | 'rate'
  | 'upload';

// 表单定义类型
export interface TaskFormDefinition {
  title?: string;
  description?: string;
  fields: FormField[];
  layout?: 'horizontal' | 'vertical' | 'inline';
  groups?: { name: string; title: string; fields: string[] }[];
}

// 表单数据类型
export interface TaskFormData {
  [key: string]: any;
}

// 任务统计类型
export interface TaskStatistics {
  total_count: number;
  created_count: number;
  assigned_count: number;
  claimed_count: number;
  in_progress_count: number;
  completed_count: number;
  failed_count: number;
}

// 任务筛选参数
export interface TaskFilterParams {
  status?: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  search?: string;
  date_range?: [string, string];
  assignee_id?: number;
  instance_id?: number;
}
