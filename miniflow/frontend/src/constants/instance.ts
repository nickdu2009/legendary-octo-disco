/**
 * 流程实例相关常量定义
 */

import type { InstanceStatus } from '../types/instance';

// 流程实例状态映射
export const INSTANCE_STATUS_MAP: Record<InstanceStatus, { text: string; color: string }> = {
  running: { text: '运行中', color: 'processing' },
  suspended: { text: '已暂停', color: 'warning' },
  completed: { text: '已完成', color: 'success' },
  failed: { text: '失败', color: 'error' },
  cancelled: { text: '已取消', color: 'default' }
};

// 时长格式化工具函数
export const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0秒';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let result = '';
  if (days > 0) result += `${days}天`;
  if (hours > 0) result += `${hours}小时`;
  if (minutes > 0) result += `${minutes}分钟`;
  
  return result || '少于1分钟';
};

// 计算执行进度工具函数
export const calculateProgress = (instance: { task_count: number; completed_tasks: number }): number => {
  if (instance.task_count === 0) return 0;
  return Math.round((instance.completed_tasks / instance.task_count) * 100);
};
