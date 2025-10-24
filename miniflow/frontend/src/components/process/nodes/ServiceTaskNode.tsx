import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { ApiOutlined } from '@ant-design/icons';

interface ServiceTaskNodeData {
  label: string;
  serviceType?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

const ServiceTaskNode: React.FC<NodeProps<ServiceTaskNodeData>> = ({ data, selected }) => {
  return (
    <div className={`custom-node service-task-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <ApiOutlined className="node-icon" />
        <span className="node-label">{data.label || '服务任务'}</span>
      </div>
      
      {(data.serviceType || data.endpoint) && (
        <div className="node-content">
          {data.serviceType && (
            <div className="service-type">
              <span className="service-label">类型:</span>
              <span className="service-value">{data.serviceType}</span>
            </div>
          )}
          {data.endpoint && (
            <div className="service-endpoint">
              <span className="service-label">接口:</span>
              <span className="service-value">{data.endpoint}</span>
            </div>
          )}
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

export default ServiceTaskNode;
