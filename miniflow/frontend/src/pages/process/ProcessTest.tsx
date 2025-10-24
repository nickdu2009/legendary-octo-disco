import React, { useState } from 'react';
import { Card, Button, Space, message, Row, Col } from 'antd';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';
import SimpleProcessDesigner from '../../components/process/SimpleProcessDesigner';

const ProcessTest: React.FC = () => {
  const [definition, setDefinition] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: []
  });

  const handleDefinitionChange = (nodes: any[], edges: any[]) => {
    setDefinition({ nodes, edges });
  };

  const handleAddStartNode = () => {
    const newNode = {
      id: `start-${Date.now()}`,
      type: 'default',
      position: { x: 100, y: 100 },
      data: { label: '开始节点' },
      style: {
        background: '#52c41a',
        color: 'white',
        border: '1px solid #52c41a',
        borderRadius: '8px',
        padding: '10px',
      }
    };

    setDefinition(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    message.success('开始节点添加成功');
  };

  const handleAddUserTask = () => {
    const newNode = {
      id: `task-${Date.now()}`,
      type: 'default',
      position: { x: 300, y: 100 },
      data: { label: '用户任务' },
      style: {
        background: '#1890ff',
        color: 'white',
        border: '1px solid #1890ff',
        borderRadius: '8px',
        padding: '10px',
      }
    };

    setDefinition(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    message.success('用户任务添加成功');
  };

  const handleAddEndNode = () => {
    const newNode = {
      id: `end-${Date.now()}`,
      type: 'default',
      position: { x: 500, y: 100 },
      data: { label: '结束节点' },
      style: {
        background: '#f5222d',
        color: 'white',
        border: '1px solid #f5222d',
        borderRadius: '8px',
        padding: '10px',
      }
    };

    setDefinition(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    message.success('结束节点添加成功');
  };

  const handleSave = () => {
    console.log('Process Definition:', definition);
    message.success(`流程保存成功！节点数：${definition.nodes.length}，连线数：${definition.edges.length}`);
  };

  return (
    <div style={{ height: '100vh', padding: '16px' }}>
      <Card 
        title="ReactFlow 流程建模器测试"
        extra={
          <Space>
            <Button icon={<PlusOutlined />} onClick={handleAddStartNode}>
              添加开始
            </Button>
            <Button icon={<PlusOutlined />} onClick={handleAddUserTask}>
              添加任务
            </Button>
            <Button icon={<PlusOutlined />} onClick={handleAddEndNode}>
              添加结束
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存流程
            </Button>
          </Space>
        }
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '8px' }}
      >
        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          <Col span={18} style={{ height: '100%' }}>
            <div style={{ height: '100%', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
              <SimpleProcessDesigner onDefinitionChange={handleDefinitionChange} />
            </div>
          </Col>
          
          <Col span={6}>
            <Card title="流程信息" size="small">
              <div style={{ fontSize: '12px' }}>
                <div>节点数量: {definition.nodes.length}</div>
                <div>连线数量: {definition.edges.length}</div>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>使用说明:</div>
                  <div>1. 点击上方按钮添加节点</div>
                  <div>2. 拖拽节点调整位置</div>
                  <div>3. 连接节点创建流程</div>
                  <div>4. 点击保存测试功能</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ProcessTest;
