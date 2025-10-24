import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

interface GatewayNodeData {
  label: string;
  condition?: string;
  gatewayType?: 'exclusive' | 'inclusive' | 'parallel';
  [key: string]: any;
}

const GatewayNode: React.FC<NodeProps<GatewayNodeData>> = ({ data, selected }) => {
  const getGatewayIcon = () => {
    switch (data.gatewayType) {
      case 'parallel':
        return '+';
      case 'inclusive':
        return '○';
      default:
        return '×';
    }
  };

  return (
    <div className={`custom-node gateway-node ${data.gatewayType || 'exclusive'} ${selected ? 'selected' : ''}`}>
      <div className="gateway-shape">
        <div className="gateway-icon">{getGatewayIcon()}</div>
      </div>
      
      <div className="node-label-bottom">
        {data.label || '条件网关'}
      </div>
      
      {data.condition && (
        <div className="node-condition">
          {data.condition}
        </div>
      )}
      
      <Handle 
        type="target" 
        position={Position.Top} 
        className="node-handle node-handle-target"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="node-handle node-handle-source"
        id="true"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="node-handle node-handle-source"
        id="false"
      />
    </div>
  );
};

export default GatewayNode;
