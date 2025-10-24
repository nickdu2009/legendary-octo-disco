import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BranchesOutlined } from '@ant-design/icons';

const GatewayNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`process-node gateway-node ${selected ? 'selected' : ''}`}>
      <div className="node-content">
        <div className="node-icon">
          <BranchesOutlined style={{ fontSize: '18px', color: '#fa8c16' }} />
        </div>
        <div className="node-label">{data.label || '条件网关'}</div>
        {data.condition && (
          <div className="node-condition">
            条件: {data.condition}
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
        id="true"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="node-handle source-handle"
        id="false"
      />
    </div>
  );
};

export default GatewayNode;
