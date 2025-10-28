/**
 * 流程实例全局状态管理
 * 使用Zustand进行状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { instanceApi } from '../services/instanceApi';
import type { ProcessInstance, InstanceFilterParams, InstanceHistory } from '../types/instance';

interface InstanceState {
  // 数据状态
  instances: ProcessInstance[];
  selectedInstance: ProcessInstance | null;
  loading: boolean;
  
  // 分页状态
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 筛选状态
  filters: InstanceFilterParams;
  
  // 执行历史缓存
  executionHistoryCache: Map<number, InstanceHistory>;
  
  // 操作状态
  suspending: Set<number>;
  resuming: Set<number>;
  cancelling: Set<number>;
}

interface InstanceActions {
  // 数据操作
  fetchInstances: (page?: number, pageSize?: number) => Promise<void>;
  setSelectedInstance: (instance: ProcessInstance | null) => void;
  updateFilters: (filters: Partial<InstanceFilterParams>) => void;
  resetFilters: () => void;
  
  // 实例操作
  suspendInstance: (instanceId: number, reason: string) => Promise<boolean>;
  resumeInstance: (instanceId: number) => Promise<boolean>;
  cancelInstance: (instanceId: number, reason: string) => Promise<boolean>;
  
  // 历史数据
  fetchInstanceHistory: (instanceId: number) => Promise<InstanceHistory | null>;
  clearHistoryCache: () => void;
  
  // 工具方法
  refreshInstances: () => Promise<void>;
  getInstanceById: (instanceId: number) => ProcessInstance | undefined;
  getInstancesByStatus: (status: string) => ProcessInstance[];
  getRunningInstances: () => ProcessInstance[];
}

type InstanceStore = InstanceState & InstanceActions;

const initialFilters: InstanceFilterParams = {
  status: undefined,
  definition_id: undefined,
  starter_id: undefined,
  search: undefined
};

export const useInstanceStore = create<InstanceStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      instances: [],
      selectedInstance: null,
      loading: false,
      pagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      filters: initialFilters,
      executionHistoryCache: new Map(),
      suspending: new Set(),
      resuming: new Set(),
      cancelling: new Set(),

      // 数据操作
      fetchInstances: async (page?: number, pageSize?: number) => {
        const state = get();
        const currentPage = page || state.pagination.current;
        const currentPageSize = pageSize || state.pagination.pageSize;
        
        set({ loading: true });
        
        try {
          const data = await instanceApi.getInstances({
            page: currentPage,
            page_size: currentPageSize,
            ...state.filters
          });

          set({
            instances: data.instances || [],
            pagination: {
              current: data.page,
              pageSize: data.page_size,
              total: data.total
            },
            loading: false
          });
        } catch (error) {
          console.error('获取流程实例列表失败:', error);
          set({ loading: false });
          throw error;
        }
      },

      setSelectedInstance: (instance) => set({ selectedInstance: instance }),

      updateFilters: (newFilters) => {
        const currentFilters = get().filters;
        const updatedFilters = { ...currentFilters, ...newFilters };
        set({ 
          filters: updatedFilters,
          pagination: { ...get().pagination, current: 1 }
        });
        
        // 自动重新获取数据
        get().fetchInstances(1);
      },

      resetFilters: () => {
        set({ 
          filters: initialFilters,
          pagination: { ...get().pagination, current: 1 }
        });
        get().fetchInstances(1);
      },

      // 实例操作
      suspendInstance: async (instanceId, reason) => {
        const state = get();
        set({ suspending: new Set([...state.suspending, instanceId]) });
        
        try {
          await instanceApi.suspendInstance(instanceId, { reason });
          await get().refreshInstances();
          return true;
        } catch (error) {
          console.error('暂停流程实例失败:', error);
          return false;
        } finally {
          const newSuspending = new Set(get().suspending);
          newSuspending.delete(instanceId);
          set({ suspending: newSuspending });
        }
      },

      resumeInstance: async (instanceId) => {
        const state = get();
        set({ resuming: new Set([...state.resuming, instanceId]) });
        
        try {
          await instanceApi.resumeInstance(instanceId);
          await get().refreshInstances();
          return true;
        } catch (error) {
          console.error('恢复流程实例失败:', error);
          return false;
        } finally {
          const newResuming = new Set(get().resuming);
          newResuming.delete(instanceId);
          set({ resuming: newResuming });
        }
      },

      cancelInstance: async (instanceId, reason) => {
        const state = get();
        set({ cancelling: new Set([...state.cancelling, instanceId]) });
        
        try {
          await instanceApi.cancelInstance(instanceId, { reason });
          await get().refreshInstances();
          return true;
        } catch (error) {
          console.error('取消流程实例失败:', error);
          return false;
        } finally {
          const newCancelling = new Set(get().cancelling);
          newCancelling.delete(instanceId);
          set({ cancelling: newCancelling });
        }
      },

      // 历史数据
      fetchInstanceHistory: async (instanceId) => {
        const cache = get().executionHistoryCache;
        
        // 检查缓存
        if (cache.has(instanceId)) {
          return cache.get(instanceId)!;
        }
        
        try {
          const history = await instanceApi.getInstanceHistory(instanceId);
          
          // 更新缓存
          const newCache = new Map(cache);
          newCache.set(instanceId, history);
          set({ executionHistoryCache: newCache });
          
          return history;
        } catch (error) {
          console.error('获取执行历史失败:', error);
          return null;
        }
      },

      clearHistoryCache: () => {
        set({ executionHistoryCache: new Map() });
      },

      // 工具方法
      refreshInstances: async () => {
        const state = get();
        await get().fetchInstances(state.pagination.current, state.pagination.pageSize);
      },

      getInstanceById: (instanceId) => {
        return get().instances.find(instance => instance.id === instanceId);
      },

      getInstancesByStatus: (status) => {
        return get().instances.filter(instance => instance.status === status);
      },

      getRunningInstances: () => {
        return get().instances.filter(instance => instance.status === 'running');
      }
    }),
    {
      name: 'instance-store',
      // 只持久化非敏感数据
      partialize: (state) => ({
        filters: state.filters,
        pagination: {
          ...state.pagination,
          current: 1
        }
      })
    }
  )
);
