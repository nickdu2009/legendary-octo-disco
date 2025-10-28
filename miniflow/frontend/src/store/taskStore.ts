/**
 * 任务管理全局状态管理
 * 使用Zustand进行状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { taskApi } from '../services/taskApi';
import type { TaskInstance, TaskFilterParams } from '../types/task';

interface TaskState {
  // 数据状态
  tasks: TaskInstance[];
  selectedTask: TaskInstance | null;
  loading: boolean;
  
  // 分页状态
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 筛选状态
  filters: TaskFilterParams;
  
  // 操作状态
  claiming: Set<number>;
  completing: Set<number>;
  delegating: Set<number>;
  releasing: Set<number>;
}

interface TaskActions {
  // 数据操作
  fetchTasks: (page?: number, pageSize?: number) => Promise<void>;
  setSelectedTask: (task: TaskInstance | null) => void;
  updateFilters: (filters: Partial<TaskFilterParams>) => void;
  resetFilters: () => void;
  
  // 任务操作
  claimTask: (taskId: number) => Promise<boolean>;
  completeTask: (taskId: number, data: { form_data?: Record<string, any>; comment?: string }) => Promise<boolean>;
  delegateTask: (taskId: number, data: { to_user_id: number; comment?: string }) => Promise<boolean>;
  releaseTask: (taskId: number) => Promise<boolean>;
  
  // 工具方法
  refreshTasks: () => Promise<void>;
  getTaskById: (taskId: number) => TaskInstance | undefined;
  getTasksByStatus: (status: string) => TaskInstance[];
}

type TaskStore = TaskState & TaskActions;

const initialFilters: TaskFilterParams = {
  status: undefined,
  priority: undefined,
  search: undefined,
  date_range: undefined
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      tasks: [],
      selectedTask: null,
      loading: false,
      pagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      filters: initialFilters,
      claiming: new Set(),
      completing: new Set(),
      delegating: new Set(),
      releasing: new Set(),

      // 数据操作
      fetchTasks: async (page?: number, pageSize?: number) => {
        const state = get();
        const currentPage = page || state.pagination.current;
        const currentPageSize = pageSize || state.pagination.pageSize;
        
        set({ loading: true });
        
        try {
          const data = await taskApi.getUserTasks({
            page: currentPage,
            page_size: currentPageSize,
            ...state.filters
          });

          set({
            tasks: data.tasks || [],
            pagination: {
              current: data.page,
              pageSize: data.page_size,
              total: data.total
            },
            loading: false
          });
        } catch (error) {
          console.error('获取任务列表失败:', error);
          set({ loading: false });
          throw error;
        }
      },

      setSelectedTask: (task) => set({ selectedTask: task }),

      updateFilters: (newFilters) => {
        const currentFilters = get().filters;
        const updatedFilters = { ...currentFilters, ...newFilters };
        set({ 
          filters: updatedFilters,
          pagination: { ...get().pagination, current: 1 } // 重置到第一页
        });
        
        // 自动重新获取数据
        get().fetchTasks(1);
      },

      resetFilters: () => {
        set({ 
          filters: initialFilters,
          pagination: { ...get().pagination, current: 1 }
        });
        get().fetchTasks(1);
      },

      // 任务操作
      claimTask: async (taskId) => {
        const state = get();
        set({ claiming: new Set([...state.claiming, taskId]) });
        
        try {
          await taskApi.claimTask(taskId);
          await get().refreshTasks();
          return true;
        } catch (error) {
          console.error('任务认领失败:', error);
          return false;
        } finally {
          const newClaiming = new Set(get().claiming);
          newClaiming.delete(taskId);
          set({ claiming: newClaiming });
        }
      },

      completeTask: async (taskId, data) => {
        const state = get();
        set({ completing: new Set([...state.completing, taskId]) });
        
        try {
          await taskApi.completeTask(taskId, data);
          await get().refreshTasks();
          return true;
        } catch (error) {
          console.error('任务完成失败:', error);
          return false;
        } finally {
          const newCompleting = new Set(get().completing);
          newCompleting.delete(taskId);
          set({ completing: newCompleting });
        }
      },

      delegateTask: async (taskId, data) => {
        const state = get();
        set({ delegating: new Set([...state.delegating, taskId]) });
        
        try {
          await taskApi.delegateTask(taskId, data);
          await get().refreshTasks();
          return true;
        } catch (error) {
          console.error('任务委派失败:', error);
          return false;
        } finally {
          const newDelegating = new Set(get().delegating);
          newDelegating.delete(taskId);
          set({ delegating: newDelegating });
        }
      },

      releaseTask: async (taskId) => {
        const state = get();
        set({ releasing: new Set([...state.releasing, taskId]) });
        
        try {
          await taskApi.releaseTask(taskId);
          await get().refreshTasks();
          return true;
        } catch (error) {
          console.error('任务释放失败:', error);
          return false;
        } finally {
          const newReleasing = new Set(get().releasing);
          newReleasing.delete(taskId);
          set({ releasing: newReleasing });
        }
      },

      // 工具方法
      refreshTasks: async () => {
        const state = get();
        await get().fetchTasks(state.pagination.current, state.pagination.pageSize);
      },

      getTaskById: (taskId) => {
        return get().tasks.find(task => task.id === taskId);
      },

      getTasksByStatus: (status) => {
        return get().tasks.filter(task => task.status === status);
      }
    }),
    {
      name: 'task-store',
      // 只持久化非敏感数据
      partialize: (state) => ({
        filters: state.filters,
        pagination: {
          ...state.pagination,
          current: 1 // 重启时重置到第一页
        }
      })
    }
  )
);
