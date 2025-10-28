/**
 * 流程实例管理相关的自定义Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { instanceApi } from '../services/instanceApi';
import type { ProcessInstance, InstanceFilterParams, InstanceHistory } from '../types/instance';

interface UseInstanceManagementOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useInstanceManagement = (options: UseInstanceManagementOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  
  // 状态管理
  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 获取实例列表
  const fetchInstances = useCallback(async (
    page: number = pagination.current,
    pageSize: number = pagination.pageSize,
    filters: Partial<InstanceFilterParams> = {}
  ) => {
    setLoading(true);
    try {
      const data = await instanceApi.getInstances({
        page,
        page_size: pageSize,
        ...filters
      });

      setInstances(data.instances || []);
      setPagination({
        current: data.page,
        pageSize: data.page_size,
        total: data.total
      });

      return data;
    } catch (error) {
      console.error('获取流程实例列表异常:', error);
      message.error('获取流程实例列表失败');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  // 实例操作方法
  const suspendInstance = useCallback(async (instanceId: number, reason: string) => {
    try {
      await instanceApi.suspendInstance(instanceId, { reason });
      message.success('流程实例暂停成功');
      await fetchInstances();
      return true;
    } catch (error) {
      console.error('暂停流程实例异常:', error);
      message.error('暂停流程实例失败');
      return false;
    }
  }, [fetchInstances]);

  const resumeInstance = useCallback(async (instanceId: number) => {
    try {
      await instanceApi.resumeInstance(instanceId);
      message.success('流程实例恢复成功');
      await fetchInstances();
      return true;
    } catch (error) {
      console.error('恢复流程实例异常:', error);
      message.error('恢复流程实例失败');
      return false;
    }
  }, [fetchInstances]);

  const cancelInstance = useCallback(async (instanceId: number, reason: string) => {
    try {
      await instanceApi.cancelInstance(instanceId, { reason });
      message.success('流程实例取消成功');
      await fetchInstances();
      return true;
    } catch (error) {
      console.error('取消流程实例异常:', error);
      message.error('取消流程实例失败');
      return false;
    }
  }, [fetchInstances]);

  const getInstanceHistory = useCallback(async (instanceId: number): Promise<InstanceHistory | null> => {
    try {
      const history = await instanceApi.getInstanceHistory(instanceId);
      return history;
    } catch (error) {
      console.error('获取执行历史异常:', error);
      message.error('获取执行历史失败');
      return null;
    }
  }, []);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchInstances();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchInstances]);

  return {
    // 数据状态
    instances,
    loading,
    pagination,
    
    // 操作方法
    fetchInstances,
    suspendInstance,
    resumeInstance,
    cancelInstance,
    getInstanceHistory,
    
    // 工具方法
    refreshInstances: () => fetchInstances(pagination.current, pagination.pageSize),
    resetPagination: () => setPagination(prev => ({ ...prev, current: 1 }))
  };
};
