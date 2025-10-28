/**
 * 任务相关常量定义
 */

import type { TaskStatus, TaskType } from '../types/task';

// 任务状态映射
export const TASK_STATUS_MAP: Record<TaskStatus, { text: string; color: string }> = {
  created: { text: '已创建', color: 'default' },
  assigned: { text: '已分配', color: 'blue' },
  claimed: { text: '已认领', color: 'orange' },
  in_progress: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  failed: { text: '失败', color: 'error' },
  skipped: { text: '已跳过', color: 'default' },
  escalated: { text: '已升级', color: 'warning' }
};

// 任务类型映射
export const TASK_TYPE_MAP: Record<TaskType, { text: string; color: string }> = {
  userTask: { text: '用户任务', color: 'blue' },
  serviceTask: { text: '服务任务', color: 'green' },
  scriptTask: { text: '脚本任务', color: 'purple' },
  mailTask: { text: '邮件任务', color: 'orange' },
  manualTask: { text: '手工任务', color: 'cyan' }
};

// 优先级映射
export const PRIORITY_MAP = {
  low: { text: '低', color: 'default', range: [1, 33] as [number, number] },
  medium: { text: '中', color: 'blue', range: [34, 66] as [number, number] },
  high: { text: '高', color: 'orange', range: [67, 89] as [number, number] },
  urgent: { text: '紧急', color: 'red', range: [90, 100] as [number, number] }
};

// 获取优先级信息的工具函数
export const getPriorityInfo = (priority: number) => {
  for (const [key, info] of Object.entries(PRIORITY_MAP)) {
    if (priority >= info.range[0] && priority <= info.range[1]) {
      return { key, ...info };
    }
  }
  return { key: 'medium', text: '中', color: 'blue' };
};
