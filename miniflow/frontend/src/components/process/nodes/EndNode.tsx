import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { StopOutlined } from '@ant-design/icons';

const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`process-node end-node ${selected ? 'selected' : ''}`}>
      <div className="node-content">
        <div className="node-icon">
          <StopOutlined style={{ fontSize: '20px', color: '#f5222d' }} />
        </div>
        <div className="node-label">{data.label || '结束'}</div>
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="node-handle target-handle"
      />
    </div>
  );
};

export default EndNode;
