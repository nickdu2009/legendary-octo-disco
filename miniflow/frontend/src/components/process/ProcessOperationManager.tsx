/**
 * 流程操作管理器组件
 * 统一处理流程的各种操作和状态管理
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  Button,
  Space,
  Alert,
  Form,
  Input,
  Select,
  Checkbox,
  Progress,
  Tag,
  Divider,
  Card,
  List,
  message,
  Tooltip
} from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  PublishedWithChangesOutlined,
  ArchiveBoxOutlined
} from '@ant-design/icons';

// Import services
import { ProcessStateManager } from '../../services/processStateManager';
import processService from '../../services/processService';
import optimizedProcessApi from '../../services/optimizedProcessApi';

// Import types
import type { ProcessDefinition } from '../../types/process';

interface ProcessOperationManagerProps {
  selectedProcesses: ProcessDefinition[];
  currentUser: { id: number; role: string };
  onOperationComplete: () => void;
  onSelectionClear: () => void;
}

interface OperationProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

const ProcessOperationManager: React.FC<ProcessOperationManagerProps> = ({
  selectedProcesses,
  currentUser,
  onOperationComplete,
  onSelectionClear
}) => {
  // State management
  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [operationType, setOperationType] = useState<'copy' | 'delete' | 'export' | 'state_change' | null>(null);
  const [operationProgress, setOperationProgress] = useState<OperationProgress | null>(null);
  const [isOperating, setIsOperating] = useState(false);

  // Form state
  const [form] = Form.useForm();
  const [exportFormat, setExportFormat] = useState<'json' | 'xml' | 'bpmn'>('json');
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [copyOptions, setCopyOptions] = useState({
    includeInstances: false,
    modifyName: true,
    newCategory: '',
  });

  // Get available operations based on permissions
  const getAvailableOperations = useCallback(() => {
    if (selectedProcesses.length === 0) return [];

    const operations = [];
    const isSingleSelection = selectedProcesses.length === 1;
    const process = selectedProcesses[0];

    // 复制操作
    operations.push({
      key: 'copy',
      label: '复制流程',
      icon: <CopyOutlined />,
      description: isSingleSelection ? 
        '创建流程的副本' : 
        `批量复制 ${selectedProcesses.length} 个流程`,
      available: true,
    });

    // 导出操作
    operations.push({
      key: 'export',
      label: '导出流程',
      icon: <ExportOutlined />,
      description: isSingleSelection ? 
        '导出流程定义文件' : 
        `批量导出 ${selectedProcesses.length} 个流程`,
      available: true,
    });

    // 状态变更操作
    if (isSingleSelection) {
      const permissions = ProcessStateManager.getProcessPermissions(process, currentUser);
      const availableTransitions = ProcessStateManager.getAvailableTransitions(
        process.status,
        permissions.canPublish ? ['process:publish', 'process:archive', 'process:restore'] : []
      );

      if (availableTransitions.length > 0) {
        operations.push({
          key: 'state_change',
          label: '状态变更',
          icon: <PublishedWithChangesOutlined />,
          description: '变更流程状态',
          available: true,
          transitions: availableTransitions,
        });
      }
    }

    // 删除操作
    const canDeleteAll = selectedProcesses.every(p => 
      ProcessStateManager.getProcessPermissions(p, currentUser).canDelete
    );

    if (canDeleteAll) {
      operations.push({
        key: 'delete',
        label: '删除流程',
        icon: <DeleteOutlined />,
        description: isSingleSelection ? 
          '永久删除流程' : 
          `批量删除 ${selectedProcesses.length} 个流程`,
        available: true,
        danger: true,
      });
    }

    return operations;
  }, [selectedProcesses, currentUser]);

  // Handle operation start
  const startOperation = useCallback((type: string) => {
    setOperationType(type as any);
    setOperationModalVisible(true);
    form.resetFields();
  }, [form]);

  // Execute copy operation
  const executeCopyOperation = useCallback(async () => {
    setIsOperating(true);
    setOperationProgress({ total: selectedProcesses.length, completed: 0, failed: 0 });

    const results = [];
    
    for (let i = 0; i < selectedProcesses.length; i++) {
      const process = selectedProcesses[i];
      setOperationProgress(prev => prev ? { ...prev, current: process.name } : null);

      try {
        const copiedProcess = await optimizedProcessApi.copyProcess(process.id!);
        results.push(copiedProcess);
        
        setOperationProgress(prev => prev ? { 
          ...prev, 
          completed: prev.completed + 1 
        } : null);
      } catch (error) {
        setOperationProgress(prev => prev ? { 
          ...prev, 
          failed: prev.failed + 1 
        } : null);
      }
    }

    setIsOperating(false);
    setOperationModalVisible(false);
    setOperationProgress(null);
    onOperationComplete();
    onSelectionClear();

    message.success(`复制操作完成，成功: ${results.length}, 失败: ${selectedProcesses.length - results.length}`);
  }, [selectedProcesses, onOperationComplete, onSelectionClear]);

  // Execute export operation
  const executeExportOperation = useCallback(async () => {
    setIsOperating(true);
    setOperationProgress({ total: selectedProcesses.length, completed: 0, failed: 0 });

    for (let i = 0; i < selectedProcesses.length; i++) {
      const process = selectedProcesses[i];
      setOperationProgress(prev => prev ? { ...prev, current: process.name } : null);

      try {
        await processService.exportProcess(process, exportFormat);
        
        setOperationProgress(prev => prev ? { 
          ...prev, 
          completed: prev.completed + 1 
        } : null);
      } catch (error) {
        setOperationProgress(prev => prev ? { 
          ...prev, 
          failed: prev.failed + 1 
        } : null);
      }
    }

    setIsOperating(false);
    setOperationModalVisible(false);
    setOperationProgress(null);
    onSelectionClear();

    message.success(`导出操作完成`);
  }, [selectedProcesses, exportFormat, onSelectionClear]);

  // Execute delete operation
  const executeDeleteOperation = useCallback(async () => {
    setIsOperating(true);
    setOperationProgress({ total: selectedProcesses.length, completed: 0, failed: 0 });

    for (let i = 0; i < selectedProcesses.length; i++) {
      const process = selectedProcesses[i];
      setOperationProgress(prev => prev ? { ...prev, current: process.name } : null);

      try {
        await optimizedProcessApi.deleteProcess(process.id!);
        
        setOperationProgress(prev => prev ? { 
          ...prev, 
          completed: prev.completed + 1 
        } : null);
      } catch (error) {
        setOperationProgress(prev => prev ? { 
          ...prev, 
          failed: prev.failed + 1 
        } : null);
      }
    }

    setIsOperating(false);
    setOperationModalVisible(false);
    setOperationProgress(null);
    onOperationComplete();
    onSelectionClear();

    message.success(`删除操作完成`);
  }, [selectedProcesses, onOperationComplete, onSelectionClear]);

  // Render operation modal content
  const renderOperationModalContent = () => {
    switch (operationType) {
      case 'copy':
        return (
          <div>
            <Alert
              message="复制流程"
              description={`即将复制 ${selectedProcesses.length} 个流程`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form form={form} layout="vertical">
              <Form.Item name="modifyName" valuePropName="checked">
                <Checkbox defaultChecked>自动修改复制流程名称</Checkbox>
              </Form.Item>
              
              <Form.Item name="newCategory" label="目标分类">
                <Select placeholder="选择目标分类（可选）">
                  <Select.Option value="">保持原分类</Select.Option>
                  <Select.Option value="approval">审批流程</Select.Option>
                  <Select.Option value="workflow">工作流程</Select.Option>
                  <Select.Option value="template">流程模板</Select.Option>
                </Select>
              </Form.Item>
            </Form>

            <List
              size="small"
              dataSource={selectedProcesses}
              renderItem={(process) => (
                <List.Item>
                  <div>
                    <strong>{process.name}</strong>
                    <Tag color="blue" style={{ marginLeft: 8 }}>v{process.version}</Tag>
                  </div>
                </List.Item>
              )}
              style={{ maxHeight: 200, overflow: 'auto', background: '#fafafa', padding: 8 }}
            />
          </div>
        );

      case 'export':
        return (
          <div>
            <Alert
              message="导出流程"
              description={`即将导出 ${selectedProcesses.length} 个流程`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form form={form} layout="vertical">
              <Form.Item label="导出格式">
                <Select value={exportFormat} onChange={setExportFormat}>
                  <Select.Option value="json">JSON格式 (推荐)</Select.Option>
                  <Select.Option value="xml">XML格式</Select.Option>
                  <Select.Option value="bpmn">BPMN格式 (标准)</Select.Option>
                </Select>
              </Form.Item>
            </Form>

            <List
              size="small"
              dataSource={selectedProcesses}
              renderItem={(process) => (
                <List.Item>
                  <div>
                    <strong>{process.name}</strong>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      节点: {process.definition?.nodes?.length || 0}, 
                      连线: {process.definition?.flows?.length || 0}
                    </div>
                  </div>
                </List.Item>
              )}
              style={{ maxHeight: 200, overflow: 'auto', background: '#fafafa', padding: 8 }}
            />
          </div>
        );

      case 'delete':
        return (
          <div>
            <Alert
              message="删除流程"
              description="删除操作无法撤销，请谨慎操作"
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
              <strong>即将删除以下流程：</strong>
            </div>

            <List
              size="small"
              dataSource={selectedProcesses}
              renderItem={(process) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{process.name}</strong>
                      <Tag color={ProcessStateManager.getStatusColor(process.status)}>
                        {ProcessStateManager.getStatusDisplayName(process.status)}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      创建者: {process.creator_name}, 
                      版本: v{process.version}
                    </div>
                  </div>
                </List.Item>
              )}
              style={{ maxHeight: 200, overflow: 'auto', background: '#fff2f0', padding: 8 }}
            />

            <Alert
              message="确认删除"
              description="输入 'DELETE' 来确认删除操作"
              type="warning"
              style={{ marginTop: 16 }}
            />

            <Form form={form} style={{ marginTop: 16 }}>
              <Form.Item
                name="confirmation"
                rules={[
                  { required: true, message: '请输入确认文字' },
                  { pattern: /^DELETE$/, message: '请输入 DELETE' }
                ]}
              >
                <Input placeholder="输入 DELETE 确认删除" />
              </Form.Item>
            </Form>
          </div>
        );

      default:
        return null;
    }
  };

  // Handle operation execution
  const handleExecuteOperation = useCallback(async () => {
    try {
      await form.validateFields();
    } catch (error) {
      return;
    }

    switch (operationType) {
      case 'copy':
        await executeCopyOperation();
        break;
      case 'export':
        await executeExportOperation();
        break;
      case 'delete':
        await executeDeleteOperation();
        break;
      default:
        break;
    }
  }, [operationType, form, executeCopyOperation, executeExportOperation, executeDeleteOperation]);

  // Render operation progress
  const renderOperationProgress = () => {
    if (!operationProgress) return null;

    const progressPercent = Math.round(
      ((operationProgress.completed + operationProgress.failed) / operationProgress.total) * 100
    );

    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Progress 
            percent={progressPercent}
            status={operationProgress.failed > 0 ? 'exception' : 'active'}
            strokeColor={operationProgress.failed > 0 ? '#ff4d4f' : '#1890ff'}
          />
        </div>

        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          进度: {operationProgress.completed + operationProgress.failed} / {operationProgress.total}
          {operationProgress.current && (
            <div>当前: {operationProgress.current}</div>
          )}
        </div>

        <Space>
          <Tag color="green">成功: {operationProgress.completed}</Tag>
          {operationProgress.failed > 0 && (
            <Tag color="red">失败: {operationProgress.failed}</Tag>
          )}
        </Space>
      </div>
    );
  };

  // Get operation button props
  const getOperationButtonProps = (operation: string) => {
    const configs = {
      copy: {
        type: 'primary' as const,
        danger: false,
        text: '确认复制',
      },
      export: {
        type: 'primary' as const,
        danger: false,
        text: '确认导出',
      },
      delete: {
        type: 'primary' as const,
        danger: true,
        text: '确认删除',
      },
    };

    return configs[operation as keyof typeof configs] || {
      type: 'primary' as const,
      danger: false,
      text: '确认操作',
    };
  };

  if (selectedProcesses.length === 0) {
    return null;
  }

  const availableOperations = getAvailableOperations();

  return (
    <>
      {/* Operation Trigger Buttons */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong>已选择 {selectedProcesses.length} 个流程</strong>
            <div style={{ fontSize: 12, color: '#666' }}>
              {selectedProcesses.map(p => p.name).join(', ')}
            </div>
          </div>

          <Space>
            {availableOperations.map(operation => (
              <Tooltip key={operation.key} title={operation.description}>
                <Button
                  icon={operation.icon}
                  danger={operation.danger}
                  onClick={() => startOperation(operation.key)}
                >
                  {operation.label}
                </Button>
              </Tooltip>
            ))}
            
            <Button onClick={onSelectionClear}>
              取消选择
            </Button>
          </Space>
        </div>
      </Card>

      {/* Operation Modal */}
      <Modal
        title={
          operationType === 'copy' ? '批量复制流程' :
          operationType === 'export' ? '批量导出流程' :
          operationType === 'delete' ? '批量删除流程' :
          '流程操作'
        }
        open={operationModalVisible}
        onCancel={() => {
          if (!isOperating) {
            setOperationModalVisible(false);
            setOperationProgress(null);
          }
        }}
        footer={
          isOperating ? null : [
            <Button key="cancel" onClick={() => setOperationModalVisible(false)}>
              取消
            </Button>,
            <Button
              key="confirm"
              {...getOperationButtonProps(operationType || '')}
              loading={isOperating}
              onClick={handleExecuteOperation}
            >
              {getOperationButtonProps(operationType || '').text}
            </Button>,
          ]
        }
        width={600}
        maskClosable={!isOperating}
      >
        {isOperating ? renderOperationProgress() : renderOperationModalContent()}
      </Modal>
    </>
  );
};

export default ProcessOperationManager;
