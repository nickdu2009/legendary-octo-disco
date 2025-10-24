import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import { Card, Button, Space, message } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';

import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: '开始节点' },
    style: {
      background: '#52c41a',
      color: 'white',
      border: '1px solid #52c41a',
      borderRadius: '8px',
    }
  },
  {
    id: '2',
    type: 'default',
    position: { x: 300, y: 100 },
    data: { label: '用户任务' },
    style: {
      background: '#1890ff',
      color: 'white',
      border: '1px solid #1890ff',
      borderRadius: '8px',
    }
  },
  {
    id: '3',
    type: 'default',
    position: { x: 500, y: 100 },
    data: { label: '结束节点' },
    style: {
      background: '#f5222d',
      color: 'white',
      border: '1px solid #f5222d',
      borderRadius: '8px',
    }
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: true,
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'smoothstep',
    animated: true,
  },
];

const ReactFlowDemo: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: any) => {
    const newEdge = {
      ...params,
      id: `e${params.source}-${params.target}`,
      type: 'smoothstep',
      animated: true,
    };
    setEdges((eds) => addEdge(newEdge, eds));
    message.success('连线创建成功');
  }, [setEdges]);

  const addNewNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { label: `新节点 ${nodes.length + 1}` },
      style: {
        background: '#fa8c16',
        color: 'white',
        border: '1px solid #fa8c16',
        borderRadius: '8px',
      }
    };
    setNodes((nds) => [...nds, newNode]);
    message.success('节点添加成功');
  };

  const handleSave = () => {
    const processDefinition = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type || 'default',
        name: node.data.label,
        x: node.position.x,
        y: node.position.y,
        props: {}
      })),
      flows: edges.map(edge => ({
        id: edge.id,
        from: edge.source,
        to: edge.target,
        label: edge.label || '',
        condition: ''
      }))
    };
    
    console.log('Process Definition:', processDefinition);
    message.success(`流程保存成功！节点数：${nodes.length}，连线数：${edges.length}`);
  };

  return (
    <div style={{ height: '100vh', padding: '16px' }}>
      <Card 
        title="ReactFlow 流程建模器 Demo"
        extra={
          <Space>
            <Button icon={<PlusOutlined />} onClick={addNewNode}>
              添加节点
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存流程
            </Button>
          </Space>
        }
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '8px' }}
      >
        <div style={{ height: '100%', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background variant="dots" gap={20} size={1} />
            <Controls />
            <MiniMap 
              style={{
                background: '#f5f5f5',
                border: '1px solid #d9d9d9',
              }}
            />
          </ReactFlow>
        </div>
        
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          background: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>使用说明:</strong> 拖拽节点调整位置 • 连接节点创建流程 • 选择元素查看属性 • 
          当前节点数: {nodes.length} • 连线数: {edges.length}
        </div>
      </Card>
    </div>
  );
};

export default ReactFlowDemo;
