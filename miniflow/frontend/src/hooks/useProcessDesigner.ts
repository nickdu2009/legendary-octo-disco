/**
 * 流程设计器状态管理Hook
 * 提供类型安全的状态管理和操作方法
 */

import { useState, useCallback, useReducer, useRef, useEffect } from 'react';
import type { Node, Edge } from 'reactflow';
import type { 
  ProcessDesignerState,
  ProcessDesignerAction,
  TypedProcessNode,
  TypedProcessEdge
} from '../types/components';
import type { 
  BackendProcessDefinitionData,
  ProcessValidationResult
} from '../types/process';
import { ProcessConverter } from '../utils/processConverter';

// 状态管理Reducer
function processDesignerReducer(
  state: ProcessDesignerState,
  action: ProcessDesignerAction
): ProcessDesignerState {
  switch (action.type) {
    case 'ADD_NODE':
      return {
        ...state,
        nodes: [...state.nodes, action.payload],
        isModified: true,
      };

    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(node =>
          node.id === action.payload.id
            ? { ...node, data: { ...node.data, ...action.payload.updates } }
            : node
        ),
        isModified: true,
      };

    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter(node => node.id !== action.payload),
        edges: state.edges.filter(edge => 
          edge.source !== action.payload && edge.target !== action.payload
        ),
        selectedItems: {
          nodes: state.selectedItems.nodes.filter(id => id !== action.payload),
          edges: state.selectedItems.edges,
        },
        isModified: true,
      };

    case 'ADD_EDGE':
      return {
        ...state,
        edges: [...state.edges, action.payload],
        isModified: true,
      };

    case 'UPDATE_EDGE':
      return {
        ...state,
        edges: state.edges.map(edge =>
          edge.id === action.payload.id
            ? { ...edge, data: { ...edge.data, ...action.payload.updates } }
            : edge
        ),
        isModified: true,
      };

    case 'DELETE_EDGE':
      return {
        ...state,
        edges: state.edges.filter(edge => edge.id !== action.payload),
        selectedItems: {
          nodes: state.selectedItems.nodes,
          edges: state.selectedItems.edges.filter(id => id !== action.payload),
        },
        isModified: true,
      };

    case 'SELECT_ITEMS':
      return {
        ...state,
        selectedItems: action.payload,
      };

    case 'SET_VIEWPORT':
      return {
        ...state,
        viewport: action.payload,
      };

    case 'SET_VALIDATION_RESULT':
      return {
        ...state,
        validationResult: action.payload,
        isValidating: false,
      };

    case 'SET_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isLoading: action.payload,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          error: action.payload,
        },
      };

    case 'UNDO':
      if (state.history.past.length === 0) return state;
      
      const previous = state.history.past[state.history.past.length - 1];
      return {
        ...state,
        nodes: previous.nodes,
        edges: previous.edges,
        history: {
          past: state.history.past.slice(0, -1),
          future: [
            { nodes: state.nodes, edges: state.edges },
            ...state.history.future,
          ],
          canUndo: state.history.past.length > 1,
          canRedo: true,
        },
      };

    case 'REDO':
      if (state.history.future.length === 0) return state;
      
      const next = state.history.future[0];
      return {
        ...state,
        nodes: next.nodes,
        edges: next.edges,
        history: {
          past: [
            ...state.history.past,
            { nodes: state.nodes, edges: state.edges },
          ],
          future: state.history.future.slice(1),
          canUndo: true,
          canRedo: state.history.future.length > 1,
        },
      };

    case 'RESET':
      return createInitialState();

    case 'LOAD_DEFINITION':
      const { nodes, edges } = ProcessConverter.backendToReactFlow(action.payload);
      return {
        ...state,
        nodes: nodes as TypedProcessNode[],
        edges: edges as TypedProcessEdge[],
        isModified: false,
        lastSavedAt: new Date(),
      };

    default:
      return state;
  }
}

// 创建初始状态
function createInitialState(): ProcessDesignerState {
  return {
    nodes: [],
    edges: [],
    selectedItems: { nodes: [], edges: [] },
    isModified: false,
    lastSavedAt: null,
    validationResult: null,
    isValidating: false,
    viewport: { x: 0, y: 0, zoom: 1 },
    history: {
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    },
    ui: {
      showMiniMap: true,
      showControls: true,
      showBackground: true,
      snapToGrid: true,
      isLoading: false,
      error: null,
    },
  };
}

// 流程设计器Hook
export function useProcessDesigner(initialDefinition?: BackendProcessDefinitionData) {
  const [state, dispatch] = useReducer(processDesignerReducer, createInitialState());
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // 初始化数据
  useEffect(() => {
    if (initialDefinition) {
      dispatch({ type: 'LOAD_DEFINITION', payload: initialDefinition });
    }
  }, [initialDefinition]);

  // 节点操作方法
  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: TypedProcessNode = {
      id: ProcessConverter.generateNodeId(nodeType),
      type: nodeType as TypedProcessNode['type'],
      position,
      data: ProcessConverter.createDefaultNodeData(nodeType) as ProcessNodeData,
    };
    
    dispatch({ type: 'ADD_NODE', payload: newNode });
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<ProcessNodeData>) => {
    dispatch({ type: 'UPDATE_NODE', payload: { id: nodeId, updates } });
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    dispatch({ type: 'DELETE_NODE', payload: nodeId });
  }, []);

  // 连线操作方法
  const addEdge = useCallback((sourceId: string, targetId: string, data?: ProcessEdgeData) => {
    const newEdge: TypedProcessEdge = {
      id: ProcessConverter.generateEdgeId(sourceId, targetId),
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      animated: true,
      data,
    };
    
    dispatch({ type: 'ADD_EDGE', payload: newEdge });
  }, []);

  const updateEdge = useCallback((edgeId: string, updates: Partial<ProcessEdgeData>) => {
    dispatch({ type: 'UPDATE_EDGE', payload: { id: edgeId, updates } });
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    dispatch({ type: 'DELETE_EDGE', payload: edgeId });
  }, []);

  // 选择操作方法
  const selectItems = useCallback((nodes: string[], edges: string[]) => {
    dispatch({ type: 'SELECT_ITEMS', payload: { nodes, edges } });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'SELECT_ITEMS', payload: { nodes: [], edges: [] } });
  }, []);

  // 视图操作方法
  const setViewport = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    dispatch({ type: 'SET_VIEWPORT', payload: viewport });
  }, []);

  // 历史操作方法
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // 验证方法
  const validate = useCallback(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // 防抖验证
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    validationTimeoutRef.current = setTimeout(() => {
      const backendDefinition = ProcessConverter.reactFlowToBackend(
        state.nodes as Node[], 
        state.edges as Edge[]
      );
      const result = ProcessConverter.validateProcess(
        backendDefinition.nodes, 
        backendDefinition.flows
      );
      
      dispatch({ type: 'SET_VALIDATION_RESULT', payload: result });
      dispatch({ type: 'SET_LOADING', payload: false });
    }, 500);
  }, [state.nodes, state.edges]);

  // 自动验证
  useEffect(() => {
    if (state.nodes.length > 0 || state.edges.length > 0) {
      validate();
    }
  }, [state.nodes, state.edges, validate]);

  // 获取当前定义
  const getCurrentDefinition = useCallback((): BackendProcessDefinitionData => {
    return ProcessConverter.reactFlowToBackend(
      state.nodes as Node[], 
      state.edges as Edge[]
    );
  }, [state.nodes, state.edges]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // 状态
    state,
    
    // 节点操作
    addNode,
    updateNode,
    deleteNode,
    
    // 连线操作
    addEdge,
    updateEdge,
    deleteEdge,
    
    // 选择操作
    selectItems,
    clearSelection,
    
    // 视图操作
    setViewport,
    
    // 历史操作
    undo,
    redo,
    reset,
    canUndo: state.history.canUndo,
    canRedo: state.history.canRedo,
    
    // 验证
    validate,
    validationResult: state.validationResult,
    isValidating: state.isValidating,
    
    // 数据获取
    getCurrentDefinition,
    
    // 状态查询
    isModified: state.isModified,
    selectedNodes: state.selectedItems.nodes,
    selectedEdges: state.selectedItems.edges,
    isLoading: state.ui.isLoading,
    error: state.ui.error,
  };
}
