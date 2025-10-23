// Data formatting utilities

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export class Formatters {
  // Date formatting
  static formatDate(date: string | Date, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, formatStr, { locale: zhCN });
    } catch {
      return '无效日期';
    }
  }

  static formatRelativeTime(date: string | Date): string {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true, locale: zhCN });
    } catch {
      return '未知时间';
    }
  }

  static formatDateOnly(date: string | Date): string {
    return this.formatDate(date, 'yyyy-MM-dd');
  }

  static formatTimeOnly(date: string | Date): string {
    return this.formatDate(date, 'HH:mm:ss');
  }

  // User role formatting
  static formatUserRole(role: string): string {
    const roleMap: Record<string, string> = {
      admin: '管理员',
      user: '普通用户',
      moderator: '版主',
    };
    return roleMap[role] || role;
  }

  // User status formatting
  static formatUserStatus(status: string): string {
    const statusMap: Record<string, string> = {
      active: '活跃',
      inactive: '非活跃',
      suspended: '已暂停',
      banned: '已封禁',
    };
    return statusMap[status] || status;
  }

  // File size formatting
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // Number formatting
  static formatNumber(num: number): string {
    return new Intl.NumberFormat('zh-CN').format(num);
  }

  static formatPercentage(value: number, total: number): string {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  }

  // Text formatting
  static truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  }

  static capitalizeFirst(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Phone number formatting
  static formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Format as xxx-xxxx-xxxx
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    
    return phone;
  }

  // Avatar fallback
  static getAvatarFallback(displayName: string, username: string): string {
    const name = displayName || username;
    if (name.length === 0) return '?';
    
    // Return first character in uppercase
    return name.charAt(0).toUpperCase();
  }

  // URL formatting
  static ensureHttpProtocol(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  }
}

// Export individual functions for tree shaking
export const {
  formatDate,
  formatRelativeTime,
  formatDateOnly,
  formatTimeOnly,
  formatUserRole,
  formatUserStatus,
  formatFileSize,
  formatNumber,
  formatPercentage,
  truncateText,
  capitalizeFirst,
  formatPhoneNumber,
  getAvatarFallback,
  ensureHttpProtocol,
} = Formatters;
