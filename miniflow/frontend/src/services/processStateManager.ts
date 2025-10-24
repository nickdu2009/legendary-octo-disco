/**
 * 流程状态管理服务
 * 处理流程生命周期状态变更和权限控制
 */

import React from 'react';
import { message } from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  CopyOutlined, 
  ExportOutlined, 
  DeleteOutlined 
} from '@ant-design/icons';
import { processApi } from './processApi';
import type { ProcessDefinition } from '../types/process';

export interface ProcessStateTransition {
  from: string;
  to: string;
  action: string;
  requiresConfirmation: boolean;
  requiresPermission: string[];
  description: string;
}

export interface ProcessPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canCopy: boolean;
  canExport: boolean;
}

export class ProcessStateManager {
  // 流程状态转换规则
  private static readonly stateTransitions: ProcessStateTransition[] = [
    {
      from: 'draft',
      to: 'published',
      action: 'publish',
      requiresConfirmation: true,
      requiresPermission: ['process:publish'],
      description: '发布流程将使其对所有用户可见并可执行'
    },
    {
      from: 'published',
      to: 'archived',
      action: 'archive',
      requiresConfirmation: true,
      requiresPermission: ['process:archive'],
      description: '归档流程将停止其执行，但保留历史数据'
    },
    {
      from: 'published',
      to: 'draft',
      action: 'unpublish',
      requiresConfirmation: true,
      requiresPermission: ['process:unpublish'],
      description: '取消发布将停止流程执行并转为草稿状态'
    },
    {
      from: 'archived',
      to: 'published',
      action: 'restore',
      requiresConfirmation: true,
      requiresPermission: ['process:restore'],
      description: '恢复流程将重新启用其执行功能'
    },
    {
      from: 'archived',
      to: 'draft',
      action: 'unarchive',
      requiresConfirmation: false,
      requiresPermission: ['process:edit'],
      description: '取消归档并转为草稿状态'
    }
  ];

  /**
   * 获取流程权限
   */
  static getProcessPermissions(
    process: ProcessDefinition,
    currentUser: { id: number; role: string }
  ): ProcessPermissions {
    const isOwner = process.created_by === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    const isManager = currentUser.role === 'manager';

    return {
      canView: true, // 所有人都可以查看
      canEdit: isOwner || isAdmin || (isManager && process.status === 'draft'),
      canDelete: isOwner || isAdmin,
      canPublish: isAdmin || (isManager && isOwner),
      canArchive: isAdmin || isManager,
      canCopy: true, // 所有人都可以复制
      canExport: true, // 所有人都可以导出
    };
  }

  /**
   * 检查状态转换是否允许
   */
  static canTransition(
    fromStatus: string,
    toStatus: string,
    userPermissions: string[]
  ): boolean {
    const transition = this.stateTransitions.find(
      t => t.from === fromStatus && t.to === toStatus
    );

    if (!transition) {
      return false;
    }

    // 检查权限
    return transition.requiresPermission.every(permission =>
      userPermissions.includes(permission)
    );
  }

  /**
   * 获取可用的状态转换
   */
  static getAvailableTransitions(
    currentStatus: string,
    userPermissions: string[]
  ): ProcessStateTransition[] {
    return this.stateTransitions.filter(
      transition => 
        transition.from === currentStatus &&
        this.canTransition(currentStatus, transition.to, userPermissions)
    );
  }

  /**
   * 执行状态转换
   */
  static async executeStateTransition(
    processId: number,
    fromStatus: string,
    toStatus: string,
    userPermissions: string[]
  ): Promise<ProcessDefinition> {
    const transition = this.stateTransitions.find(
      t => t.from === fromStatus && t.to === toStatus
    );

    if (!transition) {
      throw new Error(`不支持的状态转换: ${fromStatus} → ${toStatus}`);
    }

    if (!this.canTransition(fromStatus, toStatus, userPermissions)) {
      throw new Error('权限不足，无法执行此操作');
    }

    try {
      let result: ProcessDefinition;

      switch (transition.action) {
        case 'publish':
          result = await this.publishProcess(processId);
          break;
        case 'archive':
          result = await this.archiveProcess(processId);
          break;
        case 'unpublish':
          result = await this.unpublishProcess(processId);
          break;
        case 'restore':
          result = await this.restoreProcess(processId);
          break;
        case 'unarchive':
          result = await this.unarchiveProcess(processId);
          break;
        default:
          throw new Error(`不支持的操作: ${transition.action}`);
      }

      message.success(`流程状态已更新为: ${this.getStatusDisplayName(toStatus)}`);
      return result;
    } catch (error: any) {
      message.error(`状态转换失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 发布流程
   */
  private static async publishProcess(processId: number): Promise<ProcessDefinition> {
    // 首先验证流程定义
    const process = await processApi.getProcess(processId);
    
    // TODO: 调用后端发布API
    // 暂时模拟发布操作
    const updatedProcess = { ...process, status: 'published' as const };
    message.success('流程发布成功');
    return updatedProcess;
  }

  /**
   * 归档流程
   */
  private static async archiveProcess(processId: number): Promise<ProcessDefinition> {
    const process = await processApi.getProcess(processId);
    const updatedProcess = { ...process, status: 'archived' as const };
    message.success('流程归档成功');
    return updatedProcess;
  }

  /**
   * 取消发布
   */
  private static async unpublishProcess(processId: number): Promise<ProcessDefinition> {
    const process = await processApi.getProcess(processId);
    const updatedProcess = { ...process, status: 'draft' as const };
    message.success('流程已取消发布');
    return updatedProcess;
  }

  /**
   * 恢复流程
   */
  private static async restoreProcess(processId: number): Promise<ProcessDefinition> {
    const process = await processApi.getProcess(processId);
    const updatedProcess = { ...process, status: 'published' as const };
    message.success('流程恢复成功');
    return updatedProcess;
  }

  /**
   * 取消归档
   */
  private static async unarchiveProcess(processId: number): Promise<ProcessDefinition> {
    const process = await processApi.getProcess(processId);
    const updatedProcess = { ...process, status: 'draft' as const };
    message.success('流程已取消归档');
    return updatedProcess;
  }

  /**
   * 获取状态显示名称
   */
  static getStatusDisplayName(status: string): string {
    const statusNames = {
      draft: '草稿',
      published: '已发布',
      archived: '已归档',
    };
    return statusNames[status as keyof typeof statusNames] || status;
  }

  /**
   * 获取状态描述
   */
  static getStatusDescription(status: string): string {
    const descriptions = {
      draft: '流程处于草稿状态，可以自由编辑，但不能执行',
      published: '流程已发布，可以创建实例并执行',
      archived: '流程已归档，无法执行新实例，但保留历史数据',
    };
    return descriptions[status as keyof typeof descriptions] || '未知状态';
  }

  /**
   * 获取状态颜色
   */
  static getStatusColor(status: string): string {
    const colors = {
      draft: '#fa8c16',
      published: '#52c41a',
      archived: '#8c8c8c',
    };
    return colors[status as keyof typeof colors] || '#d9d9d9';
  }

  /**
   * 批量状态转换
   */
  static async batchStateTransition(
    processIds: number[],
    targetStatus: string,
    userPermissions: string[]
  ): Promise<{
    successful: ProcessDefinition[];
    failed: Array<{ id: number; error: string }>;
  }> {
    const results = {
      successful: [] as ProcessDefinition[],
      failed: [] as Array<{ id: number; error: string }>
    };

    for (const processId of processIds) {
      try {
        const process = await processApi.getProcess(processId);
        
        if (this.canTransition(process.status, targetStatus, userPermissions)) {
          const updatedProcess = await this.executeStateTransition(
            processId,
            process.status,
            targetStatus,
            userPermissions
          );
          results.successful.push(updatedProcess);
        } else {
          results.failed.push({
            id: processId,
            error: '权限不足或状态转换不允许'
          });
        }
      } catch (error: any) {
        results.failed.push({
          id: processId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 获取流程操作菜单配置
   */
  static getProcessActionMenuConfig(
    process: ProcessDefinition,
    permissions: ProcessPermissions,
    callbacks: {
      onView: () => void;
      onEdit: () => void;
      onCopy: () => void;
      onExport: (format: string) => void;
      onStateChange: (newStatus: string) => void;
      onDelete: () => void;
    }
  ) {
    const menuItems = [];

    // 基础操作
    menuItems.push({
      key: 'view',
      iconType: 'EyeOutlined',
      label: '查看详情',
      onClick: callbacks.onView,
    });

    if (permissions.canEdit) {
      menuItems.push({
        key: 'edit',
        iconType: 'EditOutlined',
        label: '编辑流程',
        onClick: callbacks.onEdit,
      });
    }

    if (permissions.canCopy) {
      menuItems.push({
        key: 'copy',
        iconType: 'CopyOutlined',
        label: '复制流程',
        onClick: callbacks.onCopy,
      });
    }

    // 导出操作
    if (permissions.canExport) {
      menuItems.push({
        key: 'export',
        iconType: 'ExportOutlined',
        label: '导出',
        children: [
          {
            key: 'export-json',
            label: 'JSON格式',
            onClick: () => callbacks.onExport('json'),
          },
          {
            key: 'export-xml',
            label: 'XML格式',
            onClick: () => callbacks.onExport('xml'),
          },
          {
            key: 'export-bpmn',
            label: 'BPMN格式',
            onClick: () => callbacks.onExport('bpmn'),
          },
        ],
      });
    }

    // 状态操作
    const availableTransitions = this.getAvailableTransitions(
      process.status,
      permissions.canPublish ? ['process:publish', 'process:archive', 'process:restore'] : []
    );

    if (availableTransitions.length > 0) {
      menuItems.push({ type: 'divider' });
      
      availableTransitions.forEach(transition => {
        menuItems.push({
          key: `state-${transition.to}`,
          label: `${transition.action === 'publish' ? '发布' : 
                   transition.action === 'archive' ? '归档' : 
                   transition.action === 'restore' ? '恢复' : '更新'}流程`,
          onClick: () => callbacks.onStateChange(transition.to),
        });
      });
    }

    // 删除操作
    if (permissions.canDelete) {
      menuItems.push(
        { type: 'divider' },
        {
          key: 'delete',
          iconType: 'DeleteOutlined',
          label: '删除流程',
          danger: true,
          onClick: callbacks.onDelete,
        }
      );
    }

    return menuItems;
  }
}
