import React, { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type NodeTypes,
  type Node,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './nodes/ProcessNodes.css';

import StartNode from './nodes/StartNode';
import EndNode from './nodes/EndNode';
import UserTaskNode from './nodes/UserTaskNode';
import GatewayNode from './nodes/GatewayNode';
import type { ReactFlowNode, ReactFlowEdge } from '../../types/process';

interface ProcessDesignerProps {
  initialNodes?: ReactFlowNode[];
  initialEdges?: ReactFlowEdge[];
  onNodesChange?: (nodes: ReactFlowNode[]) => void;
  onEdgesChange?: (edges: ReactFlowEdge[]) => void;
  onSelectionChange?: (selectedNodes: ReactFlowNode[], selectedEdges: ReactFlowEdge[]) => void;
  readonly?: boolean;
}

const ProcessDesigner: React.FC<ProcessDesignerProps> = ({
  initialNodes = [],
  initialEdges = [],
  onNodesChange: onExternalNodesChange,
  onEdgesChange: onExternalEdgesChange,
  onSelectionChange,
  readonly = false,
}) => {
  const nodeTypes: NodeTypes = useMemo(() => ({
    start: StartNode,
    end: EndNode,
    userTask: UserTaskNode,
    gateway: GatewayNode,
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodes, setSelectedNodes] = useState<ReactFlowNode[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<ReactFlowEdge[]>([]);

  // 处理连线创建
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (readonly) return;
      
      const edge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'smoothstep',
        animated: true,
        data: {
          label: '',
          condition: '',
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, readonly]
  );

  // 处理节点变化
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // 延迟获取更新后的节点，避免闭包问题
      setTimeout(() => {
        setNodes((currentNodes) => {
          onExternalNodesChange?.(currentNodes as ReactFlowNode[]);
          return currentNodes;
        });
      }, 0);
    },
    [onNodesChange, onExternalNodesChange, setNodes]
  );

  // 处理连线变化
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      // 延迟获取更新后的连线
      setTimeout(() => {
        setEdges((currentEdges) => {
          onExternalEdgesChange?.(currentEdges as ReactFlowEdge[]);
          return currentEdges;
        });
      }, 0);
    },
    [onEdgesChange, onExternalEdgesChange, setEdges]
  );

  // 处理选择变化
  const handleSelectionChange = useCallback(
    (params: { nodes: Node[]; edges: Edge[] }) => {
      const selectedNodesList = params.nodes as ReactFlowNode[];
      const selectedEdgesList = params.edges as ReactFlowEdge[];
      
      setSelectedNodes(selectedNodesList);
      setSelectedEdges(selectedEdgesList);
      
      onSelectionChange?.(selectedNodesList, selectedEdgesList);
    },
    [onSelectionChange]
  );

  // 处理画布点击
  const handlePaneClick = useCallback(() => {
    setSelectedNodes([]);
    setSelectedEdges([]);
    onSelectionChange?.([], []);
  }, [onSelectionChange]);

  return (
    <div className="process-designer" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.5,
          maxZoom: 2,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={4}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        deleteKeyCode="Delete"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#f0f0f0" 
        />
        <Controls 
          position="bottom-right"
          showInteractive={false}
        />
        <MiniMap 
          position="bottom-left"
          nodeColor={(node) => {
            switch (node.type) {
              case 'start': return '#52c41a';
              case 'end': return '#f5222d';
              case 'userTask': return '#1890ff';
              case 'gateway': return '#fa8c16';
              default: return '#d9d9d9';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{
            backgroundColor: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default ProcessDesigner;
