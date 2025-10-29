import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Button, 
  Space, 
  Tag, 
  message,
  Spin,
  Divider
} from 'antd';
import { taskApi } from '../../services/taskApi';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  CheckCircleOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { TaskInstance } from '../../types/task';
import DynamicTaskForm from '../../components/tasks/DynamicTaskForm';

// 任务状态映射
const taskStatusMap = {
  created: { text: '已创建', color: 'default' },
  assigned: { text: '已分配', color: 'blue' },
  claimed: { text: '已认领', color: 'orange' },
  in_progress: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  failed: { text: '失败', color: 'error' },
  skipped: { text: '已跳过', color: 'default' },
  escalated: { text: '已升级', color: 'warning' }
};

// 任务类型映射
const taskTypeMap = {
  userTask: { text: '用户任务', color: 'blue' },
  serviceTask: { text: '服务任务', color: 'green' },
  scriptTask: { text: '脚本任务', color: 'purple' },
  mailTask: { text: '邮件任务', color: 'orange' },
  manualTask: { text: '手工任务', color: 'cyan' }
};

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // 获取任务详情
  const fetchTaskDetail = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const taskData = await taskApi.getTask(parseInt(id));
      setTask(taskData);
    } catch (error) {
      console.error('获取任务详情异常:', error);
      message.error('获取任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理任务完成
  const handleCompleteTask = async (values: Record<string, unknown>) => {
    if (!task) return;

    try {
      setCompleting(true);
      await taskApi.completeTask(task.id, {
        form_data: values.formData || {},
        comment: (values.comment as string) || ''
      });
      
      message.success('任务完成成功');
      navigate('/tasks/workspace');
    } catch (error) {
      console.error('任务完成异常:', error);
      message.error('任务完成失败');
    } finally {
      setCompleting(false);
    }
  };

  // 处理任务认领
  const handleClaimTask = async () => {
    if (!task) return;

    try {
      await taskApi.claimTask(task.id);
      message.success('任务认领成功');
      fetchTaskDetail(); // 重新获取任务详情以更新状态
    } catch (error) {
      console.error('任务认领异常:', error);
      message.error('任务认领失败');
    }
  };

  useEffect(() => {
    fetchTaskDetail();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
          <div style={{ marginTop: '16px', fontSize: '16px' }}>未找到任务</div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '16px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/tasks/workspace')}
        >
          返回任务列表
        </Button>
      </Space>

      <Card 
        title={
          <Space>
            <UserOutlined />
            任务详情: {task.name}
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="任务ID">{task.id}</Descriptions.Item>
          <Descriptions.Item label="任务名称">{task.name}</Descriptions.Item>
          <Descriptions.Item label="任务状态">
            <Tag color={taskStatusMap[task.status as keyof typeof taskStatusMap]?.color}>
              {taskStatusMap[task.status as keyof typeof taskStatusMap]?.text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="任务类型">
            <Tag color={taskTypeMap[task.task_type as keyof typeof taskTypeMap]?.color}>
              {taskTypeMap[task.task_type as keyof typeof taskTypeMap]?.text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="优先级">{task.priority}</Descriptions.Item>
          <Descriptions.Item label="流程实例">
            {task.instance?.title || task.instance?.business_key}
          </Descriptions.Item>
          <Descriptions.Item label="流程定义">
            {task.instance?.definition?.name}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(task.created_at).toLocaleString()}
          </Descriptions.Item>
          {task.due_date && (
            <Descriptions.Item label="到期时间">
              {new Date(task.due_date).toLocaleString()}
            </Descriptions.Item>
          )}
          {task.assignee && (
            <Descriptions.Item label="负责人">
              {task.assignee.display_name || task.assignee.username}
            </Descriptions.Item>
          )}
          {task.claimed_user && (
            <Descriptions.Item label="认领人">
              {task.claimed_user.display_name || task.claimed_user.username}
            </Descriptions.Item>
          )}
        </Descriptions>

        {task.comment && (
          <>
            <Divider>处理意见</Divider>
            <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
              {task.comment}
            </div>
          </>
        )}

        {task.error_message && (
          <>
            <Divider>错误信息</Divider>
            <div style={{ padding: '8px', background: '#fff2f0', borderRadius: '4px', color: '#ff4d4f' }}>
              {task.error_message}
            </div>
          </>
        )}

        <Divider>任务处理</Divider>
        <div style={{ marginTop: '16px' }}>
          {(task.status === 'assigned') && (
            <Button 
              type="primary" 
              icon={<UserOutlined />}
              onClick={handleClaimTask}
              style={{ marginRight: '8px' }}
            >
              认领任务
            </Button>
          )}

          {(task.status === 'claimed' || task.status === 'in_progress') && (
            <DynamicTaskForm 
              onSubmit={handleCompleteTask}
              completing={completing}
            />
          )}

          {task.status === 'completed' && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
              <div style={{ marginTop: '16px', fontSize: '16px', color: '#52c41a' }}>
                任务已完成
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TaskDetail;