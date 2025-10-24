import React, { useCallback, useState, useRef, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type ReactFlowInstance,
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

interface ProcessDesignerProps {
  initialDefinition?: BackendProcessDefinitionData;
  onDefinitionChange?: (definition: BackendProcessDefinitionData) => void;
  onSelectionChange?: (selectedNode: Node | null, selectedEdge: Edge | null) => void;
  readonly?: boolean;
}

const ProcessDesigner: React.FC<ProcessDesignerProps> = ({
  initialDefinition,
  onDefinitionChange,
  onSelectionChange,
  readonly = false
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

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Handle connection creation
  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (readonly) return;
    
    if (!params.source || !params.target) {
      message.error('连线创建失败：缺少源节点或目标节点');
      return;
    }

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
  }, [setEdges, readonly]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (readonly) return;
    
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    
    const selectedNode = nodes.find(n => n.id === node.id) || null;
    onSelectionChange?.(selectedNode, null);
  }, [nodes, onSelectionChange, readonly]);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (readonly) return;
    
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    
    const selectedEdge = edges.find(e => e.id === edge.id) || null;
    onSelectionChange?.(null, selectedEdge);
  }, [edges, onSelectionChange, readonly]);

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    onSelectionChange?.(null, null);
  }, [onSelectionChange]);

  // Handle drag over (for node dropping)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop (add node from palette)
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

    addNodeAtPosition(type, position);
  }, [reactFlowInstance, readonly]);

  // Add node at specific position
  const addNodeAtPosition = useCallback((type: string, position: { x: number; y: number }) => {
    if (readonly) return;

    const newNode: Node = {
      id: ProcessConverter.generateNodeId(type),
      type,
      position,
      data: ProcessConverter.createDefaultNodeData(type),
    };

    setNodes((nds) => nds.concat(newNode));
    message.success(`${newNode.data.label}节点添加成功`);
  }, [setNodes, readonly]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, updates: Record<string, unknown>) => {
    if (readonly) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [setNodes, readonly]);

  // Update edge data
  const updateEdgeData = useCallback((edgeId: string, updates: Partial<Edge>) => {
    if (readonly) return;

    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { ...edge, ...updates }
          : edge
      )
    );
  }, [setEdges, readonly]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    if (readonly) return;

    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
    onSelectionChange?.(null, null);
    message.success('节点删除成功');
  }, [setNodes, setEdges, onSelectionChange, readonly]);

  // Delete edge
  const deleteEdge = useCallback((edgeId: string) => {
    if (readonly) return;

    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    setSelectedEdgeId(null);
    onSelectionChange?.(null, null);
    message.success('连线删除成功');
  }, [setEdges, onSelectionChange, readonly]);

  // Handle definition change
  React.useEffect(() => {
    const backendDefinition = ProcessConverter.reactFlowToBackend(nodes, edges);
    onDefinitionChange?.(backendDefinition);
  }, [nodes, edges, onDefinitionChange]);

  // Get selected node and edge for properties panel
  const selectedNode = useMemo(() => {
    return selectedNodeId ? nodes.find(n => n.id === selectedNodeId) || null : null;
  }, [selectedNodeId, nodes]);

  const selectedEdge = useMemo(() => {
    return selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) || null : null;
  }, [selectedEdgeId, edges]);

  // Expose methods for parent component
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    addNode: addNodeAtPosition,
    updateNode: updateNodeData,
    updateEdge: updateEdgeData,
    deleteNode,
    deleteEdge,
    getSelectedNode: () => selectedNode,
    getSelectedEdge: () => selectedEdge,
    clearSelection: () => {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      onSelectionChange?.(null, null);
    },
    fitView: () => reactFlowInstance?.fitView(),
    getDefinition: () => ProcessConverter.reactFlowToBackend(nodes, edges),
  }));

  return (
    <div className="process-designer" style={{ width: '100%', height: '100%' }}>
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
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 },
          }}
          connectionLineStyle={{ strokeWidth: 2, stroke: '#1890ff' }}
          deleteKeyCode={readonly ? null : ['Backspace', 'Delete']}
          multiSelectionKeyCode={readonly ? null : 'Shift'}
        >
          <Background variant="dots" gap={20} size={1} />
          <Controls showInteractive={!readonly} />
          <MiniMap 
            nodeStrokeColor={(n: Node) => {
              if (n.type === 'start') return '#52c41a';
              if (n.type === 'end') return '#f5222d';
              if (n.type === 'userTask') return '#1890ff';
              if (n.type === 'serviceTask') return '#722ed1';
              if (n.type === 'gateway') return '#fa8c16';
              return '#d9d9d9';
            }}
            nodeColor={(n: Node) => {
              if (n.id === selectedNodeId) return '#ff4d4f';
              return '#ffffff';
            }}
            nodeBorderRadius={2}
            style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrapped component with ReactFlowProvider
const ProcessDesignerWrapper: React.FC<ProcessDesignerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ProcessDesigner {...props} />
    </ReactFlowProvider>
  );
};

export default ProcessDesignerWrapper;
export { ProcessDesigner };
