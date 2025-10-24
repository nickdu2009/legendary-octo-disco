/**
 * 高级节点属性编辑面板
 * 支持动态表单、实时预览、高级配置等生产级功能
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  Divider, 
  Switch, 
  Tabs,
  Tag,
  Tooltip,
  Alert,
  Collapse,
  InputNumber
} from 'antd';
import { 
  DeleteOutlined, 
  EditOutlined, 
  SaveOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { Node, Edge } from 'reactflow';

// Import types
import type { 
  TypedProcessNode, 
  TypedProcessEdge, 
  ProcessNodeData,
  FormField
} from '../../types/reactflow';

interface AdvancedNodePropertiesPanelProps {
  selectedNodes: Node[];
  selectedEdges: Edge[];
  onUpdateNode: (nodeId: string, updates: Partial<ProcessNodeData>) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onBatchUpdate?: (updates: { nodes: Array<{ id: string; updates: Partial<ProcessNodeData> }>; edges: Array<{ id: string; updates: Partial<Edge> }> }) => void;
  readonly?: boolean;
}

const AdvancedNodePropertiesPanel: React.FC<AdvancedNodePropertiesPanelProps> = ({
  selectedNodes,
  selectedEdges,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onBatchUpdate,
  readonly = false
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  const [previewMode, setPreviewMode] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectedEdge = selectedEdges.length === 1 ? selectedEdges[0] : null;
  const isBatchMode = selectedNodes.length > 1 || selectedEdges.length > 1;

  // Initialize form values
  useEffect(() => {
    if (selectedNode) {
      form.setFieldsValue({
        label: selectedNode.data.label,
        description: selectedNode.data.description,
        assignee: selectedNode.data.assignee,
        condition: selectedNode.data.condition,
        serviceType: selectedNode.data.serviceType,
        endpoint: selectedNode.data.endpoint,
        method: selectedNode.data.method || 'POST',
        gatewayType: selectedNode.data.gatewayType || 'exclusive',
        required: selectedNode.data.required || false,
        priority: selectedNode.data.priority || 50,
        timeout: selectedNode.data.timeout || 3600,
      });

      // Load form fields for userTask
      if (selectedNode.type === 'userTask' && selectedNode.data.formFields) {
        setFormFields(selectedNode.data.formFields as FormField[]);
      }
    } else if (selectedEdge) {
      form.setFieldsValue({
        label: selectedEdge.label,
        condition: selectedEdge.data?.condition,
        animated: selectedEdge.animated || false,
        style: selectedEdge.style,
      });
    } else {
      form.resetFields();
      setFormFields([]);
    }
  }, [selectedNode, selectedEdge, form]);

  // Handle save
  const handleSave = useCallback((values: any) => {
    if (readonly) return;

    if (isBatchMode && onBatchUpdate) {
      // Batch update logic
      const nodeUpdates = selectedNodes.map(node => ({
        id: node.id,
        updates: values
      }));
      const edgeUpdates = selectedEdges.map(edge => ({
        id: edge.id,
        updates: values
      }));
      
      onBatchUpdate({ nodes: nodeUpdates, edges: edgeUpdates });
    } else if (selectedNode) {
      // Single node update
      const updates = { ...values };
      
      // Special handling for userTask form fields
      if (selectedNode.type === 'userTask') {
        updates.formFields = formFields;
      }
      
      onUpdateNode(selectedNode.id, updates);
    } else if (selectedEdge) {
      // Single edge update
      onUpdateEdge(selectedEdge.id, {
        label: values.label,
        animated: values.animated,
        style: values.style,
        data: {
          ...selectedEdge.data,
          condition: values.condition,
        },
      });
    }
  }, [readonly, isBatchMode, selectedNode, selectedEdge, selectedNodes, selectedEdges, formFields, onBatchUpdate, onUpdateNode, onUpdateEdge]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (readonly) return;

    if (selectedNodes.length > 0) {
      selectedNodes.forEach(node => onDeleteNode(node.id));
    }
    if (selectedEdges.length > 0) {
      selectedEdges.forEach(edge => onDeleteEdge(edge.id));
    }
  }, [readonly, selectedNodes, selectedEdges, onDeleteNode, onDeleteEdge]);

  // Add form field
  const addFormField = useCallback(() => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      label: '新字段',
      type: 'text',
      required: false,
    };
    setFormFields(prev => [...prev, newField]);
  }, []);

  // Remove form field
  const removeFormField = useCallback((index: number) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update form field
  const updateFormField = useCallback((index: number, updates: Partial<FormField>) => {
    setFormFields(prev => prev.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    ));
  }, []);

  // Render basic properties
  const renderBasicProperties = () => (
    <>
      <Form.Item name="label" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input placeholder="输入名称" disabled={readonly} />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <Input.TextArea 
          placeholder="输入描述" 
          rows={2}
          showCount
          maxLength={200}
          disabled={readonly}
        />
      </Form.Item>

      {selectedNode?.type === 'userTask' && (
        <>
          <Form.Item name="assignee" label="处理人">
            <Select placeholder="选择处理人" allowClear disabled={readonly}>
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="manager">经理</Select.Option>
              <Select.Option value="user">普通用户</Select.Option>
              <Select.Option value="system">系统</Select.Option>
              <Select.Option value="dynamic">动态分配</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="required" label="必填任务" valuePropName="checked">
            <Switch size="small" disabled={readonly} />
          </Form.Item>

          <Form.Item name="priority" label="优先级">
            <InputNumber 
              min={1} 
              max={100} 
              placeholder="1-100"
              style={{ width: '100%' }}
              disabled={readonly}
            />
          </Form.Item>

          <Form.Item name="timeout" label="超时时间(秒)">
            <InputNumber 
              min={60} 
              max={86400} 
              placeholder="60-86400"
              style={{ width: '100%' }}
              disabled={readonly}
            />
          </Form.Item>
        </>
      )}

      {selectedNode?.type === 'serviceTask' && (
        <>
          <Form.Item name="serviceType" label="服务类型">
            <Select placeholder="选择服务类型" disabled={readonly}>
              <Select.Option value="http">HTTP请求</Select.Option>
              <Select.Option value="database">数据库操作</Select.Option>
              <Select.Option value="email">邮件发送</Select.Option>
              <Select.Option value="script">脚本执行</Select.Option>
              <Select.Option value="webhook">Webhook调用</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="endpoint" label="服务端点">
            <Input placeholder="输入服务端点URL" disabled={readonly} />
          </Form.Item>

          <Form.Item name="method" label="请求方法">
            <Select placeholder="选择请求方法" disabled={readonly}>
              <Select.Option value="GET">GET</Select.Option>
              <Select.Option value="POST">POST</Select.Option>
              <Select.Option value="PUT">PUT</Select.Option>
              <Select.Option value="DELETE">DELETE</Select.Option>
              <Select.Option value="PATCH">PATCH</Select.Option>
            </Select>
          </Form.Item>
        </>
      )}

      {selectedNode?.type === 'gateway' && (
        <>
          <Form.Item name="gatewayType" label="网关类型">
            <Select placeholder="选择网关类型" disabled={readonly}>
              <Select.Option value="exclusive">排他网关 (XOR)</Select.Option>
              <Select.Option value="parallel">并行网关 (AND)</Select.Option>
              <Select.Option value="inclusive">包容网关 (OR)</Select.Option>
              <Select.Option value="event">事件网关</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="condition" label="条件表达式">
            <Input.TextArea 
              placeholder="输入条件表达式，如: ${approved} == true"
              rows={3}
              showCount
              maxLength={500}
              disabled={readonly}
            />
          </Form.Item>
        </>
      )}
    </>
  );

  // Render advanced properties
  const renderAdvancedProperties = () => (
    <>
      {selectedNode?.type === 'userTask' && (
        <Collapse size="small" ghost>
          <Collapse.Panel header="表单字段配置" key="form-fields">
            <Space direction="vertical" style={{ width: '100%' }}>
              {formFields.map((field, index) => (
                <Card key={index} size="small" style={{ background: '#fafafa' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Input
                        placeholder="字段名称"
                        value={field.name}
                        onChange={(e) => updateFormField(index, { name: e.target.value })}
                        style={{ flex: 1, marginRight: '8px' }}
                        size="small"
                        disabled={readonly}
                      />
                      <Button 
                        type="text" 
                        danger 
                        icon={<MinusCircleOutlined />} 
                        size="small"
                        onClick={() => removeFormField(index)}
                        disabled={readonly}
                      />
                    </div>
                    
                    <Space style={{ width: '100%' }}>
                      <Input
                        placeholder="显示标签"
                        value={field.label}
                        onChange={(e) => updateFormField(index, { label: e.target.value })}
                        size="small"
                        style={{ flex: 1 }}
                        disabled={readonly}
                      />
                      <Select
                        value={field.type}
                        onChange={(value) => updateFormField(index, { type: value })}
                        size="small"
                        style={{ width: '100px' }}
                        disabled={readonly}
                      >
                        <Select.Option value="text">文本</Select.Option>
                        <Select.Option value="number">数字</Select.Option>
                        <Select.Option value="select">选择</Select.Option>
                        <Select.Option value="textarea">多行文本</Select.Option>
                        <Select.Option value="date">日期</Select.Option>
                        <Select.Option value="checkbox">复选框</Select.Option>
                        <Select.Option value="email">邮箱</Select.Option>
                      </Select>
                      <Switch 
                        checked={field.required}
                        onChange={(checked) => updateFormField(index, { required: checked })}
                        size="small"
                        disabled={readonly}
                      />
                    </Space>
                  </Space>
                </Card>
              ))}
              
              {!readonly && (
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={addFormField}
                  block
                  size="small"
                >
                  添加表单字段
                </Button>
              )}
            </Space>
          </Collapse.Panel>
        </Collapse>
      )}

      {selectedNode?.type === 'serviceTask' && (
        <Collapse size="small" ghost>
          <Collapse.Panel header="HTTP配置" key="http-config">
            <Form.Item name="headers" label="请求头">
              <Input.TextArea 
                placeholder='{"Content-Type": "application/json"}'
                rows={3}
                disabled={readonly}
              />
            </Form.Item>
            
            <Form.Item name="payload" label="请求体">
              <Input.TextArea 
                placeholder='{"key": "value"}'
                rows={4}
                disabled={readonly}
              />
            </Form.Item>
          </Collapse.Panel>
          
          <Collapse.Panel header="错误处理" key="error-handling">
            <Form.Item name="retryCount" label="重试次数">
              <InputNumber min={0} max={5} style={{ width: '100%' }} disabled={readonly} />
            </Form.Item>
            
            <Form.Item name="retryDelay" label="重试延迟(秒)">
              <InputNumber min={1} max={300} style={{ width: '100%' }} disabled={readonly} />
            </Form.Item>
            
            <Form.Item name="timeoutAction" label="超时处理">
              <Select placeholder="选择超时处理方式" disabled={readonly}>
                <Select.Option value="fail">任务失败</Select.Option>
                <Select.Option value="skip">跳过任务</Select.Option>
                <Select.Option value="retry">自动重试</Select.Option>
              </Select>
            </Form.Item>
          </Collapse.Panel>
        </Collapse>
      )}

      {selectedNode?.type === 'gateway' && (
        <Collapse size="small" ghost>
          <Collapse.Panel header="条件配置" key="conditions">
            <Alert
              message="条件表达式语法"
              description="支持JavaScript表达式语法，如：${variable} == 'value' || ${count} > 10"
              type="info"
              showIcon
              style={{ marginBottom: '12px' }}
              size="small"
            />
            
            <Form.Item name="defaultPath" label="默认路径">
              <Select placeholder="选择默认路径" disabled={readonly}>
                <Select.Option value="first">第一个连线</Select.Option>
                <Select.Option value="last">最后一个连线</Select.Option>
                <Select.Option value="error">错误处理</Select.Option>
              </Select>
            </Form.Item>
          </Collapse.Panel>
        </Collapse>
      )}
    </>
  );

  // Render style properties
  const renderStyleProperties = () => (
    <>
      <Form.Item name="backgroundColor" label="背景颜色">
        <Input type="color" style={{ width: '100%' }} disabled={readonly} />
      </Form.Item>
      
      <Form.Item name="borderColor" label="边框颜色">
        <Input type="color" style={{ width: '100%' }} disabled={readonly} />
      </Form.Item>
      
      <Form.Item name="textColor" label="文字颜色">
        <Input type="color" style={{ width: '100%' }} disabled={readonly} />
      </Form.Item>
      
      <Form.Item name="borderWidth" label="边框宽度">
        <InputNumber min={1} max={10} style={{ width: '100%' }} disabled={readonly} />
      </Form.Item>
      
      <Form.Item name="borderRadius" label="圆角半径">
        <InputNumber min={0} max={50} style={{ width: '100%' }} disabled={readonly} />
      </Form.Item>
    </>
  );

  // Render batch properties
  const renderBatchProperties = () => (
    <>
      <Alert
        message={`批量编辑 (${selectedNodes.length} 个节点, ${selectedEdges.length} 条连线)`}
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />
      
      <Form.Item name="batchLabel" label="批量重命名">
        <Input 
          placeholder="输入前缀，如: Task_"
          addonAfter="+ 序号"
          disabled={readonly}
        />
      </Form.Item>
      
      <Form.Item name="batchCategory" label="批量分类">
        <Select placeholder="选择分类" disabled={readonly}>
          <Select.Option value="approval">审批类</Select.Option>
          <Select.Option value="notification">通知类</Select.Option>
          <Select.Option value="processing">处理类</Select.Option>
        </Select>
      </Form.Item>
    </>
  );

  // No selection state
  if (selectedNodes.length === 0 && selectedEdges.length === 0) {
    return (
      <Card title="高级属性面板" size="small" style={{ width: '100%' }}>
        <div style={{ 
          textAlign: 'center', 
          color: '#999', 
          padding: '20px',
          fontSize: '12px'
        }}>
          <EditOutlined style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
          <div>请选择节点或连线来编辑属性</div>
          <div style={{ marginTop: '8px', fontSize: '11px' }}>
            支持多选进行批量编辑
          </div>
        </div>
      </Card>
    );
  }

  const title = isBatchMode ? '批量编辑' :
    selectedNode ? `${selectedNode.data.label || '节点'} 属性` : 
    '连线属性';

  const tabItems = [
    {
      key: 'basic',
      label: '基础属性',
      children: isBatchMode ? renderBatchProperties() : renderBasicProperties(),
    },
    {
      key: 'advanced',
      label: '高级配置',
      children: renderAdvancedProperties(),
      disabled: isBatchMode,
    },
    {
      key: 'style',
      label: '样式设置',
      children: renderStyleProperties(),
    },
  ];

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{title}</span>
          <Space size="small">
            {!readonly && (
              <Tooltip title={previewMode ? '编辑模式' : '预览模式'}>
                <Button 
                  type="text" 
                  icon={<EyeOutlined />} 
                  size="small"
                  onClick={() => setPreviewMode(!previewMode)}
                />
              </Tooltip>
            )}
            
            {selectedNodes.length === 1 && (
              <Tag color="blue" style={{ margin: 0 }}>
                {selectedNode?.type}
              </Tag>
            )}
          </Space>
        </div>
      }
      size="small"
      style={{ width: '100%' }}
      extra={
        !readonly && (
          <Space size="small">
            <Tooltip title="删除选中项">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                size="small"
                onClick={handleDelete}
              />
            </Tooltip>
          </Space>
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        size="small"
        disabled={readonly || previewMode}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          items={tabItems}
        />
        
        {!readonly && !previewMode && (
          <Form.Item style={{ marginBottom: 0, marginTop: '16px' }}>
            <Space style={{ width: '100%' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />}
                size="small"
                style={{ flex: 1 }}
              >
                保存更改
              </Button>
              
              {isBatchMode && (
                <Button 
                  icon={<SettingOutlined />}
                  size="small"
                  onClick={() => {
                    // Open advanced batch settings
                    message.info('高级批量设置功能开发中');
                  }}
                >
                  高级
                </Button>
              )}
            </Space>
          </Form.Item>
        )}
      </Form>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && selectedNode && (
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          background: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '10px',
          color: '#666'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>调试信息:</div>
          <div>ID: {selectedNode.id}</div>
          <div>类型: {selectedNode.type}</div>
          <div>位置: ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})</div>
          {formFields.length > 0 && (
            <div>表单字段: {formFields.length} 个</div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AdvancedNodePropertiesPanel;
