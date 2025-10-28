/**
 * 任务相关的数据验证工具
 */

import type { TaskInstance, FormField } from '../types/task';

// 任务状态验证
export const validateTaskStatus = (task: TaskInstance, targetStatus: string): boolean => {
  const validTransitions: Record<string, string[]> = {
    created: ['assigned'],
    assigned: ['claimed', 'skipped'],
    claimed: ['in_progress', 'assigned'],
    in_progress: ['completed', 'failed'],
    completed: [],
    failed: ['assigned'], // 可以重新分配
    skipped: [],
    escalated: ['assigned']
  };

  return validTransitions[task.status]?.includes(targetStatus) || false;
};

// 任务操作权限验证
export const validateTaskOperation = (
  task: TaskInstance, 
  userId: number, 
  operation: 'claim' | 'complete' | 'release' | 'delegate'
): { valid: boolean; reason?: string } => {
  switch (operation) {
    case 'claim':
      if (task.status !== 'assigned') {
        return { valid: false, reason: '只能认领已分配的任务' };
      }
      if (task.assignee_id && task.assignee_id !== userId) {
        return { valid: false, reason: '任务已分配给其他用户' };
      }
      return { valid: true };

    case 'complete':
      if (!['claimed', 'in_progress'].includes(task.status)) {
        return { valid: false, reason: '只能完成已认领或进行中的任务' };
      }
      if (task.claimed_by !== userId && task.assignee_id !== userId) {
        return { valid: false, reason: '只能完成自己的任务' };
      }
      return { valid: true };

    case 'release':
      if (task.status !== 'claimed') {
        return { valid: false, reason: '只能释放已认领的任务' };
      }
      if (task.claimed_by !== userId) {
        return { valid: false, reason: '只能释放自己认领的任务' };
      }
      return { valid: true };

    case 'delegate':
      if (!['assigned', 'claimed'].includes(task.status)) {
        return { valid: false, reason: '只能委派已分配或已认领的任务' };
      }
      if (task.assignee_id !== userId && task.claimed_by !== userId) {
        return { valid: false, reason: '只能委派自己的任务' };
      }
      return { valid: true };

    default:
      return { valid: false, reason: '未知操作' };
  }
};

// 表单字段验证
export const validateFormField = (
  field: FormField, 
  value: any
): { valid: boolean; message?: string } => {
  // 必填验证
  if (field.required && (value === undefined || value === null || value === '')) {
    return { valid: false, message: `${field.label}为必填项` };
  }

  // 跳过空值的其他验证
  if (value === undefined || value === null || value === '') {
    return { valid: true };
  }

  // 类型验证
  switch (field.type) {
    case 'text':
    case 'textarea':
      if (typeof value !== 'string') {
        return { valid: false, message: `${field.label}必须是文本` };
      }
      break;
    
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, message: `${field.label}必须是数字` };
      }
      break;

    case 'select':
      if (field.options && !field.options.some(opt => opt.value === value)) {
        return { valid: false, message: `${field.label}选项无效` };
      }
      break;

    case 'multiselect':
      if (!Array.isArray(value)) {
        return { valid: false, message: `${field.label}必须是数组` };
      }
      if (field.options) {
        const validValues = field.options.map(opt => opt.value);
        const hasInvalidValue = value.some(v => !validValues.includes(v));
        if (hasInvalidValue) {
          return { valid: false, message: `${field.label}包含无效选项` };
        }
      }
      break;
  }

  // 长度验证
  if (field.validation) {
    const { min, max } = field.validation;
    
    if (min !== undefined) {
      if (typeof value === 'string' && value.length < min) {
        return { valid: false, message: `${field.label}最少${min}个字符` };
      }
      if (typeof value === 'number' && value < min) {
        return { valid: false, message: `${field.label}最小值为${min}` };
      }
    }
    
    if (max !== undefined) {
      if (typeof value === 'string' && value.length > max) {
        return { valid: false, message: `${field.label}最多${max}个字符` };
      }
      if (typeof value === 'number' && value > max) {
        return { valid: false, message: `${field.label}最大值为${max}` };
      }
    }

    // 正则验证
    if (field.validation.pattern && typeof value === 'string') {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return { 
          valid: false, 
          message: field.validation.message || `${field.label}格式不正确` 
        };
      }
    }
  }

  return { valid: true };
};

// 表单数据验证
export const validateFormData = (
  fields: FormField[], 
  data: Record<string, any>
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = data[field.name];
    const validation = validateFormField(field, value);
    
    if (!validation.valid && validation.message) {
      errors[field.name] = validation.message;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

// 任务优先级验证
export const validateTaskPriority = (priority: number): boolean => {
  return Number.isInteger(priority) && priority >= 1 && priority <= 100;
};

// 业务键验证
export const validateBusinessKey = (businessKey: string): boolean => {
  // 业务键格式：字母数字下划线，长度3-50
  const regex = /^[a-zA-Z0-9_]{3,50}$/;
  return regex.test(businessKey);
};
