/**
 * 组件相关的强类型定义
 * 增强组件Props和State的类型安全性
 */

import type { ReactNode } from 'react';
import type { Node, Edge } from 'reactflow';
import type { 
  ProcessDefinition,
  BackendProcessDefinitionData,
  ProcessValidationResult
} from './process';
import type { 
  TypedProcessNode,
  TypedProcessEdge,
  ProcessNodeData,
  ProcessEdgeData,
  NodeTypeConfiguration
} from './reactflow';

// 基础组件Props类型
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

// 流程设计器Props类型
export interface ProcessDesignerProps extends BaseComponentProps {
  initialDefinition?: BackendProcessDefinitionData;
  readonly?: boolean;
  onDefinitionChange?: (definition: BackendProcessDefinitionData) => void;
  onSelectionChange?: (node: Node | null, edge: Edge | null) => void;
  onValidationChange?: (result: ProcessValidationResult) => void;
  onNodeAdd?: (node: TypedProcessNode) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<ProcessNodeData>) => void;
  onNodeDelete?: (nodeId: string) => void;
  onEdgeAdd?: (edge: TypedProcessEdge) => void;
  onEdgeUpdate?: (edgeId: string, updates: Partial<ProcessEdgeData>) => void;
  onEdgeDelete?: (edgeId: string) => void;
  config?: {
    snapToGrid?: boolean;
    snapGrid?: [number, number];
    showMiniMap?: boolean;
    showControls?: boolean;
    showBackground?: boolean;
    fitViewOnInit?: boolean;
    maxZoom?: number;
    minZoom?: number;
  };
}

// 节点工具栏Props类型
export interface NodePaletteProps extends BaseComponentProps {
  nodeTypes?: NodeTypeConfiguration[];
  onAddNode: (nodeType: string, position?: { x: number; y: number }) => void;
  onDragStart?: (event: React.DragEvent, nodeType: string) => void;
  orientation?: 'vertical' | 'horizontal';
  collapsible?: boolean;
  searchable?: boolean;
  groupBy?: 'category' | 'type' | 'none';
}

// 属性面板Props类型
export interface NodePropertiesPanelProps extends BaseComponentProps {
  selectedNode: TypedProcessNode | null;
  selectedEdge: TypedProcessEdge | null;
  onUpdateNode: (nodeId: string, updates: Partial<ProcessNodeData>) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<ProcessEdgeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onValidate?: (item: TypedProcessNode | TypedProcessEdge) => ProcessValidationResult;
  config?: {
    showAdvancedProperties?: boolean;
    showDebugInfo?: boolean;
    autoSave?: boolean;
    autoSaveDelay?: number;
  };
}

// 流程列表Props类型
export interface ProcessListProps extends BaseComponentProps {
  onProcessSelect?: (process: ProcessDefinition) => void;
  onProcessCreate?: () => void;
  onProcessEdit?: (processId: number) => void;
  onProcessDelete?: (processId: number) => void;
  onProcessCopy?: (processId: number) => void;
  filters?: {
    categories?: string[];
    statuses?: string[];
    creators?: string[];
  };
  config?: {
    pageSize?: number;
    showStats?: boolean;
    showFilters?: boolean;
    showBatchActions?: boolean;
    allowExport?: boolean;
    allowImport?: boolean;
  };
}

// 流程编辑器Props类型
export interface ProcessEditProps extends BaseComponentProps {
  processId?: number;
  mode?: 'create' | 'edit' | 'view' | 'copy';
  initialData?: Partial<ProcessDefinition>;
  onSave?: (process: ProcessDefinition) => void;
  onCancel?: () => void;
  onValidationChange?: (result: ProcessValidationResult) => void;
  config?: {
    autoSave?: boolean;
    autoSaveInterval?: number;
    showPreview?: boolean;
    showValidation?: boolean;
    allowAdvancedEdit?: boolean;
  };
}

// 节点组件通用Props类型
export interface BaseNodeProps<T extends ProcessNodeData = ProcessNodeData> {
  id: string;
  data: T;
  selected?: boolean;
  dragging?: boolean;
  connecting?: boolean;
  onClick?: (nodeId: string) => void;
  onDoubleClick?: (nodeId: string) => void;
  onContextMenu?: (nodeId: string, event: React.MouseEvent) => void;
  config?: {
    showLabel?: boolean;
    showDescription?: boolean;
    showStatus?: boolean;
    interactive?: boolean;
  };
}

// 状态管理类型
export interface ProcessDesignerState {
  // 核心数据
  nodes: TypedProcessNode[];
  edges: TypedProcessEdge[];
  
  // 选择状态
  selectedItems: {
    nodes: string[];
    edges: string[];
  };
  
  // 编辑状态
  isModified: boolean;
  lastSavedAt: Date | null;
  
  // 验证状态
  validationResult: ProcessValidationResult | null;
  isValidating: boolean;
  
  // 视图状态
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  
  // 操作历史
  history: {
    past: Array<{
      nodes: TypedProcessNode[];
      edges: TypedProcessEdge[];
    }>;
    future: Array<{
      nodes: TypedProcessNode[];
      edges: TypedProcessEdge[];
    }>;
    canUndo: boolean;
    canRedo: boolean;
  };
  
  // UI状态
  ui: {
    showMiniMap: boolean;
    showControls: boolean;
    showBackground: boolean;
    snapToGrid: boolean;
    isLoading: boolean;
    error: string | null;
  };
}

// 操作类型定义
export type ProcessDesignerAction = 
  | { type: 'ADD_NODE'; payload: TypedProcessNode }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<ProcessNodeData> } }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'ADD_EDGE'; payload: TypedProcessEdge }
  | { type: 'UPDATE_EDGE'; payload: { id: string; updates: Partial<ProcessEdgeData> } }
  | { type: 'DELETE_EDGE'; payload: string }
  | { type: 'SELECT_ITEMS'; payload: { nodes: string[]; edges: string[] } }
  | { type: 'SET_VIEWPORT'; payload: { x: number; y: number; zoom: number } }
  | { type: 'SET_VALIDATION_RESULT'; payload: ProcessValidationResult }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' }
  | { type: 'LOAD_DEFINITION'; payload: BackendProcessDefinitionData };

// 事件处理器类型
export interface ProcessDesignerEventHandlers {
  onNodeClick?: (event: React.MouseEvent, node: TypedProcessNode) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: TypedProcessNode) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: TypedProcessNode) => void;
  onNodeDragStart?: (event: React.MouseEvent, node: TypedProcessNode) => void;
  onNodeDrag?: (event: React.MouseEvent, node: TypedProcessNode) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: TypedProcessNode) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: TypedProcessEdge) => void;
  onEdgeDoubleClick?: (event: React.MouseEvent, edge: TypedProcessEdge) => void;
  onEdgeContextMenu?: (event: React.MouseEvent, edge: TypedProcessEdge) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onSelectionChange?: (nodes: TypedProcessNode[], edges: TypedProcessEdge[]) => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
}

// 工具栏配置类型
export interface ToolbarConfig {
  showSave?: boolean;
  showUndo?: boolean;
  showRedo?: boolean;
  showClear?: boolean;
  showValidate?: boolean;
  showExport?: boolean;
  showImport?: boolean;
  showPreview?: boolean;
  customButtons?: Array<{
    key: string;
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    tooltip?: string;
  }>;
}

// 主题配置类型
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  nodeStyles: {
    [nodeType: string]: {
      background: string;
      border: string;
      color: string;
      fontSize: number;
      borderRadius: number;
    };
  };
  edgeStyles: {
    default: {
      stroke: string;
      strokeWidth: number;
      strokeDasharray?: string;
    };
    selected: {
      stroke: string;
      strokeWidth: number;
    };
    animated: {
      stroke: string;
      strokeWidth: number;
      strokeDasharray: string;
    };
  };
}
