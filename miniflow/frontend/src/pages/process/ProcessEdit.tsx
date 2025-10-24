import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  Card, 
  Row, 
  Col, 
  message,
  Modal,
  Spin,
  Alert,
  Divider,
  Tooltip
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  UndoOutlined,
  RedoOutlined,
  ClearOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Node, Edge } from 'reactflow';

// Import components
import ProcessDesigner from '../../components/process/ProcessDesigner';
import NodePalette from '../../components/process/NodePalette';
import NodePropertiesPanel from '../../components/process/NodePropertiesPanel';

// Import services and utilities
import { processApi } from '../../services/processApi';
import { ProcessConverter } from '../../utils/processConverter';

// Import types
import { 
  ProcessDefinition, 
  CreateProcessRequest, 
  UpdateProcessRequest,
  BackendProcessDefinitionData,
  ProcessValidationResult
} from '../../types/process';

const ProcessEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  
  // Refs
  const designerRef = useRef<any>(null);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processData, setProcessData] = useState<ProcessDefinition | null>(null);
  const [definition, setDefinition] = useState<BackendProcessDefinitionData>({ nodes: [], flows: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [validationResult, setValidationResult] = useState<ProcessValidationResult | null>(null);
  const [isModified, setIsModified] = useState(false);

  const isCreateMode = id === 'create';
  const isViewMode = id?.endsWith('/view');

  // Load process data
  useEffect(() => {
    if (!isCreateMode && id && !isViewMode) {
      loadProcess(parseInt(id));
    }
  }, [id, isCreateMode, isViewMode]);

  const loadProcess = async (processId: number) => {
    setLoading(true);
    try {
      const process = await processApi.getProcess(processId);
      setProcessData(process);
      setDefinition(process.definition);
      
      form.setFieldsValue({
        name: process.name,
        key: process.key,
        description: process.description,
        category: process.category,
      });
    } catch (error) {
      message.error('加载流程失败');
      console.error('Load process error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle definition change
  const handleDefinitionChange = useCallback((newDefinition: BackendProcessDefinitionData) => {
    setDefinition(newDefinition);
    setIsModified(true);
    
    // Validate process
    const validation = ProcessConverter.validateProcess(newDefinition.nodes, newDefinition.flows);
    setValidationResult(validation);
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback((node: Node | null, edge: Edge | null) => {
    setSelectedNode(node);
    setSelectedEdge(edge);
  }, []);

  // Handle node updates
  const handleUpdateNode = useCallback((nodeId: string, updates: any) => {
    designerRef.current?.updateNode(nodeId, updates);
  }, []);

  // Handle edge updates
  const handleUpdateEdge = useCallback((edgeId: string, updates: any) => {
    designerRef.current?.updateEdge(edgeId, updates);
  }, []);

  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    designerRef.current?.deleteNode(nodeId);
  }, []);

  // Handle edge deletion
  const handleDeleteEdge = useCallback((edgeId: string) => {
    designerRef.current?.deleteEdge(edgeId);
  }, []);

  // Handle node addition
  const handleAddNode = useCallback((nodeType: string, position?: { x: number; y: number }) => {
    designerRef.current?.addNode(nodeType, position);
  }, []);

  // Handle save
  const handleSave = async (values: any) => {
    if (!validationResult?.isValid) {
      Modal.confirm({
        title: '流程验证失败',
        content: (
          <div>
            <p>流程定义存在以下问题：</p>
            <ul>
              {validationResult?.errors.map((error, index) => (
                <li key={index} style={{ color: '#ff4d4f' }}>
                  {error.message}
                </li>
              ))}
            </ul>
            <p>是否仍要保存？</p>
          </div>
        ),
        onOk: () => performSave(values),
      });
      return;
    }

    await performSave(values);
  };

  const performSave = async (values: any) => {
    setSaving(true);
    try {
      const processData = {
        ...values,
        definition,
      };

      if (isCreateMode) {
        const createRequest: CreateProcessRequest = processData;
        await processApi.createProcess(createRequest);
        message.success('流程创建成功');
        navigate('/process');
      } else {
        const updateRequest: UpdateProcessRequest = {
          name: processData.name,
          description: processData.description,
          category: processData.category,
          definition: processData.definition,
        };
        await processApi.updateProcess(parseInt(id!), updateRequest);
        message.success('流程更新成功');
        setIsModified(false);
      }
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle clear canvas
  const handleClearCanvas = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空画布吗？此操作不可恢复。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        setDefinition({ nodes: [], flows: [] });
        setSelectedNode(null);
        setSelectedEdge(null);
        setValidationResult(null);
        setIsModified(true);
        message.success('画布已清空');
      },
    });
  };

  // Handle fit view
  const handleFitView = () => {
    designerRef.current?.fitView();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="process-edit-page" style={{ height: '100vh', overflow: 'hidden' }}>
      <Card 
        title={
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/process')}
            >
              返回列表
            </Button>
            <Divider type="vertical" />
            <span>
              {isCreateMode ? '创建流程' : 
               isViewMode ? '查看流程' : '编辑流程'}
              {processData && ` - ${processData.name}`}
            </span>
          </Space>
        }
        extra={
          <Space>
            {/* Validation Status */}
            {validationResult && (
              <Tooltip 
                title={
                  <div>
                    {validationResult.errors.length > 0 && (
                      <div>
                        <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>错误:</div>
                        {validationResult.errors.map((error, index) => (
                          <div key={index}>• {error.message}</div>
                        ))}
                      </div>
                    )}
                    {validationResult.warnings.length > 0 && (
                      <div style={{ marginTop: validationResult.errors.length > 0 ? '8px' : '0' }}>
                        <div style={{ color: '#fa8c16', fontWeight: 'bold' }}>警告:</div>
                        {validationResult.warnings.map((warning, index) => (
                          <div key={index}>• {warning.message}</div>
                        ))}
                      </div>
                    )}
                  </div>
                }
              >
                {validationResult.isValid ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                ) : (
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
                )}
              </Tooltip>
            )}
            
            {/* Action Buttons */}
            {!isViewMode && (
              <>
                <Button icon={<UndoOutlined />} size="small" disabled>
                  撤销
                </Button>
                <Button icon={<RedoOutlined />} size="small" disabled>
                  重做
                </Button>
                <Button icon={<ClearOutlined />} size="small" onClick={handleClearCanvas}>
                  清空
                </Button>
                <Button icon={<EyeOutlined />} size="small" onClick={handleFitView}>
                  适应画布
                </Button>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={() => form.submit()}
                >
                  {isCreateMode ? '创建流程' : '保存更改'}
                </Button>
              </>
            )}
          </Space>
        }
        size="small"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '8px', overflow: 'hidden' }}
      >
        {/* Validation Alerts */}
        {validationResult && !validationResult.isValid && (
          <Alert
            message="流程验证失败"
            description={
              <div>
                {validationResult.errors.slice(0, 3).map((error, index) => (
                  <div key={index}>• {error.message}</div>
                ))}
                {validationResult.errors.length > 3 && (
                  <div>• 还有 {validationResult.errors.length - 3} 个错误...</div>
                )}
              </div>
            }
            type="error"
            closable
            style={{ marginBottom: '8px' }}
          />
        )}

        <Row gutter={[8, 8]} style={{ height: '100%' }}>
          {/* Left Panel - Node Palette */}
          <Col span={4} style={{ height: '100%' }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <NodePalette 
                onAddNode={handleAddNode}
                disabled={isViewMode}
              />
              <div style={{ marginTop: '8px' }}>
                <NodePropertiesPanel
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  onUpdateNode={handleUpdateNode}
                  onUpdateEdge={handleUpdateEdge}
                  onDeleteNode={handleDeleteNode}
                  onDeleteEdge={handleDeleteEdge}
                />
              </div>
            </div>
          </Col>
          
          {/* Center Panel - Process Designer */}
          <Col span={16} style={{ height: '100%' }}>
            <Card 
              title="流程设计器"
              size="small"
              style={{ height: '100%' }}
              bodyStyle={{ padding: 0, height: 'calc(100% - 40px)' }}
            >
              <ProcessDesigner
                ref={designerRef}
                initialDefinition={definition}
                onDefinitionChange={handleDefinitionChange}
                onSelectionChange={handleSelectionChange}
                readonly={isViewMode}
              />
            </Card>
          </Col>
          
          {/* Right Panel - Process Information */}
          <Col span={4} style={{ height: '100%' }}>
            <Card 
              title="流程信息" 
              size="small"
              style={{ height: '100%' }}
              bodyStyle={{ overflowY: 'auto' }}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                disabled={isViewMode}
                size="small"
              >
                <Form.Item
                  name="key"
                  label="流程标识"
                  rules={[
                    { required: true, message: '请输入流程标识' },
                    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' }
                  ]}
                >
                  <Input 
                    placeholder="process_key" 
                    disabled={!isCreateMode}
                    showCount
                    maxLength={50}
                  />
                </Form.Item>
                
                <Form.Item
                  name="name"
                  label="流程名称"
                  rules={[{ required: true, message: '请输入流程名称' }]}
                >
                  <Input 
                    placeholder="请输入流程名称" 
                    showCount
                    maxLength={100}
                  />
                </Form.Item>
                
                <Form.Item name="category" label="流程分类">
                  <Select placeholder="选择分类">
                    <Select.Option value="approval">审批流程</Select.Option>
                    <Select.Option value="workflow">工作流程</Select.Option>
                    <Select.Option value="other">其他</Select.Option>
                  </Select>
                </Form.Item>
                
                <Form.Item name="description" label="流程描述">
                  <Input.TextArea 
                    placeholder="描述流程的用途和特点"
                    rows={4}
                    showCount
                    maxLength={500}
                  />
                </Form.Item>

                {/* Process Statistics */}
                {processData && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '8px', 
                    background: '#f5f5f5', 
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>流程信息:</div>
                    <div>版本: v{processData.version}</div>
                    <div>状态: {processData.status}</div>
                    <div>创建者: {processData.creator_name || '-'}</div>
                    <div>创建时间: {new Date(processData.created_at).toLocaleDateString()}</div>
                  </div>
                )}

                {/* Process Statistics */}
                <div style={{ 
                  marginTop: '16px', 
                  padding: '8px', 
                  background: '#f0f0f0', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>设计统计:</div>
                  <div>节点数量: {definition.nodes.length}</div>
                  <div>连线数量: {definition.flows.length}</div>
                  <div>修改状态: {isModified ? '已修改' : '未修改'}</div>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ProcessEdit;
