/**
 * 统一错误处理工具
 */

import { message } from 'antd';

// 错误类型定义
export interface AppError {
  code?: string;
  message: string;
  details?: any;
  timestamp: number;
}

// 错误码映射
const ERROR_CODE_MAP: Record<string, string> = {
  'NETWORK_ERROR': '网络连接失败，请检查网络设置',
  'TIMEOUT_ERROR': '请求超时，请重试',
  'AUTH_ERROR': '认证失败，请重新登录',
  'PERMISSION_ERROR': '权限不足，无法执行此操作',
  'VALIDATION_ERROR': '数据验证失败，请检查输入',
  'NOT_FOUND_ERROR': '请求的资源不存在',
  'SERVER_ERROR': '服务器内部错误，请稍后重试',
  'UNKNOWN_ERROR': '未知错误，请联系管理员'
};

// 创建应用错误
export const createAppError = (
  message: string, 
  code?: string, 
  details?: any
): AppError => ({
  code,
  message,
  details,
  timestamp: Date.now()
});

// 错误处理器
export class ErrorHandler {
  // 处理API错误
  static handleApiError(error: any): AppError {
    console.error('API Error:', error);

    // 网络错误
    if (!error.response) {
      return createAppError(
        ERROR_CODE_MAP.NETWORK_ERROR,
        'NETWORK_ERROR',
        error
      );
    }

    // HTTP状态码错误
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return createAppError(
          data?.message || '请求参数错误',
          'VALIDATION_ERROR',
          data
        );
      case 401:
        return createAppError(
          '认证失败，请重新登录',
          'AUTH_ERROR',
          data
        );
      case 403:
        return createAppError(
          '权限不足，无法执行此操作',
          'PERMISSION_ERROR',
          data
        );
      case 404:
        return createAppError(
          '请求的资源不存在',
          'NOT_FOUND_ERROR',
          data
        );
      case 500:
        return createAppError(
          '服务器内部错误，请稍后重试',
          'SERVER_ERROR',
          data
        );
      default:
        return createAppError(
          data?.message || `HTTP ${status} 错误`,
          'UNKNOWN_ERROR',
          data
        );
    }
  }

  // 处理业务逻辑错误
  static handleBusinessError(error: any): AppError {
    if (typeof error === 'string') {
      return createAppError(error, 'BUSINESS_ERROR');
    }

    if (error instanceof Error) {
      return createAppError(error.message, 'BUSINESS_ERROR', error);
    }

    return createAppError(
      '业务处理失败',
      'BUSINESS_ERROR',
      error
    );
  }

  // 显示错误消息
  static showError(error: AppError | string, duration: number = 4) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    message.error(errorMessage, duration);
  }

  // 显示成功消息
  static showSuccess(msg: string, duration: number = 3) {
    message.success(msg, duration);
  }

  // 显示警告消息
  static showWarning(msg: string, duration: number = 3) {
    message.warning(msg, duration);
  }

  // 显示信息消息
  static showInfo(msg: string, duration: number = 3) {
    message.info(msg, duration);
  }

  // 全局错误处理
  static handleGlobalError = (error: any) => {
    const appError = ErrorHandler.handleApiError(error);
    ErrorHandler.showError(appError);
    
    // 特殊错误处理
    if (appError.code === 'AUTH_ERROR') {
      // 认证失败时清除本地状态并跳转登录
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return appError;
  };

  // 异步操作错误包装
  static async wrapAsyncOperation<T>(
    operation: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T | null> {
    try {
      const result = await operation();
      
      if (successMessage) {
        ErrorHandler.showSuccess(successMessage);
      }
      
      return result;
    } catch (error) {
      const appError = ErrorHandler.handleApiError(error);
      ErrorHandler.showError(errorMessage || appError.message);
      return null;
    }
  }
}

// 便捷的错误处理Hook
export const useErrorHandler = () => {
  return {
    handleError: ErrorHandler.handleGlobalError,
    showError: ErrorHandler.showError,
    showSuccess: ErrorHandler.showSuccess,
    showWarning: ErrorHandler.showWarning,
    showInfo: ErrorHandler.showInfo,
    wrapAsync: ErrorHandler.wrapAsyncOperation
  };
};
