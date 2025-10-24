/**
 * 增强的流程建模器演示
 * 展示优化后的类型系统和组件架构
 */

import React, { useState, useCallback } from 'react';
import { Card, Button, Space, message, Row, Col, Alert, Progress, Tag } from 'antd';
import { 
  SaveOutlined, 
  UndoOutlined, 
  RedoOutlined, 
  ClearOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

// Import enhanced types and utilities
import type { 
  TypedProcessNode,
  TypedProcessEdge,
  ProcessValidationResult
} from '../../types/components';
import type { BackendProcessDefinitionData } from '../../types/process';
import { useProcessDesigner } from '../../hooks/useProcessDesigner';
import { ProcessValidator } from '../../utils/processValidator';
import { ProcessConverter } from '../../utils/processConverter';

const EnhancedProcessDemo: React.FC = () => {
  const {
    state,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    selectItems,
    clearSelection,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    validate,
    validationResult,
    isValidating,
    getCurrentDefinition,
    isModified,
    selectedNodes,
    selectedEdges,
    isLoading,
    error
  } = useProcessDesigner();

  const [autoValidate, setAutoValidate] = useState(true);

  // 节点类型配置
  const nodeTypes = [
    { type: 'start', name: '开始', color: '#52c41a', icon: '⭕' },
    { type: 'userTask', name: '用户任务', color: '#1890ff', icon: '👤' },
    { type: 'serviceTask', name: '服务任务', color: '#722ed1', icon: '🔌' },
    { type: 'gateway', name: '网关', color: '#fa8c16', icon: '◇' },
    { type: 'end', name: '结束', color: '#f5222d', icon: '⭕' },
  ];

  // 添加节点
  const handleAddNode = useCallback((nodeType: string) => {
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 200 + 100
    };
    addNode(nodeType, position);
    message.success(`${nodeType}节点添加成功`);
  }, [addNode]);

  // 自动连接演示
  const handleAutoConnect = useCallback(() => {
    if (state.nodes.length < 2) {
      message.warning('需要至少2个节点才能创建连接');
      return;
    }

    const startNode = state.nodes.find(n => n.type === 'start');
    const otherNodes = state.nodes.filter(n => n.type !== 'start');
    
    if (startNode && otherNodes.length > 0) {
      const targetNode = otherNodes[0];
      addEdge(startNode.id, targetNode.id, {
        label: '自动连接',
        condition: 'auto'
      });
      message.success('自动连接创建成功');
    }
  }, [state.nodes, addEdge]);

  // 保存流程
  const handleSave = useCallback(() => {
    const definition = getCurrentDefinition();
    console.log('Enhanced Process Definition:', definition);
    
    const validation = ProcessValidator.validate(state.nodes, state.edges);
    console.log('Validation Result:', validation);
    
    message.success(
      `流程保存成功！节点数：${state.nodes.length}，连线数：${state.edges.length}，质量评分：${validation.score}`
    );
  }, [getCurrentDefinition, state.nodes, state.edges]);

  // 手动验证
  const handleValidate = useCallback(() => {
    validate();
    message.info('流程验证完成');
  }, [validate]);

  // 渲染验证结果
  const renderValidationResult = () => {
    if (!validationResult) return null;

    return (
      <div style={{ marginBottom: '16px' }}>
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>流程质量评分</span>
              <Progress 
                type="circle" 
                size={40}
                percent={validationResult.score} 
                strokeColor={
                  validationResult.score >= 80 ? '#52c41a' :
                  validationResult.score >= 60 ? '#fa8c16' : '#f5222d'
                }
              />
            </div>
          }
          description={
            <div>
              {validationResult.errors.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <ExclamationCircleOutlined style={{ color: '#f5222d', marginRight: '4px' }} />
                  <strong>错误 ({validationResult.errors.length}):</strong>
                  {validationResult.errors.slice(0, 3).map((error, index) => (
                    <div key={index} style={{ marginLeft: '20px', fontSize: '12px' }}>
                      • {error.message}
                    </div>
                  ))}
                  {validationResult.errors.length > 3 && (
                    <div style={{ marginLeft: '20px', fontSize: '12px', color: '#999' }}>
                      还有 {validationResult.errors.length - 3} 个错误...
                    </div>
                  )}
                </div>
              )}
              
              {validationResult.warnings.length > 0 && (
                <div>
                  <InfoCircleOutlined style={{ color: '#fa8c16', marginRight: '4px' }} />
                  <strong>建议 ({validationResult.warnings.length}):</strong>
                  {validationResult.warnings.slice(0, 2).map((warning, index) => (
                    <div key={index} style={{ marginLeft: '20px', fontSize: '12px' }}>
                      • {warning.message}
                    </div>
                  ))}
                  {validationResult.warnings.length > 2 && (
                    <div style={{ marginLeft: '20px', fontSize: '12px', color: '#999' }}>
                      还有 {validationResult.warnings.length - 2} 个建议...
                    </div>
                  )}
                </div>
              )}
            </div>
          }
          type={validationResult.isValid ? 'success' : 'error'}
          style={{ fontSize: '12px' }}
        />
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', padding: '16px' }}>
      <Card 
        title="增强的流程建模器 Demo"
        extra={
          <Space>
            <Button 
              icon={<UndoOutlined />} 
              disabled={!canUndo}
              onClick={undo}
              size="small"
            >
              撤销
            </Button>
            <Button 
              icon={<RedoOutlined />} 
              disabled={!canRedo}
              onClick={redo}
              size="small"
            >
              重做
            </Button>
            <Button 
              icon={<ClearOutlined />} 
              onClick={reset}
              size="small"
            >
              清空
            </Button>
            <Button 
              icon={<CheckCircleOutlined />} 
              onClick={handleValidate}
              loading={isValidating}
              size="small"
            >
              验证
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSave}
              disabled={!isModified}
            >
              保存流程
            </Button>
          </Space>
        }
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '8px' }}
      >
        {/* 错误提示 */}
        {error && (
          <Alert
            message="系统错误"
            description={error}
            type="error"
            closable
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* 验证结果 */}
        {renderValidationResult()}

        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          {/* 左侧工具栏 */}
          <Col span={4}>
            <Card title="节点工具箱" size="small" style={{ marginBottom: '16px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {nodeTypes.map(nodeType => (
                  <Button
                    key={nodeType.type}
                    block
                    onClick={() => handleAddNode(nodeType.type)}
                    style={{
                      borderColor: nodeType.color,
                      color: nodeType.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                    disabled={isLoading}
                  >
                    <span style={{ marginRight: '8px' }}>{nodeType.icon}</span>
                    {nodeType.name}
                  </Button>
                ))}
              </Space>
            </Card>

            <Card title="快速操作" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Button block onClick={handleAutoConnect} size="small">
                  自动连接
                </Button>
                <Button block onClick={handleValidate} loading={isValidating} size="small">
                  验证流程
                </Button>
              </Space>
            </Card>
          </Col>
          
          {/* 中间画布 */}
          <Col span={16}>
            <Card 
              title="增强流程画布" 
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
                  overflow: 'hidden',
                  border: validationResult?.isValid === false ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
                  borderRadius: '6px'
                }}
              >
                {/* 渲染节点 */}
                {state.nodes.map(node => {
                  const nodeConfig = nodeTypes.find(nt => nt.type === node.type);
                  const isSelected = selectedNodes.includes(node.id);
                  const hasError = validationResult?.errors.some(e => e.nodeId === node.id);
                  const hasWarning = validationResult?.warnings.some(w => w.nodeId === node.id);
                  
                  return (
                    <div
                      key={node.id}
                      style={{
                        position: 'absolute',
                        left: node.position.x,
                        top: node.position.y,
                        background: nodeConfig?.color || '#d9d9d9',
                        color: 'white',
                        border: isSelected ? '3px solid #1890ff' : 
                               hasError ? '2px solid #ff4d4f' :
                               hasWarning ? '2px solid #fa8c16' : 
                               `2px solid ${nodeConfig?.color || '#d9d9d9'}`,
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        minWidth: '80px',
                        textAlign: 'center',
                        fontSize: '12px',
                        boxShadow: isSelected ? '0 0 10px rgba(24, 144, 255, 0.5)' : 
                                   '0 2px 8px rgba(0, 0, 0, 0.1)',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => selectItems([node.id], [])}
                      onDoubleClick={() => {
                        // 双击编辑节点名称
                        const newName = prompt('输入新的节点名称:', node.data.label);
                        if (newName && newName !== node.data.label) {
                          updateNode(node.id, { label: newName });
                          message.success('节点名称更新成功');
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span>{nodeConfig?.icon}</span>
                        <span>{node.data.label}</span>
                      </div>
                      
                      {/* 状态指示器 */}
                      {(hasError || hasWarning) && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '-5px', 
                          right: '-5px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: hasError ? '#ff4d4f' : '#fa8c16',
                          border: '2px solid white'
                        }} />
                      )}
                    </div>
                  );
                })}

                {/* 渲染连线 */}
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
                  {state.edges.map(edge => {
                    const fromNode = state.nodes.find(n => n.id === edge.source);
                    const toNode = state.nodes.find(n => n.id === edge.target);
                    const isSelected = selectedEdges.includes(edge.id);
                    
                    if (!fromNode || !toNode) return null;
                    
                    return (
                      <g key={edge.id}>
                        <line
                          x1={fromNode.position.x + 40}
                          y1={fromNode.position.y + 15}
                          x2={toNode.position.x}
                          y2={toNode.position.y + 15}
                          stroke={isSelected ? '#52c41a' : '#1890ff'}
                          strokeWidth={isSelected ? 3 : 2}
                          markerEnd="url(#arrowhead)"
                          style={{
                            filter: isSelected ? 'drop-shadow(0 0 5px rgba(82, 196, 26, 0.5))' : 'none'
                          }}
                        />
                        {edge.data?.label && (
                          <text
                            x={(fromNode.position.x + toNode.position.x) / 2 + 20}
                            y={(fromNode.position.y + toNode.position.y) / 2 + 10}
                            fill="#262626"
                            fontSize="10px"
                            textAnchor="middle"
                          >
                            {edge.data.label}
                          </text>
                        )}
                      </g>
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

                {/* 空状态提示 */}
                {state.nodes.length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
                    <div>点击左侧按钮开始设计流程</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                      或拖拽节点到画布中
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </Col>
          
          {/* 右侧信息面板 */}
          <Col span={4}>
            <Card title="流程信息" size="small" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px' }}>
                <div><strong>节点数量:</strong> {state.nodes.length}</div>
                <div><strong>连线数量:</strong> {state.edges.length}</div>
                <div><strong>修改状态:</strong> 
                  <Tag color={isModified ? 'orange' : 'green'}>
                    {isModified ? '已修改' : '未修改'}
                  </Tag>
                </div>
                
                {validationResult && (
                  <div style={{ marginTop: '8px' }}>
                    <div><strong>质量评分:</strong> 
                      <Tag color={
                        validationResult.score >= 80 ? 'green' :
                        validationResult.score >= 60 ? 'orange' : 'red'
                      }>
                        {validationResult.score}/100
                      </Tag>
                    </div>
                    <div><strong>验证状态:</strong> 
                      <Tag color={validationResult.isValid ? 'green' : 'red'}>
                        {validationResult.isValid ? '通过' : '失败'}
                      </Tag>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 选中项信息 */}
            {(selectedNodes.length > 0 || selectedEdges.length > 0) && (
              <Card title="选中项" size="small" style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px' }}>
                  {selectedNodes.length > 0 && (
                    <div>
                      <strong>选中节点:</strong>
                      {selectedNodes.map(nodeId => {
                        const node = state.nodes.find(n => n.id === nodeId);
                        return (
                          <div key={nodeId} style={{ marginLeft: '8px' }}>
                            • {node?.data.label} ({node?.type})
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {selectedEdges.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>选中连线:</strong>
                      {selectedEdges.map(edgeId => {
                        const edge = state.edges.find(e => e.id === edgeId);
                        const fromNode = state.nodes.find(n => n.id === edge?.source);
                        const toNode = state.nodes.find(n => n.id === edge?.target);
                        return (
                          <div key={edgeId} style={{ marginLeft: '8px' }}>
                            • {fromNode?.data.label} → {toNode?.data.label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <Button 
                    size="small" 
                    block 
                    style={{ marginTop: '8px' }}
                    onClick={clearSelection}
                  >
                    清除选择
                  </Button>
                </div>
              </Card>
            )}

            {/* 操作历史 */}
            <Card title="操作历史" size="small">
              <div style={{ fontSize: '12px' }}>
                <div><strong>可撤销操作:</strong> {state.history.past.length}</div>
                <div><strong>可重做操作:</strong> {state.history.future.length}</div>
                
                <Space style={{ marginTop: '8px', width: '100%' }} direction="vertical">
                  <Button 
                    size="small" 
                    block 
                    disabled={!canUndo}
                    onClick={undo}
                  >
                    撤销上一步
                  </Button>
                  <Button 
                    size="small" 
                    block 
                    disabled={!canRedo}
                    onClick={redo}
                  >
                    重做下一步
                  </Button>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default EnhancedProcessDemo;
