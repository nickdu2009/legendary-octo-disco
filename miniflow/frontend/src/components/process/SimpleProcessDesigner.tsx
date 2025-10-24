import React, { useCallback, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import { message } from 'antd';
import 'reactflow/dist/style.css';

// Simple node types without custom components for now
const nodeTypes = {};

interface SimpleProcessDesignerProps {
  onDefinitionChange?: (nodes: any[], edges: any[]) => void;
}

const SimpleProcessDesigner: React.FC<SimpleProcessDesignerProps> = ({
  onDefinitionChange
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params: any) => {
    const newEdge = {
      ...params,
      id: `edge-${params.source}-${params.target}-${Date.now()}`,
      type: 'smoothstep',
      animated: true,
    };
    setEdges((eds) => addEdge(newEdge, eds));
    message.success('连线创建成功');
  }, [setEdges]);

  // Notify parent of changes
  React.useEffect(() => {
    onDefinitionChange?.(nodes, edges);
  }, [nodes, edges, onDefinitionChange]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background variant="dots" gap={20} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default SimpleProcessDesigner;
