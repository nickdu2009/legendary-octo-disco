import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { PlayCircleOutlined } from '@ant-design/icons';

interface StartNodeData {
  label: string;
  [key: string]: unknown;
}

const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data, selected }) => {
  return (
    <div className={`custom-node start-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <PlayCircleOutlined className="node-icon" />
        <span className="node-label">{data.label || '开始'}</span>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="node-handle node-handle-source"
      />
    </div>
  );
};

export default StartNode;
