/**
 * 任务管理相关的自定义Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { taskApi } from '../services/taskApi';
import type { TaskInstance, TaskFilterParams } from '../types/task';

interface UseTaskManagementOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useTaskManagement = (options: UseTaskManagementOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  
  // 状态管理
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 获取任务列表
  const fetchTasks = useCallback(async (
    page: number = pagination.current, 
    pageSize: number = pagination.pageSize,
    filters: Partial<TaskFilterParams> = {}
  ) => {
    setLoading(true);
    try {
      const data = await taskApi.getUserTasks({
        page,
        page_size: pageSize,
        ...filters
      });

      setTasks(data.tasks || []);
      setPagination({
        current: data.page,
        pageSize: data.page_size,
        total: data.total
      });

      return data;
    } catch (error) {
      console.error('获取任务列表异常:', error);
      message.error('获取任务列表失败');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  // 任务操作方法
  const claimTask = useCallback(async (taskId: number) => {
    try {
      await taskApi.claimTask(taskId);
      message.success('任务认领成功');
      await fetchTasks();
      return true;
    } catch (error) {
      console.error('任务认领异常:', error);
      message.error('任务认领失败');
      return false;
    }
  }, [fetchTasks]);

  const completeTask = useCallback(async (taskId: number, data: {
    form_data?: Record<string, any>;
    comment?: string;
  }) => {
    try {
      await taskApi.completeTask(taskId, data);
      message.success('任务完成成功');
      await fetchTasks();
      return true;
    } catch (error) {
      console.error('任务完成异常:', error);
      message.error('任务完成失败');
      return false;
    }
  }, [fetchTasks]);

  const delegateTask = useCallback(async (taskId: number, data: {
    to_user_id: number;
    comment?: string;
  }) => {
    try {
      await taskApi.delegateTask(taskId, data);
      message.success('任务委派成功');
      await fetchTasks();
      return true;
    } catch (error) {
      console.error('任务委派异常:', error);
      message.error('任务委派失败');
      return false;
    }
  }, [fetchTasks]);

  const releaseTask = useCallback(async (taskId: number) => {
    try {
      await taskApi.releaseTask(taskId);
      message.success('任务释放成功');
      await fetchTasks();
      return true;
    } catch (error) {
      console.error('任务释放异常:', error);
      message.error('任务释放失败');
      return false;
    }
  }, [fetchTasks]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchTasks();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchTasks]);

  return {
    // 数据状态
    tasks,
    loading,
    pagination,
    
    // 操作方法
    fetchTasks,
    claimTask,
    completeTask,
    delegateTask,
    releaseTask,
    
    // 工具方法
    refreshTasks: () => fetchTasks(pagination.current, pagination.pageSize),
    resetPagination: () => setPagination(prev => ({ ...prev, current: 1 }))
  };
};
