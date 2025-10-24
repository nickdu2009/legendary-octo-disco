import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { StopOutlined } from '@ant-design/icons';

interface EndNodeData {
  label: string;
  [key: string]: unknown;
}

const EndNode: React.FC<NodeProps<EndNodeData>> = ({ data, selected }) => {
  return (
    <div className={`custom-node end-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <StopOutlined className="node-icon" />
        <span className="node-label">{data.label || '结束'}</span>
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="node-handle node-handle-target"
      />
    </div>
  );
};

export default EndNode;
