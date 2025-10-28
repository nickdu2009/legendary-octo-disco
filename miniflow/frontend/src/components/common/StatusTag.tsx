/**
 * 状态标签组件
 * 统一的状态展示组件
 */

import React from 'react';
import { Tag, TagProps } from 'antd';
import { formatTaskStatus, formatInstanceStatus, formatPriority } from '../../utils/formatters';

interface StatusTagProps extends Omit<TagProps, 'color'> {
  type: 'task' | 'instance' | 'priority';
  value: string | number;
  showText?: boolean;
}

const StatusTag: React.FC<StatusTagProps> = ({ 
  type, 
  value, 
  showText = true, 
  ...props 
}) => {
  const getStatusInfo = () => {
    switch (type) {
      case 'task':
        return formatTaskStatus(value as string);
      case 'instance':
        return formatInstanceStatus(value as string);
      case 'priority':
        return formatPriority(value as number);
      default:
        return { text: String(value), color: 'default' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Tag color={statusInfo.color} {...props}>
      {showText ? statusInfo.text : value}
    </Tag>
  );
};

export default StatusTag;
