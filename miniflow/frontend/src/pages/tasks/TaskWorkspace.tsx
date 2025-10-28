import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Input, 
  Select, 
  DatePicker, 
  Modal, 
  Form, 
  message,
  Empty,
  Tooltip,
  Badge,
  Divider,
  Descriptions,
  Timeline
} from 'antd';
import { taskApi } from '../../services/taskApi';
import type { 
  TaskInstance, 
  TaskListResponse, 
  TaskFilterParams,
  CompleteTaskRequest,
  DelegateTaskRequest 
} from '../../types/task';
import {
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  EyeOutlined,
  EditOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// 注意：类型定义已移动到 types/task.ts

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

// 优先级映射
const priorityMap = {
  low: { text: '低', color: 'default', range: [1, 33] },
  medium: { text: '中', color: 'blue', range: [34, 66] },
  high: { text: '高', color: 'orange', range: [67, 89] },
  urgent: { text: '紧急', color: 'red', range: [90, 100] }
};

const TaskWorkspace: React.FC = () => {
  // 状态管理
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskInstance | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  
  // 筛选状态
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  });

  // Modal状态
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [taskDetailModalVisible, setTaskDetailModalVisible] = useState(false);

  // 表单实例
  const [completeForm] = Form.useForm();
  const [delegateForm] = Form.useForm();

  // 获取任务列表
  const fetchTasks = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const data = await taskApi.getUserTasks({
        page,
        page_size: pageSize,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority })
      });

      setTasks(data.tasks || []);
      setPagination({
        current: data.page,
        pageSize: data.page_size,
        total: data.total
      });
    } catch (error) {
      console.error('获取任务列表异常:', error);
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取任务列表
  useEffect(() => {
    fetchTasks();
  }, [filters]);

  // 获取优先级信息
  const getPriorityInfo = (priority: number) => {
    for (const [key, info] of Object.entries(priorityMap)) {
      if (priority >= info.range[0] && priority <= info.range[1]) {
        return { key, ...info };
      }
    }
    return { key: 'medium', text: '中', color: 'blue' };
  };

  // 任务操作方法
  const handleClaimTask = async (taskId: number) => {
    try {
      await taskApi.claimTask(taskId);
      message.success('任务认领成功');
      fetchTasks(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('任务认领异常:', error);
      message.error('任务认领失败');
    }
  };

  const handleCompleteTask = async (values: any) => {
    if (!selectedTask) return;

    try {
      await taskApi.completeTask(selectedTask.id, {
        form_data: values.formData || {},
        comment: values.comment || ''
      });
      
      message.success('任务完成成功');
      setCompleteModalVisible(false);
      completeForm.resetFields();
      fetchTasks(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('任务完成异常:', error);
      message.error('任务完成失败');
    }
  };

  const handleDelegateTask = async (values: any) => {
    if (!selectedTask) return;

    try {
      await taskApi.delegateTask(selectedTask.id, {
        to_user_id: values.toUserId,
        comment: values.comment || ''
      });
      
      message.success('任务委派成功');
      setDelegateModalVisible(false);
      delegateForm.resetFields();
      fetchTasks(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('任务委派异常:', error);
      message.error('任务委派失败');
    }
  };

  const handleReleaseTask = async (taskId: number) => {
    try {
      await taskApi.releaseTask(taskId);
      message.success('任务释放成功');
      fetchTasks(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('任务释放异常:', error);
      message.error('任务释放失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<TaskInstance> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: TaskInstance) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.instance?.definition?.name} - {record.instance?.business_key}
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
        const statusInfo = taskStatusMap[status as keyof typeof taskStatusMap] || 
          { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '类型',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 100,
      render: (type: string) => {
        const typeInfo = taskTypeMap[type as keyof typeof taskTypeMap] || 
          { text: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      }
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: number) => {
        const priorityInfo = getPriorityInfo(priority);
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
        const isOverdue = dayjs(dueDate).isBefore(dayjs());
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dayjs(dueDate).format('MM-DD HH:mm')}
            {isOverdue && <ExclamationCircleOutlined style={{ marginLeft: 4, color: '#ff4d4f' }} />}
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
            onClick={() => {
              setSelectedTask(record);
              setTaskDetailModalVisible(true);
            }}
          >
            查看
          </Button>
          
          {record.status === 'assigned' && (
            <Button 
              size="small" 
              type="primary" 
              icon={<UserOutlined />}
              onClick={() => handleClaimTask(record.id)}
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
                onClick={() => {
                  setSelectedTask(record);
                  setCompleteModalVisible(true);
                }}
              >
                完成
              </Button>
              <Button 
                size="small" 
                icon={<SwapOutlined />}
                onClick={() => {
                  setSelectedTask(record);
                  setDelegateModalVisible(true);
                }}
              >
                委派
              </Button>
              <Button 
                size="small" 
                onClick={() => handleReleaseTask(record.id)}
              >
                释放
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <UserOutlined />
                我的任务工作台
                <Badge count={tasks.length} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
            extra={
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={() => fetchTasks(pagination.current, pagination.pageSize)}
                >
                  刷新
                </Button>
              </Space>
            }
          >
            {/* 筛选器 */}
            <div style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Search
                    placeholder="搜索任务名称"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onSearch={(value) => setFilters({ ...filters, search: value })}
                    allowClear
                  />
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="任务状态"
                    value={filters.status}
                    onChange={(value) => setFilters({ ...filters, status: value })}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="assigned">已分配</Option>
                    <Option value="claimed">已认领</Option>
                    <Option value="in_progress">进行中</Option>
                    <Option value="completed">已完成</Option>
                    <Option value="failed">失败</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="优先级"
                    value={filters.priority}
                    onChange={(value) => setFilters({ ...filters, priority: value })}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="urgent">紧急</Option>
                    <Option value="high">高</Option>
                    <Option value="medium">中</Option>
                    <Option value="low">低</Option>
                  </Select>
                </Col>
                <Col span={6}>
                  <RangePicker
                    placeholder={['开始日期', '结束日期']}
                    value={filters.dateRange}
                    onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </div>

            {/* 任务统计卡片 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                    {tasks.filter(t => t.status === 'assigned').length}
                  </div>
                  <div style={{ color: '#666' }}>待认领</div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                    {tasks.filter(t => ['claimed', 'in_progress'].includes(t.status)).length}
                  </div>
                  <div style={{ color: '#666' }}>进行中</div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                    {tasks.filter(t => t.status === 'completed').length}
                  </div>
                  <div style={{ color: '#666' }}>已完成</div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                    {tasks.filter(t => dayjs(t.due_date).isBefore(dayjs()) && !['completed', 'skipped'].includes(t.status)).length}
                  </div>
                  <div style={{ color: '#666' }}>已超期</div>
                </Card>
              </Col>
            </Row>

            {/* 任务列表 */}
            <Table
              columns={columns}
              dataSource={tasks}
              rowKey="id"
              loading={loading}
              pagination={{
                ...pagination,
                onChange: (page, pageSize) => {
                  fetchTasks(page, pageSize);
                },
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条任务`
              }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 任务详情Modal */}
      <Modal
        title="任务详情"
        open={taskDetailModalVisible}
        onCancel={() => setTaskDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedTask && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="任务名称">{selectedTask.name}</Descriptions.Item>
              <Descriptions.Item label="任务状态">
                <Tag color={taskStatusMap[selectedTask.status as keyof typeof taskStatusMap]?.color}>
                  {taskStatusMap[selectedTask.status as keyof typeof taskStatusMap]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">
                <Tag color={taskTypeMap[selectedTask.task_type as keyof typeof taskTypeMap]?.color}>
                  {taskTypeMap[selectedTask.task_type as keyof typeof taskTypeMap]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={getPriorityInfo(selectedTask.priority).color}>
                  {getPriorityInfo(selectedTask.priority).text} ({selectedTask.priority})
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="流程实例">
                {selectedTask.instance?.title || selectedTask.instance?.business_key}
              </Descriptions.Item>
              <Descriptions.Item label="流程定义">
                {selectedTask.instance?.definition?.name}
              </Descriptions.Item>
              <Descriptions.Item label="负责人">
                {selectedTask.assignee?.display_name || selectedTask.assignee?.username || '未分配'}
              </Descriptions.Item>
              <Descriptions.Item label="认领人">
                {selectedTask.claimed_user?.display_name || selectedTask.claimed_user?.username || '未认领'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(selectedTask.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="到期时间">
                {selectedTask.due_date ? dayjs(selectedTask.due_date).format('YYYY-MM-DD HH:mm:ss') : '无'}
              </Descriptions.Item>
            </Descriptions>

            {selectedTask.comment && (
              <>
                <Divider>处理意见</Divider>
                <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  {selectedTask.comment}
                </div>
              </>
            )}

            {selectedTask.error_message && (
              <>
                <Divider>错误信息</Divider>
                <div style={{ padding: '8px', background: '#fff2f0', borderRadius: '4px', color: '#ff4d4f' }}>
                  {selectedTask.error_message}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 完成任务Modal */}
      <Modal
        title="完成任务"
        open={completeModalVisible}
        onCancel={() => setCompleteModalVisible(false)}
        onOk={() => completeForm.submit()}
        width={600}
      >
        <Form
          form={completeForm}
          layout="vertical"
          onFinish={handleCompleteTask}
        >
          <Form.Item
            name="comment"
            label="处理意见"
            rules={[{ required: true, message: '请填写处理意见' }]}
          >
            <TextArea rows={4} placeholder="请填写任务处理意见..." />
          </Form.Item>
          
          <Form.Item
            name="formData"
            label="表单数据"
          >
            <TextArea 
              rows={6} 
              placeholder="请填写表单数据 (JSON格式)..."
              defaultValue="{}"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 委派任务Modal */}
      <Modal
        title="委派任务"
        open={delegateModalVisible}
        onCancel={() => setDelegateModalVisible(false)}
        onOk={() => delegateForm.submit()}
        width={500}
      >
        <Form
          form={delegateForm}
          layout="vertical"
          onFinish={handleDelegateTask}
        >
          <Form.Item
            name="toUserId"
            label="委派给"
            rules={[{ required: true, message: '请选择委派对象' }]}
          >
            <Select placeholder="选择用户">
              <Option value={1}>管理员</Option>
              <Option value={2}>用户1</Option>
              <Option value={3}>用户2</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="comment"
            label="委派原因"
            rules={[{ required: true, message: '请填写委派原因' }]}
          >
            <TextArea rows={3} placeholder="请说明委派原因..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskWorkspace;
