/**
 * MiniFlow 流程相关类型定义
 * 用于ReactFlow集成和流程建模器
 */

import type { Node, Edge } from 'reactflow';

// 流程节点类型
export type ProcessNodeType = 'start' | 'end' | 'userTask' | 'serviceTask' | 'gateway';

// 流程状态
export type ProcessStatus = 'draft' | 'published' | 'archived';

// 流程节点接口（内部数据格式）
export interface ProcessNode {
  id: string;
  type: ProcessNodeType;
  name: string;
  x: number;
  y: number;
  props?: {
    assignee?: string;
    condition?: string;
    description?: string;
    [key: string]: any;
  };
}

// 流程连线接口（内部数据格式）
export interface ProcessFlow {
  id: string;
  from: string;
  to: string;
  condition?: string;
  label?: string;
}

// ReactFlow节点接口（UI格式）
export interface ReactFlowNode extends Node {
  type: ProcessNodeType;
  data: {
    label: string;
    assignee?: string;
    condition?: string;
    description?: string;
    [key: string]: any;
  };
}

// ReactFlow连线接口（UI格式）
export interface ReactFlowEdge extends Edge {
  data?: {
    condition?: string;
    label?: string;
  };
}

// 流程定义数据结构（后端格式）
export interface ProcessDefinitionData {
  nodes: ProcessNode[];
  flows: ProcessFlow[];
}

// 完整流程定义接口
export interface ProcessDefinition {
  id?: number;
  key: string;
  name: string;
  description?: string;
  category?: string;
  version: number;
  status: ProcessStatus;
  definition: ProcessDefinitionData;
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

// 创建流程请求
export interface CreateProcessRequest {
  key: string;
  name: string;
  description?: string;
  category?: string;
  definition: ProcessDefinitionData;
}

// 更新流程请求
export interface UpdateProcessRequest {
  name: string;
  description?: string;
  category?: string;
  definition: ProcessDefinitionData;
}

// 流程列表响应
export interface ProcessListResponse {
  processes: ProcessDefinition[];
  total: number;
  page: number;
  page_size: number;
}

// 流程统计响应
export interface ProcessStatsResponse {
  draft_count: number;
  published_count: number;
  archived_count: number;
  total_count: number;
}

// 节点类型配置
export interface NodeTypeConfig {
  type: ProcessNodeType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

// 流程验证错误
export interface ProcessValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

// 流程验证结果
export interface ProcessValidationResult {
  isValid: boolean;
  errors: ProcessValidationError[];
  warnings: ProcessValidationError[];
}
