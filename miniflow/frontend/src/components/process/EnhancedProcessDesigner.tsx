/**
 * 增强的流程设计器组件
 * 支持键盘快捷键、批量选择、智能对齐等生产级功能
 */

import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from 'reactflow';
import { message } from 'antd';

// Import styles
import 'reactflow/dist/style.css';
import './nodes/nodes.css';

// Import custom nodes
import StartNode from './nodes/StartNode';
import EndNode from './nodes/EndNode';
import UserTaskNode from './nodes/UserTaskNode';
import ServiceTaskNode from './nodes/ServiceTaskNode';
import GatewayNode from './nodes/GatewayNode';

// Import utilities
import { ProcessConverter } from '../../utils/processConverter';
import type { BackendProcessDefinitionData } from '../../types/process';

// Define node types
const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  userTask: UserTaskNode,
  serviceTask: ServiceTaskNode,
  gateway: GatewayNode,
};

interface EnhancedProcessDesignerProps {
  initialDefinition?: BackendProcessDefinitionData;
  onDefinitionChange?: (definition: BackendProcessDefinitionData) => void;
  onSelectionChange?: (selectedNodes: Node[], selectedEdges: Edge[]) => void;
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  readonly?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

const EnhancedProcessDesigner: React.FC<EnhancedProcessDesignerProps> = ({
  initialDefinition,
  onDefinitionChange,
  onSelectionChange,
  onNodePositionChange,
  readonly = false,
  autoSave = false,
  autoSaveInterval = 5000,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Initialize nodes and edges
  const initialData = useMemo(() => {
    if (initialDefinition) {
      return ProcessConverter.backendToReactFlow(initialDefinition);
    }
    return { nodes: [], edges: [] };
  }, [initialDefinition]);

  const [nodes, setNodes, onNodesChange]: [Node[], (nodes: Node[]) => void, OnNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange]: [Edge[], (edges: Edge[]) => void, OnEdgesChange] = useEdgesState(initialData.edges);

  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);

  // History state for undo/redo
  const [history, setHistory] = useState<{
    past: Array<{ nodes: Node[]; edges: Edge[] }>;
    future: Array<{ nodes: Node[]; edges: Edge[] }>;
  }>({ past: [], future: [] });

  // Auto save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Save current state to history
  const saveToHistory = useCallback(() => {
    setHistory(prev => ({
      past: [...prev.past, { nodes, edges }],
      future: [], // Clear future when new action is performed
    }));
  }, [nodes, edges]);

  // Undo operation
  const undo = useCallback(() => {
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    setHistory({
      past: newPast,
      future: [{ nodes, edges }, ...history.future],
    });

    setNodes(previous.nodes);
    setEdges(previous.edges);
    message.success('撤销成功');
  }, [history, nodes, edges, setNodes, setEdges]);

  // Redo operation
  const redo = useCallback(() => {
    if (history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);

    setHistory({
      past: [...history.past, { nodes, edges }],
      future: newFuture,
    });

    setNodes(next.nodes);
    setEdges(next.edges);
    message.success('重做成功');
  }, [history, nodes, edges, setNodes, setEdges]);

  // Select all nodes and edges
  const selectAll = useCallback(() => {
    setSelectedNodes(nodes);
    setSelectedEdges(edges);
    message.info(`已选择 ${nodes.length} 个节点和 ${edges.length} 条连线`);
  }, [nodes, edges]);

  // Delete selected items
  const deleteSelectedItems = useCallback(() => {
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return;
    }

    saveToHistory();

    const selectedNodeIds = selectedNodes.map(n => n.id);
    const selectedEdgeIds = selectedEdges.map(e => e.id);

    // Remove selected nodes and their connected edges
    setNodes(nds => nds.filter(node => !selectedNodeIds.includes(node.id)));
    setEdges(eds => eds.filter(edge => 
      !selectedEdgeIds.includes(edge.id) &&
      !selectedNodeIds.includes(edge.source) &&
      !selectedNodeIds.includes(edge.target)
    ));

    setSelectedNodes([]);
    setSelectedEdges([]);

    message.success(`已删除 ${selectedNodes.length} 个节点和 ${selectedEdges.length} 条连线`);
  }, [selectedNodes, selectedEdges, saveToHistory, setNodes, setEdges]);

  // Snap to grid function
  const snapToGrid = useCallback((position: { x: number; y: number }, gridSize = 15) => {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (readonly) return;

    // Prevent default for handled shortcuts
    const shouldPreventDefault = ['Delete', 'Backspace'].includes(event.key) ||
      (event.ctrlKey || event.metaKey) && ['z', 'y', 'a', 's'].includes(event.key);

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      deleteSelectedItems();
    } else if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 'y':
          redo();
          break;
        case 'a':
          selectAll();
          break;
        case 's':
          onDefinitionChange?.(ProcessConverter.reactFlowToBackend(nodes, edges));
          message.success('流程已保存');
          break;
      }
    }
  }, [readonly, deleteSelectedItems, undo, redo, selectAll, onDefinitionChange, nodes, edges]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle connection creation
  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (readonly) return;
    
    if (!params.source || !params.target) {
      message.error('连线创建失败：缺少源节点或目标节点');
      return;
    }

    saveToHistory();

    const edge: Edge = {
      ...params,
      id: ProcessConverter.generateEdgeId(params.source, params.target),
      type: 'smoothstep',
      animated: true,
      source: params.source,
      target: params.target,
    };
    
    setEdges((eds) => addEdge(edge, eds));
    message.success('连线创建成功');
  }, [setEdges, readonly, saveToHistory]);

  // Handle node drag stop with position saving
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    if (readonly) return;

    // Snap to grid
    const snappedPosition = snapToGrid(node.position);
    
    if (snappedPosition.x !== node.position.x || snappedPosition.y !== node.position.y) {
      setNodes(nds => nds.map(n => 
        n.id === node.id ? { ...n, position: snappedPosition } : n
      ));
    }

    // Notify parent component about position change
    onNodePositionChange?.(node.id, snappedPosition);
  }, [readonly, snapToGrid, setNodes, onNodePositionChange]);

  // Handle selection change
  const onSelectionChangeHandler = useCallback((params: OnSelectionChangeParams) => {
    setSelectedNodes(params.nodes);
    setSelectedEdges(params.edges);
    onSelectionChange?.(params.nodes, params.edges);
  }, [onSelectionChange]);

  // Handle drop (add node from palette)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    if (readonly) return;
    
    event.preventDefault();

    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');

    if (typeof type === 'undefined' || !type || !reactFlowBounds || !reactFlowInstance) {
      return;
    }

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    const snappedPosition = snapToGrid(position);
    addNodeAtPosition(type, snappedPosition);
  }, [reactFlowInstance, readonly, snapToGrid]);

  // Add node at specific position
  const addNodeAtPosition = useCallback((type: string, position: { x: number; y: number }) => {
    if (readonly) return;

    saveToHistory();

    const newNode: Node = {
      id: ProcessConverter.generateNodeId(type),
      type,
      position,
      data: ProcessConverter.createDefaultNodeData(type),
    };

    setNodes((nds) => nds.concat(newNode));
    message.success(`${newNode.data.label}节点添加成功`);
  }, [setNodes, readonly, saveToHistory]);

  // Handle definition change
  React.useEffect(() => {
    const backendDefinition = ProcessConverter.reactFlowToBackend(nodes, edges);
    onDefinitionChange?.(backendDefinition);
  }, [nodes, edges, onDefinitionChange]);

  // Auto save functionality
  useEffect(() => {
    if (autoSave && onDefinitionChange) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        const definition = ProcessConverter.reactFlowToBackend(nodes, edges);
        onDefinitionChange(definition);
      }, autoSaveInterval);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [nodes, edges, autoSave, autoSaveInterval, onDefinitionChange]);

  // Expose methods for parent component
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    addNode: addNodeAtPosition,
    deleteSelectedItems,
    selectAll,
    undo,
    redo,
    fitView: () => reactFlowInstance?.fitView(),
    zoomIn: () => reactFlowInstance?.zoomIn(),
    zoomOut: () => reactFlowInstance?.zoomOut(),
    getSelectedNodes: () => selectedNodes,
    getSelectedEdges: () => selectedEdges,
    clearSelection: () => {
      setSelectedNodes([]);
      setSelectedEdges([]);
    },
    getDefinition: () => ProcessConverter.reactFlowToBackend(nodes, edges),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }));

  return (
    <div className="enhanced-process-designer" style={{ width: '100%', height: '100%' }}>
      <div 
        className="reactflow-wrapper" 
        ref={reactFlowWrapper}
        style={{ width: '100%', height: '100%' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onSelectionChange={onSelectionChangeHandler}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid={true}
          snapGrid={[15, 15]}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
          deleteKeyCode={readonly ? null : ['Backspace', 'Delete']}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 },
          }}
          connectionLineStyle={{ strokeWidth: 2, stroke: '#1890ff' }}
          proOptions={{
            hideAttribution: true,
          }}
        >
          <Background 
            variant="dots" 
            gap={20} 
            size={1}
            style={{ backgroundColor: '#fafafa' }}
          />
          <Controls 
            showInteractive={!readonly}
            showZoom={true}
            showFitView={true}
            showZoomIn={true}
            showZoomOut={true}
          />
          <MiniMap 
            nodeStrokeColor={(n: Node) => {
              if (selectedNodes.some(sn => sn.id === n.id)) return '#1890ff';
              if (n.type === 'start') return '#52c41a';
              if (n.type === 'end') return '#f5222d';
              if (n.type === 'userTask') return '#1890ff';
              if (n.type === 'serviceTask') return '#722ed1';
              if (n.type === 'gateway') return '#fa8c16';
              return '#d9d9d9';
            }}
            nodeColor={(n: Node) => {
              if (selectedNodes.some(sn => sn.id === n.id)) return '#e6f7ff';
              return '#ffffff';
            }}
            nodeBorderRadius={4}
            style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
            }}
          />
        </ReactFlow>
      </div>

      {/* Keyboard shortcuts help */}
      {!readonly && (
        <div 
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            opacity: 0.8,
            pointerEvents: 'none',
          }}
        >
          <div>快捷键: Delete删除 | Ctrl+Z撤销 | Ctrl+Y重做 | Ctrl+A全选 | Ctrl+S保存</div>
        </div>
      )}
    </div>
  );
};

// Wrapped component with ReactFlowProvider
const EnhancedProcessDesignerWrapper: React.FC<EnhancedProcessDesignerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <EnhancedProcessDesigner {...props} />
    </ReactFlowProvider>
  );
};

export default EnhancedProcessDesignerWrapper;
export { EnhancedProcessDesigner };
