/**
 * 流程相关的TypeScript类型定义
 * 用于ReactFlow可视化流程建模器
 */

// ReactFlow节点类型定义
export interface ProcessNode {
  id: string;
  type: 'start' | 'end' | 'userTask' | 'serviceTask' | 'gateway';
  position: { x: number; y: number };
  data: {
    label: string;
    assignee?: string;
    condition?: string;
    description?: string;
    formFields?: FormField[];
    [key: string]: any;
  };
}

// ReactFlow连线类型定义
export interface ProcessEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
  data?: {
    condition?: string;
    [key: string]: any;
  };
}

// 表单字段定义
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  options?: string[];
  defaultValue?: any;
}

// 后端流程节点格式（与后端API对应）
export interface BackendProcessNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  props?: {
    [key: string]: any;
  };
}

// 后端流程连线格式（与后端API对应）
export interface BackendProcessFlow {
  id: string;
  from: string;
  to: string;
  condition?: string;
  label?: string;
}

// 后端流程定义数据结构
export interface BackendProcessDefinitionData {
  nodes: BackendProcessNode[];
  flows: BackendProcessFlow[];
}

// 流程定义完整结构
export interface ProcessDefinition {
  id?: number;
  key: string;
  name: string;
  description?: string;
  category?: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  definition: BackendProcessDefinitionData;
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
  definition: BackendProcessDefinitionData;
}

// 更新流程请求
export interface UpdateProcessRequest {
  name: string;
  description?: string;
  category?: string;
  definition: BackendProcessDefinitionData;
}

// 流程列表响应
export interface ProcessListResponse {
  processes: ProcessDefinition[];
  total: number;
  page: number;
  page_size: number;
}

// 流程统计数据
export interface ProcessStats {
  draft_count: number;
  published_count: number;
  archived_count: number;
  total_count: number;
}

// 节点类型配置
export interface NodeTypeConfig {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  allowedConnections?: {
    input: boolean;
    output: boolean;
  };
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

// 流程设计器状态
export interface ProcessDesignerState {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isModified: boolean;
  validationResult: ProcessValidationResult | null;
}

// 节点拖拽数据
export interface NodeDragData {
  nodeType: string;
  label: string;
}
