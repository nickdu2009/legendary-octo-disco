import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { UserOutlined } from '@ant-design/icons';

const UserTaskNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`process-node user-task-node ${selected ? 'selected' : ''}`}>
      <div className="node-content">
        <div className="node-icon">
          <UserOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
        </div>
        <div className="node-label">{data.label || '用户任务'}</div>
        {data.assignee && (
          <div className="node-assignee">
            分配给: {data.assignee}
          </div>
        )}
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="node-handle target-handle"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="node-handle source-handle"
      />
    </div>
  );
};

export default UserTaskNode;
