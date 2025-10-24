/**
 * Day 3功能测试页面
 * 展示和测试所有新增的生产级功能
 */

import React, { useState, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  message, 
  Row, 
  Col, 
  Alert, 
  Statistic,
  Progress,
  Tag,
  Upload,
  Modal,
  Divider
} from 'antd';
import { 
  SaveOutlined, 
  DownloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';

// Import enhanced components and services
import EnhancedProcessDesigner from '../../components/process/EnhancedProcessDesigner';
import AdvancedNodePropertiesPanel from '../../components/process/AdvancedNodePropertiesPanel';
import { ProcessImportExport } from '../../utils/processImportExport';
import processService from '../../services/processService';

// Import types
import type { Node, Edge } from 'reactflow';
import type { BackendProcessDefinitionData } from '../../types/process';

const Day3FeatureTest: React.FC = () => {
  // State management
  const [definition, setDefinition] = useState<BackendProcessDefinitionData>({ nodes: [], flows: [] });
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [isModified, setIsModified] = useState(false);
  const [lastOperation, setLastOperation] = useState<string>('');
  const [operationCount, setOperationCount] = useState(0);
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Feature test counters
  const [testResults, setTestResults] = useState({
    keyboardShortcuts: 0,
    batchOperations: 0,
    autoSave: 0,
    importExport: 0,
    validation: 0,
  });

  // Handle definition change
  const handleDefinitionChange = useCallback((newDefinition: BackendProcessDefinitionData) => {
    setDefinition(newDefinition);
    setIsModified(true);
    setLastOperation('流程定义更新');
    setOperationCount(prev => prev + 1);
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback((nodes: Node[], edges: Edge[]) => {
    setSelectedNodes(nodes);
    setSelectedEdges(edges);
    setLastOperation(`选择了 ${nodes.length} 个节点和 ${edges.length} 条连线`);
  }, []);

  // Test keyboard shortcuts
  const testKeyboardShortcuts = useCallback(() => {
    message.info('请在画布中测试以下快捷键：');
    setTimeout(() => message.info('Delete: 删除选中项'), 1000);
    setTimeout(() => message.info('Ctrl+Z: 撤销操作'), 2000);
    setTimeout(() => message.info('Ctrl+Y: 重做操作'), 3000);
    setTimeout(() => message.info('Ctrl+A: 全选'), 4000);
    setTimeout(() => message.info('Ctrl+S: 保存流程'), 5000);
    
    setTestResults(prev => ({ ...prev, keyboardShortcuts: prev.keyboardShortcuts + 1 }));
  }, []);

  // Test batch operations
  const testBatchOperations = useCallback(() => {
    if (selectedNodes.length < 2) {
      message.warning('请先选择至少2个节点来测试批量操作');
      return;
    }

    message.success(`批量操作测试：选中了 ${selectedNodes.length} 个节点`);
    setTestResults(prev => ({ ...prev, batchOperations: prev.batchOperations + 1 }));
  }, [selectedNodes]);

  // Test export functionality
  const testExport = useCallback(async (format: 'json' | 'xml' | 'bpmn' | 'csv') => {
    try {
      let content: string;
      let filename: string;

      switch (format) {
        case 'json':
          content = ProcessImportExport.exportToJSON(definition);
          filename = `test_process.json`;
          break;
        case 'xml':
          content = ProcessImportExport.exportToXML(definition, { 
            name: 'Test Process', 
            key: 'test_process' 
          });
          filename = `test_process.xml`;
          break;
        case 'bpmn':
          content = ProcessImportExport.exportToBPMN(definition, { 
            name: 'Test Process', 
            key: 'test_process' 
          });
          filename = `test_process.bpmn`;
          break;
        case 'csv':
          content = ProcessImportExport.exportToCSV(definition);
          filename = `test_process.csv`;
          break;
      }

      ProcessImportExport.downloadFile(content, filename);
      message.success(`${format.toUpperCase()} 格式导出测试成功`);
      setTestResults(prev => ({ ...prev, importExport: prev.importExport + 1 }));
    } catch (error: any) {
      message.error(`导出测试失败: ${error.message}`);
    }
  }, [definition]);

  // Test import functionality
  const testImport = useCallback(async (file: File) => {
    try {
      const result = ProcessImportExport.importFromJSON(await ProcessImportExport.readFile(file));
      
      if (result.success && result.definition) {
        setDefinition(result.definition);
        setIsModified(true);
        message.success(`导入测试成功！节点: ${result.metadata?.nodeCount}, 连线: ${result.metadata?.edgeCount}`);
        
        if (result.warnings.length > 0) {
          message.warning(`导入警告: ${result.warnings.join(', ')}`);
        }
      } else {
        message.error(`导入测试失败: ${result.errors.join(', ')}`);
      }
      
      setTestResults(prev => ({ ...prev, importExport: prev.importExport + 1 }));
      setImportModalVisible(false);
    } catch (error: any) {
      message.error(`导入测试失败: ${error.message}`);
    }
  }, []);

  // Test validation
  const testValidation = useCallback(() => {
    message.info('验证测试：请观察右侧验证结果的实时更新');
    setTestResults(prev => ({ ...prev, validation: prev.validation + 1 }));
  }, []);

  // Generate sample process
  const generateSampleProcess = useCallback(() => {
    const sampleDefinition: BackendProcessDefinitionData = {
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          name: '开始',
          x: 100,
          y: 200,
          props: {}
        },
        {
          id: 'task-1',
          type: 'userTask',
          name: '申请审核',
          x: 300,
          y: 200,
          props: { assignee: 'manager', required: true }
        },
        {
          id: 'gateway-1',
          type: 'gateway',
          name: '审核结果',
          x: 500,
          y: 200,
          props: { gatewayType: 'exclusive', condition: '${approved} == true' }
        },
        {
          id: 'task-2',
          type: 'serviceTask',
          name: '发送通知',
          x: 700,
          y: 150,
          props: { serviceType: 'email', endpoint: '/api/notify' }
        },
        {
          id: 'end-1',
          type: 'end',
          name: '结束',
          x: 900,
          y: 200,
          props: {}
        }
      ],
      flows: [
        { id: 'flow-1', from: 'start-1', to: 'task-1', label: '', condition: '' },
        { id: 'flow-2', from: 'task-1', to: 'gateway-1', label: '', condition: '' },
        { id: 'flow-3', from: 'gateway-1', to: 'task-2', label: '通过', condition: '${approved} == true' },
        { id: 'flow-4', from: 'task-2', to: 'end-1', label: '', condition: '' },
      ]
    };

    setDefinition(sampleDefinition);
    setIsModified(true);
    setLastOperation('生成示例流程');
    message.success('示例流程生成成功！包含5个节点和4条连线');
  }, []);

  // Calculate feature completion
  const totalTests = Object.values(testResults).reduce((sum, count) => sum + count, 0);
  const featureCompletionRate = Math.min(100, (totalTests / 15) * 100); // 假设总共15个测试点

  return (
    <div style={{ height: '100vh', padding: '16px', background: '#f0f2f5' }}>
      <Card 
        title="Day 3 生产级功能测试中心"
        extra={
          <Space>
            <Tag color="blue">测试次数: {operationCount}</Tag>
            <Progress 
              type="circle" 
              size={32}
              percent={Math.round(featureCompletionRate)}
              strokeColor="#52c41a"
            />
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={() => {
                console.log('Complete Process Definition:', definition);
                console.log('Test Results:', testResults);
                message.success('测试数据已输出到控制台');
              }}
            >
              导出测试结果
            </Button>
          </Space>
        }
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '8px' }}
      >
        {/* Feature test status */}
        <Alert
          message="Day 3 生产级功能测试"
          description={
            <div>
              <div>最后操作: {lastOperation || '无'}</div>
              <div>功能完成度: {featureCompletionRate.toFixed(1)}%</div>
              <div style={{ marginTop: '8px' }}>
                <Space wrap>
                  <Tag color="green">画布交互: {testResults.keyboardShortcuts} 次</Tag>
                  <Tag color="blue">批量操作: {testResults.batchOperations} 次</Tag>
                  <Tag color="orange">导入导出: {testResults.importExport} 次</Tag>
                  <Tag color="purple">验证测试: {testResults.validation} 次</Tag>
                </Space>
              </div>
            </div>
          }
          type="info"
          style={{ marginBottom: '16px' }}
        />

        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          {/* Left Panel - Feature Tests */}
          <Col span={4}>
            <Card title="功能测试" size="small" style={{ marginBottom: '16px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Button 
                  block 
                  onClick={generateSampleProcess}
                  type="dashed"
                >
                  生成示例流程
                </Button>
                
                <Divider style={{ margin: '8px 0' }} />
                
                <Button 
                  block 
                  onClick={testKeyboardShortcuts}
                  icon={<SettingOutlined />}
                >
                  测试快捷键
                </Button>
                
                <Button 
                  block 
                  onClick={testBatchOperations}
                  icon={<CopyOutlined />}
                  disabled={selectedNodes.length < 2}
                >
                  测试批量操作
                </Button>
                
                <Button 
                  block 
                  onClick={testValidation}
                  icon={<CheckCircleOutlined />}
                >
                  测试验证系统
                </Button>
                
                <Divider style={{ margin: '8px 0' }} />
                
                <Button 
                  block 
                  onClick={() => testExport('json')}
                  icon={<DownloadOutlined />}
                >
                  导出JSON
                </Button>
                
                <Button 
                  block 
                  onClick={() => testExport('xml')}
                >
                  导出XML
                </Button>
                
                <Button 
                  block 
                  onClick={() => testExport('bpmn')}
                >
                  导出BPMN
                </Button>
                
                <Button 
                  block 
                  onClick={() => setImportModalVisible(true)}
                  icon={<UploadOutlined />}
                >
                  测试导入
                </Button>
              </Space>
            </Card>

            {/* Advanced Properties Panel */}
            <AdvancedNodePropertiesPanel
              selectedNodes={selectedNodes}
              selectedEdges={selectedEdges}
              onUpdateNode={(nodeId, updates) => {
                setLastOperation(`更新节点 ${nodeId}`);
                setIsModified(true);
              }}
              onUpdateEdge={(edgeId, updates) => {
                setLastOperation(`更新连线 ${edgeId}`);
                setIsModified(true);
              }}
              onDeleteNode={(nodeId) => {
                setLastOperation(`删除节点 ${nodeId}`);
                setIsModified(true);
              }}
              onDeleteEdge={(edgeId) => {
                setLastOperation(`删除连线 ${edgeId}`);
                setIsModified(true);
              }}
              onBatchUpdate={(updates) => {
                setLastOperation(`批量更新 ${updates.nodes.length} 个节点`);
                setTestResults(prev => ({ ...prev, batchOperations: prev.batchOperations + 1 }));
                setIsModified(true);
              }}
            />
          </Col>
          
          {/* Center Panel - Enhanced Designer */}
          <Col span={16}>
            <Card 
              title="生产级流程设计器"
              size="small"
              style={{ height: '100%' }}
              bodyStyle={{ padding: 0, height: 'calc(100% - 40px)' }}
              extra={
                <Space size="small">
                  <Tag color={isModified ? 'orange' : 'green'}>
                    {isModified ? '已修改' : '未修改'}
                  </Tag>
                  
                  {selectedNodes.length > 0 && (
                    <Tag color="blue">
                      已选择 {selectedNodes.length + selectedEdges.length} 项
                    </Tag>
                  )}
                </Space>
              }
            >
              <EnhancedProcessDesigner
                initialDefinition={definition}
                onDefinitionChange={handleDefinitionChange}
                onSelectionChange={handleSelectionChange}
                onNodePositionChange={(nodeId, position) => {
                  setLastOperation(`移动节点 ${nodeId} 到 (${Math.round(position.x)}, ${Math.round(position.y)})`);
                }}
                autoSave={true}
                autoSaveInterval={5000}
              />
            </Card>
          </Col>
          
          {/* Right Panel - Test Results */}
          <Col span={4}>
            <Card title="测试统计" size="small" style={{ marginBottom: '16px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Statistic 
                  title="操作次数" 
                  value={operationCount} 
                  valueStyle={{ fontSize: '18px' }}
                />
                
                <Statistic 
                  title="节点数量" 
                  value={definition.nodes.length}
                  valueStyle={{ color: '#1890ff' }}
                />
                
                <Statistic 
                  title="连线数量" 
                  value={definition.flows.length}
                  valueStyle={{ color: '#52c41a' }}
                />
                
                <Statistic 
                  title="选中项目" 
                  value={selectedNodes.length + selectedEdges.length}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Space>
            </Card>

            <Card title="功能测试计数" size="small" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px' }}>
                <div>🎹 快捷键测试: {testResults.keyboardShortcuts} 次</div>
                <div>📦 批量操作: {testResults.batchOperations} 次</div>
                <div>💾 自动保存: {testResults.autoSave} 次</div>
                <div>📁 导入导出: {testResults.importExport} 次</div>
                <div>✅ 验证测试: {testResults.validation} 次</div>
              </div>
            </Card>

            <Card title="最近操作" size="small">
              <div style={{ fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  最后操作:
                </div>
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  minHeight: '40px'
                }}>
                  {lastOperation || '无操作'}
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    测试指南:
                  </div>
                  <div>1. 生成示例流程</div>
                  <div>2. 测试键盘快捷键</div>
                  <div>3. 选择多个节点测试批量操作</div>
                  <div>4. 测试导入导出功能</div>
                  <div>5. 观察实时验证效果</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Import Modal */}
      <Modal
        title="导入流程定义测试"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
        width={600}
      >
        <Upload.Dragger
          accept=".json,.xml,.bpmn"
          beforeUpload={(file) => {
            testImport(file);
            return false;
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域进行导入测试</p>
          <p className="ant-upload-hint">
            支持 JSON、XML、BPMN 格式的流程定义文件
          </p>
        </Upload.Dragger>
        
        <Alert
          message="测试提示"
          description="可以先导出一个流程文件，然后再导入测试完整的导入导出功能"
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </Modal>
    </div>
  );
};

export default Day3FeatureTest;
