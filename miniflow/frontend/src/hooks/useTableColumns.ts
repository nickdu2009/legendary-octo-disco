/**
 * 表格列定义的自定义Hook
 * 优化表格渲染性能和代码复用
 */

import React, { useMemo } from 'react';
import { Tag, Button, Space, Tooltip } from 'antd';
import { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatTaskStatus, formatInstanceStatus, formatPriority, formatDuration, calculateProgress, isOverdue } from '../utils/formatters';
import type { TaskInstance } from '../types/task';
import type { ProcessInstance } from '../types/instance';

// 任务表格列Hook
export const useTaskTableColumns = (
  onViewTask: (task: TaskInstance) => void,
  onClaimTask: (taskId: number) => void,
  onCompleteTask: (task: TaskInstance) => void,
  onDelegateTask: (task: TaskInstance) => void,
  onReleaseTask: (taskId: number) => void
): ColumnsType<TaskInstance> => {
  return useMemo(() => [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: { showTitle: false },
      render: (text: string, record: TaskInstance) => (
        <Tooltip title={text}>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.instance?.definition?.name} - {record.instance?.business_key}
            </div>
          </div>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusInfo = formatTaskStatus(status);
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: number) => {
        const priorityInfo = formatPriority(priority);
        return (
          <Tooltip title={`优先级: ${priority}`}>
            <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>
          </Tooltip>
        );
      }
    },
    {
      title: '到期时间',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (dueDate: string) => {
        if (!dueDate) return '-';
        const overdue = isOverdue(dueDate);
        return (
          <span style={{ color: overdue ? '#ff4d4f' : undefined }}>
            {dayjs(dueDate).format('MM-DD HH:mm')}
            {overdue && <span style={{ marginLeft: 4 }}>⚠️</span>}
          </span>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (createdAt: string) => (
        <Tooltip title={dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(createdAt).fromNow()}
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record: TaskInstance) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => onViewTask(record)}
          >
            查看
          </Button>
          
          {record.status === 'assigned' && (
            <Button 
              size="small" 
              type="primary" 
              icon={<UserOutlined />}
              onClick={() => onClaimTask(record.id)}
            >
              认领
            </Button>
          )}
          
          {(record.status === 'claimed' || record.status === 'in_progress') && (
            <>
              <Button 
                size="small" 
                type="primary" 
                icon={<CheckCircleOutlined />}
                onClick={() => onCompleteTask(record)}
              >
                完成
              </Button>
              <Button 
                size="small" 
                icon={<SwapOutlined />}
                onClick={() => onDelegateTask(record)}
              >
                委派
              </Button>
              <Button 
                size="small" 
                onClick={() => onReleaseTask(record.id)}
              >
                释放
              </Button>
            </>
          )}
        </Space>
      )
    }
  ], [onViewTask, onClaimTask, onCompleteTask, onDelegateTask, onReleaseTask]);
};

// 流程实例表格列Hook
export const useInstanceTableColumns = (
  onViewInstance: (instance: ProcessInstance) => void,
  onViewHistory: (instanceId: number) => void,
  onSuspendInstance: (instance: ProcessInstance) => void,
  onResumeInstance: (instanceId: number) => void,
  onCancelInstance: (instance: ProcessInstance) => void
): ColumnsType<ProcessInstance> => {
  return useMemo(() => [
    {
      title: '流程实例',
      key: 'instance',
      width: 250,
      render: (_, record: ProcessInstance) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.title || record.business_key}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.definition?.name} v{record.definition?.version}
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            ID: {record.id} | 业务键: {record.business_key}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusInfo = formatInstanceStatus(status);
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_, record: ProcessInstance) => {
        const progress = calculateProgress(record.completed_tasks, record.task_count);
        const status = record.status === 'completed' ? 'success' : 
                      record.status === 'failed' ? 'exception' : 'active';
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, fontSize: '12px' }}>
                {progress}%
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {record.completed_tasks}/{record.task_count}
              </div>
            </div>
            {record.failed_tasks > 0 && (
              <div style={{ fontSize: '10px', color: '#ff4d4f', marginTop: 2 }}>
                {record.failed_tasks} 失败
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: '启动时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 120,
      render: (startTime: string) => (
        <Tooltip title={dayjs(startTime).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(startTime).fromNow()}
        </Tooltip>
      )
    },
    {
      title: '执行时长',
      key: 'duration',
      width: 100,
      render: (_, record: ProcessInstance) => {
        if (record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') {
          return formatDuration(record.actual_duration);
        } else {
          const runningDuration = dayjs().diff(dayjs(record.start_time), 'seconds');
          return (
            <span style={{ color: '#1890ff' }}>
              {formatDuration(runningDuration)}
            </span>
          );
        }
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record: ProcessInstance) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => onViewInstance(record)}
          >
            详情
          </Button>
          
          <Button 
            size="small" 
            icon={<HistoryOutlined />}
            onClick={() => onViewHistory(record.id)}
          >
            历史
          </Button>

          {record.status === 'running' && (
            <Button 
              size="small" 
              icon={<PauseCircleOutlined />}
              onClick={() => onSuspendInstance(record)}
            >
              暂停
            </Button>
          )}

          {record.status === 'suspended' && (
            <Button 
              size="small" 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={() => onResumeInstance(record.id)}
            >
              恢复
            </Button>
          )}

          {['running', 'suspended'].includes(record.status) && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => onCancelInstance(record)}
            >
              取消
            </Button>
          )}
        </Space>
      )
    }
  ], [onViewInstance, onViewHistory, onSuspendInstance, onResumeInstance, onCancelInstance]);
};
