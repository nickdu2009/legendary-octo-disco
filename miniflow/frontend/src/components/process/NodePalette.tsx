import React from 'react';
import { Card, Space, Button, Tooltip } from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  UserOutlined, 
  BranchesOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { NodeTypeConfig } from '../../types/process';

interface NodePaletteProps {
  onAddNode: (nodeType: string, position?: { x: number; y: number }) => void;
  disabled?: boolean;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode, disabled = false }) => {
  const nodeTypes: NodeTypeConfig[] = [
    { 
      type: 'start', 
      label: '开始', 
      icon: 'PlayCircleOutlined', 
      color: '#52c41a',
      description: '流程开始节点，每个流程只能有一个开始节点',
      allowedConnections: { input: false, output: true }
    },
    { 
      type: 'userTask', 
      label: '用户任务', 
      icon: 'UserOutlined', 
      color: '#1890ff',
      description: '需要用户手动处理的任务节点',
      allowedConnections: { input: true, output: true }
    },
    { 
      type: 'serviceTask', 
      label: '服务任务', 
      icon: 'ApiOutlined', 
      color: '#722ed1',
      description: '自动执行的服务任务节点',
      allowedConnections: { input: true, output: true }
    },
    { 
      type: 'gateway', 
      label: '条件网关', 
      icon: 'BranchesOutlined', 
      color: '#fa8c16',
      description: '根据条件判断流程走向的网关节点',
      allowedConnections: { input: true, output: true }
    },
    { 
      type: 'end', 
      label: '结束', 
      icon: 'StopOutlined', 
      color: '#f5222d',
      description: '流程结束节点，可以有多个结束节点',
      allowedConnections: { input: true, output: false }
    },
  ];

  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      PlayCircleOutlined: <PlayCircleOutlined />,
      StopOutlined: <StopOutlined />,
      UserOutlined: <UserOutlined />,
      BranchesOutlined: <BranchesOutlined />,
      ApiOutlined: <ApiOutlined />,
    };
    return iconMap[iconName] || <UserOutlined />;
  };

  const handleNodeClick = (nodeType: string) => {
    // 在画布中心添加节点
    const centerPosition = { x: 250, y: 200 };
    onAddNode(nodeType, centerPosition);
  };

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card 
      title="节点工具箱" 
      size="small" 
      className="node-palette"
      style={{ width: '100%', height: 'fit-content' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {nodeTypes.map(nodeType => (
          <Tooltip 
            key={nodeType.type}
            title={
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  {nodeType.label}
                </div>
                <div style={{ fontSize: '12px' }}>
                  {nodeType.description}
                </div>
                <div style={{ fontSize: '11px', marginTop: 4, color: '#ccc' }}>
                  {nodeType.allowedConnections?.input ? '可接收连线' : '不可接收连线'} | {' '}
                  {nodeType.allowedConnections?.output ? '可输出连线' : '不可输出连线'}
                </div>
              </div>
            }
            placement="right"
          >
            <Button
              block
              icon={getIcon(nodeType.icon)}
              style={{ 
                borderColor: nodeType.color,
                color: nodeType.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                height: '36px',
                cursor: disabled ? 'not-allowed' : 'grab'
              }}
              disabled={disabled}
              onClick={() => handleNodeClick(nodeType.type)}
              onDragStart={(e) => handleDragStart(e, nodeType.type)}
              draggable={!disabled}
            >
              <span style={{ marginLeft: '8px' }}>
                {nodeType.label}
              </span>
            </Button>
          </Tooltip>
        ))}
      </Space>
      
      <div style={{ 
        marginTop: '12px', 
        padding: '8px', 
        background: '#f5f5f5', 
        borderRadius: '4px',
        fontSize: '11px',
        color: '#666'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>使用提示:</div>
        <div>• 点击按钮在画布中心添加节点</div>
        <div>• 拖拽按钮到画布指定位置添加节点</div>
        <div>• 连接节点创建流程流向</div>
      </div>
    </Card>
  );
};

export default NodePalette;
