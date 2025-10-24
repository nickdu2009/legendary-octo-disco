import React, { useEffect } from 'react';
import { Card, Form, Input, Select, Button, Space, Divider, Switch } from 'antd';
import { DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import type { ProcessNode, ProcessEdge } from '../../types/process';

interface NodePropertiesPanelProps {
  selectedNode: ProcessNode | null;
  selectedEdge: ProcessEdge | null;
  onUpdateNode: (nodeId: string, updates: Partial<ProcessNode['data']>) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<ProcessEdge>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (selectedNode) {
      form.setFieldsValue({
        label: selectedNode.data.label,
        description: selectedNode.data.description,
        assignee: selectedNode.data.assignee,
        condition: selectedNode.data.condition,
        serviceType: selectedNode.data.serviceType,
        endpoint: selectedNode.data.endpoint,
        method: selectedNode.data.method,
        gatewayType: selectedNode.data.gatewayType || 'exclusive',
        required: selectedNode.data.required || false,
      });
    } else if (selectedEdge) {
      form.setFieldsValue({
        label: selectedEdge.label,
        condition: selectedEdge.data?.condition,
        animated: selectedEdge.animated || false,
      });
    } else {
      form.resetFields();
    }
  }, [selectedNode, selectedEdge, form]);

  const handleSave = (values: any) => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, values);
    } else if (selectedEdge) {
      onUpdateEdge(selectedEdge.id, {
        label: values.label,
        animated: values.animated,
        data: {
          ...selectedEdge.data,
          condition: values.condition,
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedNode) {
      onDeleteNode(selectedNode.id);
    } else if (selectedEdge) {
      onDeleteEdge(selectedEdge.id);
    }
  };

  const renderNodeProperties = () => {
    if (!selectedNode) return null;

    const { type } = selectedNode;

    return (
      <>
        {/* 通用属性 */}
        <Form.Item name="label" label="节点名称" rules={[{ required: true, message: '请输入节点名称' }]}>
          <Input placeholder="输入节点名称" />
        </Form.Item>

        <Form.Item name="description" label="节点描述">
          <Input.TextArea 
            placeholder="输入节点描述" 
            rows={2}
            showCount
            maxLength={200}
          />
        </Form.Item>

        {/* 用户任务特有属性 */}
        {type === 'userTask' && (
          <>
            <Divider orientation="left" orientationMargin="0" style={{ fontSize: '12px' }}>
              任务配置
            </Divider>
            
            <Form.Item name="assignee" label="处理人">
              <Select placeholder="选择处理人" allowClear>
                <Select.Option value="admin">管理员</Select.Option>
                <Select.Option value="manager">经理</Select.Option>
                <Select.Option value="user">普通用户</Select.Option>
                <Select.Option value="system">系统</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="required" label="必填任务" valuePropName="checked">
              <Switch size="small" />
            </Form.Item>
          </>
        )}

        {/* 服务任务特有属性 */}
        {type === 'serviceTask' && (
          <>
            <Divider orientation="left" orientationMargin="0" style={{ fontSize: '12px' }}>
              服务配置
            </Divider>
            
            <Form.Item name="serviceType" label="服务类型">
              <Select placeholder="选择服务类型">
                <Select.Option value="http">HTTP请求</Select.Option>
                <Select.Option value="database">数据库操作</Select.Option>
                <Select.Option value="email">邮件发送</Select.Option>
                <Select.Option value="script">脚本执行</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="endpoint" label="服务端点">
              <Input placeholder="输入服务端点URL或路径" />
            </Form.Item>

            <Form.Item name="method" label="请求方法">
              <Select placeholder="选择请求方法">
                <Select.Option value="GET">GET</Select.Option>
                <Select.Option value="POST">POST</Select.Option>
                <Select.Option value="PUT">PUT</Select.Option>
                <Select.Option value="DELETE">DELETE</Select.Option>
              </Select>
            </Form.Item>
          </>
        )}

        {/* 网关特有属性 */}
        {type === 'gateway' && (
          <>
            <Divider orientation="left" orientationMargin="0" style={{ fontSize: '12px' }}>
              网关配置
            </Divider>
            
            <Form.Item name="gatewayType" label="网关类型">
              <Select placeholder="选择网关类型">
                <Select.Option value="exclusive">排他网关</Select.Option>
                <Select.Option value="parallel">并行网关</Select.Option>
                <Select.Option value="inclusive">包容网关</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="condition" label="条件表达式">
              <Input.TextArea 
                placeholder="输入条件表达式，如: approved == true"
                rows={3}
                showCount
                maxLength={500}
              />
            </Form.Item>
          </>
        )}
      </>
    );
  };

  const renderEdgeProperties = () => {
    if (!selectedEdge) return null;

    return (
      <>
        <Form.Item name="label" label="连线标签">
          <Input placeholder="输入连线标签" />
        </Form.Item>

        <Form.Item name="condition" label="条件表达式">
          <Input.TextArea 
            placeholder="输入条件表达式"
            rows={3}
            showCount
            maxLength={200}
          />
        </Form.Item>

        <Form.Item name="animated" label="动画效果" valuePropName="checked">
          <Switch size="small" />
        </Form.Item>
      </>
    );
  };

  if (!selectedNode && !selectedEdge) {
    return (
      <Card title="属性面板" size="small" style={{ width: '100%' }}>
        <div style={{ 
          textAlign: 'center', 
          color: '#999', 
          padding: '20px',
          fontSize: '12px'
        }}>
          <EditOutlined style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
          请选择一个节点或连线来编辑属性
        </div>
      </Card>
    );
  }

  const title = selectedNode 
    ? `${selectedNode.type === 'start' ? '开始' : 
        selectedNode.type === 'end' ? '结束' : 
        selectedNode.type === 'userTask' ? '用户任务' :
        selectedNode.type === 'serviceTask' ? '服务任务' : '网关'}节点` 
    : '连线属性';

  return (
    <Card 
      title={title}
      size="small"
      style={{ width: '100%' }}
      extra={
        <Space size="small">
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={handleDelete}
            title="删除"
          />
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        size="small"
      >
        {selectedNode && renderNodeProperties()}
        {selectedEdge && renderEdgeProperties()}
        
        <Form.Item style={{ marginBottom: 0, marginTop: '16px' }}>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<SaveOutlined />}
            size="small" 
            block
          >
            保存更改
          </Button>
        </Form.Item>
      </Form>

      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          background: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '10px',
          color: '#666'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>调试信息:</div>
          <div>ID: {selectedNode?.id || selectedEdge?.id}</div>
          <div>类型: {selectedNode?.type || 'edge'}</div>
          {selectedNode && (
            <div>位置: ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})</div>
          )}
        </div>
      )}
    </Card>
  );
};

export default NodePropertiesPanel;
