import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { PlayCircleOutlined } from '@ant-design/icons';

const StartNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`process-node start-node ${selected ? 'selected' : ''}`}>
      <div className="node-content">
        <div className="node-icon">
          <PlayCircleOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
        </div>
        <div className="node-label">{data.label || '开始'}</div>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="node-handle source-handle"
      />
    </div>
  );
};

export default StartNode;
