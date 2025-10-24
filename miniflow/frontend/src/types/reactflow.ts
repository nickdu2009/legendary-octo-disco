/**
 * ReactFlow相关的强类型定义
 * 增强类型安全性和开发体验
 */

import type { Node, Edge, NodeTypes } from 'reactflow';

// 强类型的节点数据接口
export interface BaseNodeData {
  label: string;
  description?: string;
  [key: string]: unknown;
}

export interface StartNodeData extends BaseNodeData {
  type: 'start';
}

export interface EndNodeData extends BaseNodeData {
  type: 'end';
}

export interface UserTaskNodeData extends BaseNodeData {
  type: 'userTask';
  assignee?: string;
  required?: boolean;
  formFields?: FormField[];
}

export interface ServiceTaskNodeData extends BaseNodeData {
  type: 'serviceTask';
  serviceType?: 'http' | 'database' | 'email' | 'script';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
}

export interface GatewayNodeData extends BaseNodeData {
  type: 'gateway';
  gatewayType?: 'exclusive' | 'parallel' | 'inclusive';
  condition?: string;
  conditions?: Array<{
    id: string;
    expression: string;
    label: string;
  }>;
}

// 联合类型的节点数据
export type ProcessNodeData = 
  | StartNodeData 
  | EndNodeData 
  | UserTaskNodeData 
  | ServiceTaskNodeData 
  | GatewayNodeData;

// 强类型的节点定义
export interface TypedProcessNode extends Omit<Node, 'data' | 'type'> {
  type: 'start' | 'end' | 'userTask' | 'serviceTask' | 'gateway';
  data: ProcessNodeData;
}

// 强类型的连线数据
export interface ProcessEdgeData {
  condition?: string;
  priority?: number;
  label?: string;
  [key: string]: unknown;
}

// 强类型的连线定义
export interface TypedProcessEdge extends Omit<Edge, 'data'> {
  data?: ProcessEdgeData;
  label?: string;
}

// 表单字段定义
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox' | 'email' | 'phone';
  required?: boolean;
  options?: Array<{
    label: string;
    value: string | number;
  }>;
  defaultValue?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

// 节点操作事件类型
export interface NodeOperationEvent {
  type: 'add' | 'update' | 'delete' | 'select';
  nodeId: string;
  nodeType?: string;
  data?: Partial<ProcessNodeData>;
  position?: { x: number; y: number };
}

// 连线操作事件类型
export interface EdgeOperationEvent {
  type: 'add' | 'update' | 'delete' | 'select';
  edgeId: string;
  sourceId?: string;
  targetId?: string;
  data?: Partial<ProcessEdgeData>;
}

// 流程设计器状态类型
export interface ProcessDesignerState {
  nodes: TypedProcessNode[];
  edges: TypedProcessEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isModified: boolean;
  validationResult: ProcessValidationResult | null;
  zoom: number;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

// 流程验证规则类型
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validator: (nodes: TypedProcessNode[], edges: TypedProcessEdge[]) => ProcessValidationError[];
  severity: 'error' | 'warning' | 'info';
}

// 流程验证错误类型
export interface ProcessValidationError {
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  edgeId?: string;
  ruleId?: string;
  suggestion?: string;
}

// 流程验证结果类型
export interface ProcessValidationResult {
  isValid: boolean;
  errors: ProcessValidationError[];
  warnings: ProcessValidationError[];
  infos: ProcessValidationError[];
  score: number; // 0-100的质量评分
}

// 节点类型配置
export interface NodeTypeConfiguration {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  category: 'flow' | 'task' | 'gateway' | 'event';
  allowedConnections: {
    maxInputs: number | null; // null表示无限制
    maxOutputs: number | null;
    allowSelfConnection: boolean;
  };
  defaultData: Partial<ProcessNodeData>;
  propertySchema: Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
    options?: Array<{ label: string; value: unknown }>;
  }>;
}

// 导出工具类型
export interface ProcessExportOptions {
  format: 'json' | 'xml' | 'bpmn' | 'png' | 'svg';
  includeMetadata: boolean;
  minify: boolean;
}

// 导入工具类型
export interface ProcessImportOptions {
  format: 'json' | 'xml' | 'bpmn';
  validateOnImport: boolean;
  mergeMode: 'replace' | 'merge' | 'append';
}
