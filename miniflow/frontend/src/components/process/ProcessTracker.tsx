import React, { useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import type { Node, Edge, NodeTypes } from 'reactflow';
import {
  Card,
  Tag,
  Tooltip,
  Button,
  Space,
  Modal,
  Descriptions,
  Timeline,
  Progress,
  Alert,
  Spin,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  SettingOutlined,
  EyeOutlined,
  FullscreenOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'reactflow/dist/style.css';
import { instanceApi } from '../../services/instanceApi';
import type { InstanceHistory } from '../../types/instance';

// 类型定义
interface ProcessTrackerProps {
  instanceId: number;
  processDefinition: any;
  executionData?: any;
  onNodeClick?: (nodeId: string, nodeData: any) => void;
  onTaskAction?: (taskId: number, action: string) => void;
  height?: number;
  interactive?: boolean;
}

interface ExecutionNode {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  tasks?: any[];
  executionTime?: number;
  startTime?: string;
  endTime?: string;
}

interface ExecutionPath {
  node: string;
  timestamp: string;
  status?: string;
}

// 节点状态样式映射
const nodeStatusStyles = {
  pending: {
    background: '#f5f5f5',
    border: '2px solid #d9d9d9',
    color: '#999'
  },
  active: {
    background: '#e6f7ff',
    border: '2px solid #1890ff',
    color: '#1890ff',
    boxShadow: '0 0 10px rgba(24, 144, 255, 0.3)'
  },
  completed: {
    background: '#f6ffed',
    border: '2px solid #52c41a',
    color: '#52c41a'
  },
  failed: {
    background: '#fff2f0',
    border: '2px solid #ff4d4f',
    color: '#ff4d4f'
  },
  skipped: {
    background: '#fafafa',
    border: '2px solid #bfbfbf',
    color: '#bfbfbf'
  }
};

// 自定义节点组件
const TrackingNode: React.FC<{ data: any; selected?: boolean }> = ({ data, selected }) => {
  const { label, status, nodeType, tasks, executionTime, startTime, endTime } = data;
  const style = nodeStatusStyles[status as keyof typeof nodeStatusStyles];

  const getNodeIcon = () => {
    switch (nodeType) {
      case 'start':
        return <PlayCircleOutlined />;
      case 'end':
        return <CheckCircleOutlined />;
      case 'userTask':
        return <UserOutlined />;
      case 'serviceTask':
        return <SettingOutlined />;
      case 'gateway':
        return <ExclamationCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return <Tag color="processing">进行中</Tag>;
      case 'completed':
        return <Tag color="success">已完成</Tag>;
      case 'failed':
        return <Tag color="error">失败</Tag>;
      case 'skipped':
        return <Tag color="default">已跳过</Tag>;
      default:
        return <Tag color="default">待执行</Tag>;
    }
  };

  return (
    <Tooltip
      title={
        <div>
          <div style={{ fontWeight: 500 }}>{label}</div>
          <div>状态: {getStatusBadge()}</div>
          <div>类型: {nodeType}</div>
          {tasks && tasks.length > 0 && (
            <div>任务数: {tasks.length}</div>
          )}
          {executionTime && (
            <div>执行时间: {executionTime}秒</div>
          )}
          {startTime && (
            <div>开始时间: {dayjs(startTime).format('HH:mm:ss')}</div>
          )}
          {endTime && (
            <div>结束时间: {dayjs(endTime).format('HH:mm:ss')}</div>
          )}
        </div>
      }
    >
      <div
        style={{
          ...style,
          padding: '8px 12px',
          borderRadius: '8px',
          minWidth: '120px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          ...(selected && { transform: 'scale(1.05)' })
        }}
      >
        <div style={{ marginBottom: 4 }}>
          {getNodeIcon()}
          <span style={{ marginLeft: 4, fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ fontSize: '12px' }}>
          {getStatusBadge()}
        </div>
        {tasks && tasks.length > 0 && (
          <div style={{ fontSize: '10px', marginTop: 2 }}>
            {tasks.length} 个任务
          </div>
        )}
      </div>
    </Tooltip>
  );
};

// 自定义边组件
const TrackingEdge: React.FC<{ data: any }> = ({ data }) => {
  const { executed, condition, label } = data;
  
  return (
    <div style={{
      background: executed ? '#52c41a' : '#d9d9d9',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      color: executed ? '#fff' : '#666'
    }}>
      {label || condition || ''}
    </div>
  );
};

const ProcessTracker: React.FC<ProcessTrackerProps> = ({
  instanceId,
  processDefinition,
  executionData,
  onNodeClick,
  onTaskAction,
  height = 500,
  interactive = true
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeDetailModalVisible, setNodeDetailModalVisible] = useState(false);
  const [currentNodeData, setCurrentNodeData] = useState<any>(null);

  // 获取执行历史数据
  const fetchExecutionData = async () => {
    if (!instanceId) return;

    setLoading(true);
    try {
      const history = await instanceApi.getInstanceHistory(instanceId);
      updateNodesWithExecutionData(history);
    } catch (error) {
      console.error('获取执行历史异常:', error);
      message.error('获取执行历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 根据执行数据更新节点状态
  const updateNodesWithExecutionData = (execData: any) => {
    if (!processDefinition || !processDefinition.nodes) return;

    const { instance, tasks = [] } = execData;
    let executionPath: ExecutionPath[] = [];
    
    try {
      if (instance?.execution_path) {
        executionPath = JSON.parse(instance.execution_path);
      }
    } catch (e) {
      console.warn('解析执行路径失败:', e);
    }

    // 计算节点状态
    const nodeStatusMap = new Map<string, string>();
    const nodeTasksMap = new Map<string, any[]>();

    // 根据执行路径确定节点状态
    executionPath.forEach((pathItem, index) => {
      if (index < executionPath.length - 1) {
        nodeStatusMap.set(pathItem.node, 'completed');
      } else {
        nodeStatusMap.set(pathItem.node, instance?.status === 'running' ? 'active' : 'completed');
      }
    });

    // 根据任务状态更新节点状态
    tasks.forEach((task: any) => {
      const nodeId = task.node_id;
      if (!nodeTasksMap.has(nodeId)) {
        nodeTasksMap.set(nodeId, []);
      }
      nodeTasksMap.get(nodeId)?.push(task);

      // 如果有失败的任务，节点状态为失败
      if (task.status === 'failed') {
        nodeStatusMap.set(nodeId, 'failed');
      }
    });

    // 创建增强的节点
    const enhancedNodes = processDefinition.nodes.map((node: any) => {
      const status = nodeStatusMap.get(node.id) || 'pending';
      const nodeTasks = nodeTasksMap.get(node.id) || [];

      return {
        id: node.id,
        type: 'trackingNode',
        position: { x: node.x || 0, y: node.y || 0 },
        data: {
          label: node.name,
          status,
          nodeType: node.type,
          tasks: nodeTasks,
          executionTime: nodeTasks.reduce((total, task) => total + (task.actual_duration || 0), 0),
          startTime: nodeTasks[0]?.start_time,
          endTime: nodeTasks[0]?.complete_time,
          originalNode: node
        },
        draggable: false
      };
    });

    // 创建增强的边
    const enhancedEdges = processDefinition.flows?.map((flow: any) => {
      const executed = nodeStatusMap.has(flow.to);
      
      return {
        id: flow.id,
        source: flow.from,
        target: flow.to,
        type: 'smoothstep',
        animated: executed && nodeStatusMap.get(flow.to) === 'active',
        style: {
          stroke: executed ? '#52c41a' : '#d9d9d9',
          strokeWidth: executed ? 3 : 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: executed ? '#52c41a' : '#d9d9d9'
        },
        label: flow.label,
        labelStyle: {
          fill: executed ? '#52c41a' : '#666',
          fontWeight: executed ? 500 : 400
        },
        data: {
          executed,
          condition: flow.condition,
          label: flow.label
        }
      };
    }) || [];

    setNodes(enhancedNodes);
    setEdges(enhancedEdges);
  };

  // 节点类型定义
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trackingNode: TrackingNode
    }),
    []
  );

  // 处理节点点击
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    setCurrentNodeData(node.data);
    setNodeDetailModalVisible(true);
    onNodeClick?.(node.id, node.data);
  };

  // 组件挂载时初始化
  useEffect(() => {
    if (processDefinition) {
      if (executionData) {
        updateNodesWithExecutionData(executionData);
      } else if (instanceId) {
        fetchExecutionData();
      } else {
        // 初始化静态节点（无执行数据）
        const initialNodes = processDefinition.nodes?.map((node: any) => ({
          id: node.id,
          type: 'trackingNode',
          position: { x: node.x || 0, y: node.y || 0 },
          data: {
            label: node.name,
            status: 'pending',
            nodeType: node.type,
            originalNode: node
          },
          draggable: false
        })) || [];

        const initialEdges = processDefinition.flows?.map((flow: any) => ({
          id: flow.id,
          source: flow.from,
          target: flow.to,
          type: 'smoothstep',
          style: { stroke: '#d9d9d9', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#d9d9d9' },
          label: flow.label
        })) || [];

        setNodes(initialNodes);
        setEdges(initialEdges);
      }
    }
  }, [processDefinition, executionData, instanceId]);

  return (
    <div style={{ position: 'relative' }}>
      <Card
        title={
          <Space>
            <EyeOutlined />
            流程执行跟踪
            {instanceId && <Tag color="blue">实例 #{instanceId}</Tag>}
          </Space>
        }
        extra={
          <Space>
            {instanceId && (
              <Button 
                size="small"
                icon={<ReloadOutlined />}
                onClick={fetchExecutionData}
                loading={loading}
              >
                刷新
              </Button>
            )}
            <Button 
              size="small"
              icon={<FullscreenOutlined />}
              onClick={() => {
                // TODO: 实现全屏模式
                message.info('全屏模式开发中...');
              }}
            >
              全屏
            </Button>
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ height: `${height}px`, position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <Spin size="large" />
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={interactive ? handleNodeClick : undefined}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background gap={20} size={1} />
            <Controls />
            <MiniMap 
              style={{ 
                height: 120, 
                background: '#f5f5f5',
                border: '1px solid #d9d9d9'
              }}
              nodeColor={(node) => {
                const status = node.data?.status || 'pending';
                switch (status) {
                  case 'active': return '#1890ff';
                  case 'completed': return '#52c41a';
                  case 'failed': return '#ff4d4f';
                  default: return '#d9d9d9';
                }
              }}
            />
          </ReactFlow>
        </div>

        {/* 图例 */}
        <div style={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #d9d9d9'
        }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>状态图例</div>
          <Space direction="vertical" size="small">
            <div><Tag color="default">待执行</Tag></div>
            <div><Tag color="processing">进行中</Tag></div>
            <div><Tag color="success">已完成</Tag></div>
            <div><Tag color="error">失败</Tag></div>
            <div><Tag color="default">已跳过</Tag></div>
          </Space>
        </div>
      </Card>

      {/* 节点详情Modal */}
      <Modal
        title={`节点详情 - ${currentNodeData?.label}`}
        open={nodeDetailModalVisible}
        onCancel={() => setNodeDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {currentNodeData && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="节点ID">{selectedNode}</Descriptions.Item>
              <Descriptions.Item label="节点名称">{currentNodeData.label}</Descriptions.Item>
              <Descriptions.Item label="节点类型">
                <Tag color="blue">{currentNodeData.nodeType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="执行状态">
                <Tag color={nodeStatusStyles[currentNodeData.status as keyof typeof nodeStatusStyles] ? 
                  (currentNodeData.status === 'active' ? 'processing' :
                   currentNodeData.status === 'completed' ? 'success' :
                   currentNodeData.status === 'failed' ? 'error' : 'default') : 'default'}>
                  {currentNodeData.status === 'active' ? '进行中' :
                   currentNodeData.status === 'completed' ? '已完成' :
                   currentNodeData.status === 'failed' ? '失败' :
                   currentNodeData.status === 'skipped' ? '已跳过' : '待执行'}
                </Tag>
              </Descriptions.Item>
              {currentNodeData.executionTime > 0 && (
                <Descriptions.Item label="执行时长">
                  {currentNodeData.executionTime} 秒
                </Descriptions.Item>
              )}
              {currentNodeData.startTime && (
                <Descriptions.Item label="开始时间">
                  {dayjs(currentNodeData.startTime).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {currentNodeData.endTime && (
                <Descriptions.Item label="结束时间">
                  {dayjs(currentNodeData.endTime).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 节点任务列表 */}
            {currentNodeData.tasks && currentNodeData.tasks.length > 0 && (
              <>
                <Divider>节点任务</Divider>
                <Timeline>
                  {currentNodeData.tasks.map((task: any) => (
                    <Timeline.Item
                      key={task.id}
                      color={
                        task.status === 'completed' ? 'green' :
                        task.status === 'failed' ? 'red' :
                        task.status === 'in_progress' ? 'blue' : 'gray'
                      }
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {task.name}
                          <Tag 
                            size="small" 
                            color={task.status === 'completed' ? 'success' : 
                                   task.status === 'failed' ? 'error' : 
                                   task.status === 'in_progress' ? 'processing' : 'default'}
                            style={{ marginLeft: 8 }}
                          >
                            {task.status}
                          </Tag>
                        </div>
                        {task.assignee && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            负责人: {task.assignee.display_name || task.assignee.username}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          创建: {dayjs(task.created_at).format('MM-DD HH:mm')}
                          {task.complete_time && (
                            <span style={{ marginLeft: 8 }}>
                              完成: {dayjs(task.complete_time).format('MM-DD HH:mm')}
                            </span>
                          )}
                        </div>
                        {task.comment && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            marginTop: 4,
                            padding: '4px 8px',
                            background: '#f5f5f5',
                            borderRadius: '4px'
                          }}>
                            {task.comment}
                          </div>
                        )}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </>
            )}

            {/* 节点配置信息 */}
            {currentNodeData.originalNode?.props && (
              <>
                <Divider>节点配置</Divider>
                <pre style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxHeight: '150px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(currentNodeData.originalNode.props, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProcessTracker;
