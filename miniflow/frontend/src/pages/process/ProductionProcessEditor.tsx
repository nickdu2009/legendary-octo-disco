/**
 * 生产级流程编辑器
 * 集成所有增强功能的完整流程编辑页面
 */

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
  Tooltip,
  Progress,
  Upload,
  Dropdown,
  Badge,
  Tag,
  Affix
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  UndoOutlined,
  RedoOutlined,
  ClearOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  SettingOutlined,
  FullscreenOutlined,
  CompressOutlined,
  ReloadOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import type { Node, Edge } from 'reactflow';

// Import components
import EnhancedProcessDesigner from '../../components/process/EnhancedProcessDesigner';
import AdvancedNodePropertiesPanel from '../../components/process/AdvancedNodePropertiesPanel';
import NodePalette from '../../components/process/NodePalette';

// Import services and utilities
import processService from '../../services/processService';
import { ProcessImportExport } from '../../utils/processImportExport';
import { ProcessValidator } from '../../utils/processValidator';

// Import types
import type { 
  ProcessDefinition, 
  CreateProcessRequest, 
  UpdateProcessRequest,
  BackendProcessDefinitionData,
} from '../../types/process';
import type { ProcessValidationResult } from '../../types/components';

const ProductionProcessEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  
  // Refs
  const designerRef = useRef<any>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [processData, setProcessData] = useState<ProcessDefinition | null>(null);
  const [definition, setDefinition] = useState<BackendProcessDefinitionData>({ nodes: [], flows: [] });
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [validationResult, setValidationResult] = useState<ProcessValidationResult | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

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
      const process = await processService.getProcess(processId);
      setProcessData(process);
      setDefinition(process.definition);
      setLastSaved(new Date(process.updated_at));
      
      form.setFieldsValue({
        name: process.name,
        key: process.key,
        description: process.description,
        category: process.category,
      });

      // Start auto save if enabled
      if (autoSaveEnabled && !isViewMode) {
        startAutoSave(processId);
      }
    } catch (error) {
      message.error('加载流程失败');
      console.error('Load process error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto save functionality
  const startAutoSave = useCallback((processId: number) => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    autoSaveIntervalRef.current = setInterval(async () => {
      if (isModified && !saving) {
        try {
          setAutoSaving(true);
          const formValues = form.getFieldsValue();
          const updateRequest: UpdateProcessRequest = {
            name: formValues.name,
            description: formValues.description,
            category: formValues.category,
            definition,
          };

          await processService.updateProcess(processId, updateRequest, { silent: true });
          setLastSaved(new Date());
          setIsModified(false);
        } catch (error) {
          console.warn('自动保存失败:', error);
        } finally {
          setAutoSaving(false);
        }
      }
    }, 10000); // Auto save every 10 seconds
  }, [isModified, saving, form, definition]);

  // Handle definition change
  const handleDefinitionChange = useCallback((newDefinition: BackendProcessDefinitionData) => {
    setDefinition(newDefinition);
    setIsModified(true);
    
    // Validate process
    const validation = ProcessValidator.validate(
      newDefinition.nodes as any[], 
      newDefinition.flows as any[]
    );
    setValidationResult(validation);

    // Mark changes for auto save
    if (processData?.id) {
      processService.markChanged(processData.id, newDefinition);
    }
  }, [processData]);

  // Handle selection change
  const handleSelectionChange = useCallback((nodes: Node[], edges: Edge[]) => {
    setSelectedNodes(nodes);
    setSelectedEdges(edges);
  }, []);

  // Handle node position change
  const handleNodePositionChange = useCallback((nodeId: string, position: { x: number; y: number }) => {
    // Auto save position changes
    setIsModified(true);
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
              {validationResult?.errors.slice(0, 5).map((error, index) => (
                <li key={index} style={{ color: '#ff4d4f' }}>
                  {error.message}
                </li>
              ))}
              {validationResult && validationResult.errors.length > 5 && (
                <li>还有 {validationResult.errors.length - 5} 个错误...</li>
              )}
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
        await processService.createProcess(createRequest);
        navigate('/process');
      } else {
        const updateRequest: UpdateProcessRequest = {
          name: processData.name,
          description: processData.description,
          category: processData.category,
          definition: processData.definition,
        };
        await processService.updateProcess(parseInt(id!), updateRequest);
        setIsModified(false);
        setLastSaved(new Date());
      }
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle export
  const handleExport = async (format: 'json' | 'xml' | 'bpmn' | 'csv') => {
    if (!processData) return;
    
    try {
      await processService.exportProcess(processData, format);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Handle import
  const handleImport = async (file: File) => {
    try {
      const result = await processService.importProcess(file, {
        autoCorrect: true,
        validateOnImport: true,
      });

      if ('definition' in result) {
        setDefinition(result as BackendProcessDefinitionData);
        setIsModified(true);
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      processService.stopAutoSave();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" tip="加载流程中..." />
      </div>
    );
  }

  return (
    <div 
      className="production-process-editor" 
      style={{ 
        height: isFullscreen ? '100vh' : 'calc(100vh - 64px)', 
        overflow: 'hidden',
        background: '#f0f2f5'
      }}
    >
      {/* Top toolbar */}
      <Affix offsetTop={0}>
        <Card 
          size="small"
          style={{ 
            borderRadius: 0,
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none'
          }}
          bodyStyle={{ padding: '8px 16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/process')}
              >
                返回列表
              </Button>
              <Divider type="vertical" />
              <span style={{ fontWeight: 500 }}>
                {isCreateMode ? '创建流程' : 
                 isViewMode ? '查看流程' : '编辑流程'}
                {processData && ` - ${processData.name}`}
              </span>
              
              {isModified && (
                <Badge dot>
                  <Tag color="orange">已修改</Tag>
                </Badge>
              )}
              
              {autoSaving && (
                <Tag icon={<ClockCircleOutlined />} color="blue">自动保存中...</Tag>
              )}
            </Space>

            <Space>
              {/* Validation Status */}
              {validationResult && (
                <Tooltip 
                  title={
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        质量评分: {validationResult.score}/100
                      </div>
                      {validationResult.errors.length > 0 && (
                        <div style={{ color: '#ff4d4f' }}>
                          错误: {validationResult.errors.length}
                        </div>
                      )}
                      {validationResult.warnings.length > 0 && (
                        <div style={{ color: '#fa8c16' }}>
                          警告: {validationResult.warnings.length}
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

              {/* Last saved time */}
              {lastSaved && (
                <Tooltip title={`最后保存: ${lastSaved.toLocaleString()}`}>
                  <Tag icon={<ClockCircleOutlined />}>
                    {Math.round((Date.now() - lastSaved.getTime()) / 1000)}秒前
                  </Tag>
                </Tooltip>
              )}

              {/* Action buttons */}
              {!isViewMode && (
                <>
                  <Button 
                    icon={<UndoOutlined />} 
                    size="small" 
                    disabled={!designerRef.current?.canUndo}
                    onClick={() => designerRef.current?.undo()}
                  >
                    撤销
                  </Button>
                  <Button 
                    icon={<RedoOutlined />} 
                    size="small"
                    disabled={!designerRef.current?.canRedo}
                    onClick={() => designerRef.current?.redo()}
                  >
                    重做
                  </Button>

                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'export-json',
                          label: 'JSON格式',
                          icon: <DownloadOutlined />,
                          onClick: () => handleExport('json'),
                        },
                        {
                          key: 'export-xml',
                          label: 'XML格式',
                          onClick: () => handleExport('xml'),
                        },
                        {
                          key: 'export-bpmn',
                          label: 'BPMN格式',
                          onClick: () => handleExport('bpmn'),
                        },
                        {
                          type: 'divider',
                        },
                        {
                          key: 'import',
                          label: '导入流程',
                          icon: <UploadOutlined />,
                        },
                      ],
                    }}
                  >
                    <Button icon={<SettingOutlined />} size="small">
                      更多
                    </Button>
                  </Dropdown>

                  <Button 
                    icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
                    size="small"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? '退出全屏' : '全屏'}
                  </Button>

                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />}
                    loading={saving}
                    disabled={!isModified}
                    onClick={() => form.submit()}
                  >
                    {isCreateMode ? '创建流程' : '保存更改'}
                  </Button>
                </>
              )}
            </Space>
          </div>
        </Card>
      </Affix>

      {/* Validation alerts */}
      {validationResult && !validationResult.isValid && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>流程验证失败</span>
              <Progress 
                type="circle" 
                size={24}
                percent={validationResult.score} 
                strokeColor={validationResult.score >= 60 ? '#fa8c16' : '#ff4d4f'}
                showInfo={false}
              />
            </div>
          }
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
          style={{ margin: '8px 16px' }}
        />
      )}

      {/* Main content */}
      <div style={{ height: 'calc(100% - 80px)', padding: '8px' }}>
        <Row gutter={[8, 8]} style={{ height: '100%' }}>
          {/* Left Panel - Tools */}
          <Col span={4} style={{ height: '100%' }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <NodePalette 
                onAddNode={(nodeType, position) => designerRef.current?.addNode(nodeType, position)}
                disabled={isViewMode}
              />
              
              <div style={{ marginTop: '8px' }}>
                <AdvancedNodePropertiesPanel
                  selectedNodes={selectedNodes}
                  selectedEdges={selectedEdges}
                  onUpdateNode={(nodeId, updates) => {
                    // Handle node updates
                    setIsModified(true);
                  }}
                  onUpdateEdge={(edgeId, updates) => {
                    // Handle edge updates
                    setIsModified(true);
                  }}
                  onDeleteNode={(nodeId) => designerRef.current?.deleteNode?.(nodeId)}
                  onDeleteEdge={(edgeId) => designerRef.current?.deleteEdge?.(edgeId)}
                  readonly={isViewMode}
                />
              </div>
            </div>
          </Col>
          
          {/* Center Panel - Designer */}
          <Col span={16} style={{ height: '100%' }}>
            <Card 
              title="流程设计器"
              size="small"
              style={{ height: '100%' }}
              bodyStyle={{ padding: 0, height: 'calc(100% - 40px)' }}
              extra={
                <Space size="small">
                  <Tooltip title="适应画布">
                    <Button 
                      type="text" 
                      icon={<EyeOutlined />} 
                      size="small"
                      onClick={() => designerRef.current?.fitView()}
                    />
                  </Tooltip>
                  
                  <Tooltip title="刷新画布">
                    <Button 
                      type="text" 
                      icon={<ReloadOutlined />} 
                      size="small"
                      onClick={() => window.location.reload()}
                    />
                  </Tooltip>
                </Space>
              }
            >
              <EnhancedProcessDesigner
                ref={designerRef}
                initialDefinition={definition}
                onDefinitionChange={handleDefinitionChange}
                onSelectionChange={handleSelectionChange}
                onNodePositionChange={handleNodePositionChange}
                readonly={isViewMode}
                autoSave={autoSaveEnabled}
                autoSaveInterval={10000}
              />
            </Card>
          </Col>
          
          {/* Right Panel - Process Information */}
          <Col span={4} style={{ height: '100%' }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <Card 
                title="流程信息" 
                size="small"
                style={{ marginBottom: '8px' }}
                extra={
                  <Tooltip title={autoSaveEnabled ? '禁用自动保存' : '启用自动保存'}>
                    <Button
                      type="text"
                      icon={<ClockCircleOutlined />}
                      size="small"
                      style={{ color: autoSaveEnabled ? '#52c41a' : '#d9d9d9' }}
                      onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                    />
                  </Tooltip>
                }
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
                      <Select.Option value="notification">通知流程</Select.Option>
                      <Select.Option value="automation">自动化流程</Select.Option>
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
                </Form>
              </Card>

              {/* Process Statistics */}
              <Card title="设计统计" size="small" style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px' }}>
                  <div>节点数量: <strong>{definition.nodes.length}</strong></div>
                  <div>连线数量: <strong>{definition.flows.length}</strong></div>
                  <div>选中项: <strong>{selectedNodes.length + selectedEdges.length}</strong></div>
                  {validationResult && (
                    <div>质量评分: 
                      <Tag color={
                        validationResult.score >= 80 ? 'green' :
                        validationResult.score >= 60 ? 'orange' : 'red'
                      }>
                        {validationResult.score}/100
                      </Tag>
                    </div>
                  )}
                </div>
              </Card>

              {/* Process Metadata */}
              {processData && (
                <Card title="流程信息" size="small">
                  <div style={{ fontSize: '12px' }}>
                    <div>版本: <Tag>v{processData.version}</Tag></div>
                    <div>状态: <Tag color={
                      processData.status === 'published' ? 'green' :
                      processData.status === 'draft' ? 'orange' : 'default'
                    }>{processData.status}</Tag></div>
                    <div>创建者: {processData.creator_name || '-'}</div>
                    <div>创建时间: {new Date(processData.created_at).toLocaleDateString()}</div>
                    {lastSaved && (
                      <div>最后保存: {lastSaved.toLocaleTimeString()}</div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* Upload modal for import */}
      <Modal
        title="导入流程定义"
        open={false}
        onCancel={() => {}}
        footer={null}
      >
        <Upload.Dragger
          accept=".json,.xml,.bpmn"
          beforeUpload={(file) => {
            handleImport(file);
            return false;
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 JSON、XML、BPMN 格式的流程定义文件
          </p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
};

export default ProductionProcessEditor;
