import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { UserOutlined } from '@ant-design/icons';

interface UserTaskNodeData {
  label: string;
  assignee?: string;
  description?: string;
  [key: string]: unknown;
}

const UserTaskNode: React.FC<NodeProps<UserTaskNodeData>> = ({ data, selected }) => {
  return (
    <div className={`custom-node user-task-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <UserOutlined className="node-icon" />
        <span className="node-label">{data.label || '用户任务'}</span>
      </div>
      
      {data.assignee && (
        <div className="node-content">
          <div className="node-assignee">
            <span className="assignee-label">处理人:</span>
            <span className="assignee-value">{data.assignee}</span>
          </div>
        </div>
      )}
      
      {data.description && (
        <div className="node-description">
          {data.description}
        </div>
      )}
      
      <Handle 
        type="target" 
        position={Position.Left} 
        className="node-handle node-handle-target"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="node-handle node-handle-source"
      />
    </div>
  );
};

export default UserTaskNode;
