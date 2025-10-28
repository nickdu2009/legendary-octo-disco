/**
 * 格式化工具函数
 */

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return '刚刚';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  } else if (diffInDays < 7) {
    return `${diffInDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
};

/**
 * 格式化执行时长
 */
export const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0秒';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  let result = '';
  if (days > 0) result += `${days}天`;
  if (hours > 0) result += `${hours}小时`;
  if (minutes > 0) result += `${minutes}分钟`;
  if (remainingSeconds > 0 && !days && !hours) result += `${remainingSeconds}秒`;
  
  return result || '少于1秒';
};

/**
 * 格式化优先级
 */
export const formatPriority = (priority: number): { text: string; color: string; level: string } => {
  if (priority >= 90) return { text: '紧急', color: 'red', level: 'urgent' };
  if (priority >= 70) return { text: '高', color: 'orange', level: 'high' };
  if (priority >= 40) return { text: '中', color: 'blue', level: 'medium' };
  return { text: '低', color: 'default', level: 'low' };
};

/**
 * 格式化任务状态
 */
export const formatTaskStatus = (status: string): { text: string; color: string } => {
  const statusMap: Record<string, { text: string; color: string }> = {
    created: { text: '已创建', color: 'default' },
    assigned: { text: '已分配', color: 'blue' },
    claimed: { text: '已认领', color: 'orange' },
    in_progress: { text: '进行中', color: 'processing' },
    completed: { text: '已完成', color: 'success' },
    failed: { text: '失败', color: 'error' },
    skipped: { text: '已跳过', color: 'default' },
    escalated: { text: '已升级', color: 'warning' }
  };
  
  return statusMap[status] || { text: status, color: 'default' };
};

/**
 * 格式化流程实例状态
 */
export const formatInstanceStatus = (status: string): { text: string; color: string } => {
  const statusMap: Record<string, { text: string; color: string }> = {
    running: { text: '运行中', color: 'processing' },
    suspended: { text: '已暂停', color: 'warning' },
    completed: { text: '已完成', color: 'success' },
    failed: { text: '失败', color: 'error' },
    cancelled: { text: '已取消', color: 'default' }
  };
  
  return statusMap[status] || { text: status, color: 'default' };
};

/**
 * 计算执行进度
 */
export const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

/**
 * 检查是否超期
 */
export const isOverdue = (dueDate: string): boolean => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化数字
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN');
};

/**
 * 格式化百分比
 */
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

/**
 * 格式化用户角色
 */
export const formatUserRole = (role: string): string => {
  const roleMap: { [key: string]: string } = {
    admin: '管理员',
    user: '普通用户',
    manager: '经理'
  };
  return roleMap[role] || role;
};

/**
 * 获取头像回退文字
 */
export const getAvatarFallback = (name: string): string => {
  return name ? name.charAt(0).toUpperCase() : 'U';
};