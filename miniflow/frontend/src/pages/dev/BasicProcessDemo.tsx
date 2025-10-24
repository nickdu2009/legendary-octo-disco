import React, { useState, useCallback } from 'react';
import { Card, Button, Space, message, Row, Col } from 'antd';
import { PlusOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';

// 简单的流程节点类型
interface SimpleNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  style: React.CSSProperties;
}

interface SimpleEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

const BasicProcessDemo: React.FC = () => {
  const [nodes, setNodes] = useState<SimpleNode[]>([]);
  const [edges, setEdges] = useState<SimpleEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeTypes = [
    { type: 'start', name: '开始', color: '#52c41a' },
    { type: 'userTask', name: '用户任务', color: '#1890ff' },
    { type: 'serviceTask', name: '服务任务', color: '#722ed1' },
    { type: 'gateway', name: '网关', color: '#fa8c16' },
    { type: 'end', name: '结束', color: '#f5222d' },
  ];

  const addNode = useCallback((type: string, name: string, color: string) => {
    const newNode: SimpleNode = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      x: Math.random() * 400 + 100,
      y: Math.random() * 200 + 100,
      style: {
        background: color,
        color: 'white',
        border: `2px solid ${color}`,
        borderRadius: '8px',
        padding: '8px 12px',
        cursor: 'move',
        minWidth: '80px',
        textAlign: 'center',
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    message.success(`${name}节点添加成功`);
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setEdges(prev => prev.filter(edge => edge.from !== nodeId && edge.to !== nodeId));
    setSelectedNodeId(null);
    message.success('节点删除成功');
  }, []);

  const connectNodes = useCallback((fromId: string, toId: string) => {
    const newEdge: SimpleEdge = {
      id: `edge-${fromId}-${toId}`,
      from: fromId,
      to: toId,
      label: '连线'
    };
    
    setEdges(prev => [...prev, newEdge]);
    message.success('节点连接成功');
  }, []);

  const handleSave = () => {
    const processDefinition = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        name: node.name,
        x: node.x,
        y: node.y,
        props: {}
      })),
      flows: edges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label || '',
        condition: ''
      }))
    };
    
    console.log('Process Definition:', processDefinition);
    message.success(`流程保存成功！节点数：${nodes.length}，连线数：${edges.length}`);
  };

  const selectedNode = nodes.find(node => node.id === selectedNodeId);

  return (
    <div style={{ height: '100vh', padding: '16px' }}>
      <Card 
        title="基础流程建模器 Demo"
        extra={
          <Space>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存流程
            </Button>
          </Space>
        }
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '8px' }}
      >
        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          {/* 左侧工具栏 */}
          <Col span={4}>
            <Card title="节点工具箱" size="small" style={{ marginBottom: '16px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {nodeTypes.map(nodeType => (
                  <Button
                    key={nodeType.type}
                    block
                    onClick={() => addNode(nodeType.type, nodeType.name, nodeType.color)}
                    style={{
                      borderColor: nodeType.color,
                      color: nodeType.color,
                    }}
                  >
                    {nodeType.name}
                  </Button>
                ))}
              </Space>
            </Card>

            {/* 节点属性面板 */}
            {selectedNode && (
              <Card title="节点属性" size="small">
                <div style={{ fontSize: '12px' }}>
                  <div><strong>ID:</strong> {selectedNode.id}</div>
                  <div><strong>类型:</strong> {selectedNode.type}</div>
                  <div><strong>名称:</strong> {selectedNode.name}</div>
                  <div><strong>位置:</strong> ({Math.round(selectedNode.x)}, {Math.round(selectedNode.y)})</div>
                  <Button 
                    danger 
                    size="small" 
                    icon={<DeleteOutlined />} 
                    onClick={() => deleteNode(selectedNode.id)}
                    style={{ marginTop: '8px' }}
                    block
                  >
                    删除节点
                  </Button>
                </div>
              </Card>
            )}
          </Col>
          
          {/* 中间画布 */}
          <Col span={16}>
            <Card 
              title="流程画布" 
              size="small"
              style={{ height: '100%' }}
              bodyStyle={{ height: 'calc(100% - 40px)', position: 'relative' }}
            >
              <div 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  background: 'radial-gradient(circle, #e8e8e8 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* 渲染节点 */}
                {nodes.map(node => (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                      ...node.style,
                      border: selectedNodeId === node.id ? '3px solid #1890ff' : node.style.border,
                    }}
                    onClick={() => setSelectedNodeId(node.id)}
                    onDoubleClick={() => {
                      // 简单的连接逻辑：双击两个节点来连接
                      if (selectedNodeId && selectedNodeId !== node.id) {
                        connectNodes(selectedNodeId, node.id);
                        setSelectedNodeId(null);
                      }
                    }}
                  >
                    {node.name}
                  </div>
                ))}

                {/* 渲染连线（简单版本） */}
                <svg 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                >
                  {edges.map(edge => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);
                    
                    if (!fromNode || !toNode) return null;
                    
                    return (
                      <line
                        key={edge.id}
                        x1={fromNode.x + 40}
                        y1={fromNode.y + 15}
                        x2={toNode.x}
                        y2={toNode.y + 15}
                        stroke="#1890ff"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}
                  
                  {/* 箭头标记 */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill="#1890ff"
                      />
                    </marker>
                  </defs>
                </svg>
              </div>
            </Card>
          </Col>
          
          {/* 右侧信息面板 */}
          <Col span={4}>
            <Card title="流程信息" size="small">
              <div style={{ fontSize: '12px' }}>
                <div><strong>节点数量:</strong> {nodes.length}</div>
                <div><strong>连线数量:</strong> {edges.length}</div>
                
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>使用说明:</div>
                  <div>1. 点击左侧按钮添加节点</div>
                  <div>2. 点击节点选中</div>
                  <div>3. 双击两个节点连接</div>
                  <div>4. 在属性面板删除节点</div>
                  <div>5. 点击保存查看定义</div>
                </div>

                {nodes.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>节点列表:</div>
                    {nodes.map(node => (
                      <div 
                        key={node.id} 
                        style={{ 
                          fontSize: '11px', 
                          padding: '2px 4px',
                          background: selectedNodeId === node.id ? '#e6f7ff' : 'transparent',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        {node.name}
                      </div>
                    ))}
                  </div>
                )}

                {edges.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>连线列表:</div>
                    {edges.map(edge => {
                      const fromNode = nodes.find(n => n.id === edge.from);
                      const toNode = nodes.find(n => n.id === edge.to);
                      return (
                        <div key={edge.id} style={{ fontSize: '11px' }}>
                          {fromNode?.name} → {toNode?.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default BasicProcessDemo;
