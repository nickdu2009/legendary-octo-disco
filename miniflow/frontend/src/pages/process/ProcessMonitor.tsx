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
  Descriptions,
  Timeline,
  Progress,
  Statistic,
  Tooltip,
  Badge,
  Popconfirm,
  Drawer
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  HistoryOutlined,
  ExportOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import 'dayjs/locale/zh-cn';

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.locale('zh-cn');

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// 类型定义
interface ProcessInstance {
  id: number;
  definition_id: number;
  business_key: string;
  title: string;
  description?: string;
  current_node: string;
  status: string;
  variables: string;
  start_time: string;
  end_time?: string;
  starter_id: number;
  execution_path: string;
  suspend_reason?: string;
  priority: number;
  due_date?: string;
  actual_duration: number;
  expected_duration: number;
  task_count: number;
  completed_tasks: number;
  failed_tasks: number;
  active_tasks: number;
  tags?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
  // 关联数据
  definition?: {
    id: number;
    name: string;
    key: string;
    category: string;
    version: number;
  };
  starter?: {
    id: number;
    username: string;
    display_name: string;
  };
  tasks?: TaskInstance[];
}

interface TaskInstance {
  id: number;
  name: string;
  status: string;
  assignee?: {
    username: string;
    display_name: string;
  };
  created_at: string;
  complete_time?: string;
}

interface InstanceListResponse {
  instances: ProcessInstance[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 流程状态映射
const instanceStatusMap = {
  running: { text: '运行中', color: 'processing' },
  suspended: { text: '已暂停', color: 'warning' },
  completed: { text: '已完成', color: 'success' },
  failed: { text: '失败', color: 'error' },
  cancelled: { text: '已取消', color: 'default' }
};

const ProcessMonitor: React.FC = () => {
  // 状态管理
  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<ProcessInstance | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 筛选状态
  const [filters, setFilters] = useState({
    status: '',
    definition_id: '',
    search: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  });

  // Modal和Drawer状态
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [instanceDetailDrawerVisible, setInstanceDetailDrawerVisible] = useState(false);
  const [executionHistoryModalVisible, setExecutionHistoryModalVisible] = useState(false);

  // 表单实例
  const [suspendForm] = Form.useForm();
  const [cancelForm] = Form.useForm();

  // 执行历史数据
  const [executionHistory, setExecutionHistory] = useState<any>(null);

  // 获取流程实例列表
  const fetchInstances = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.definition_id && { definition_id: filters.definition_id })
      });

      const response = await fetch(`/api/v1/instances?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const data: InstanceListResponse = result.data;
        setInstances(data.instances || []);
        setPagination({
          current: data.page,
          pageSize: data.page_size,
          total: data.total
        });
      } else {
        message.error('获取流程实例列表失败');
      }
    } catch (error) {
      console.error('获取流程实例列表异常:', error);
      message.error('获取流程实例列表异常');
    } finally {
      setLoading(false);
    }
  };

  // 获取执行历史
  const fetchExecutionHistory = async (instanceId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/instance/${instanceId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setExecutionHistory(result.data);
        setExecutionHistoryModalVisible(true);
      } else {
        message.error('获取执行历史失败');
      }
    } catch (error) {
      console.error('获取执行历史异常:', error);
      message.error('获取执行历史异常');
    }
  };

  // 组件挂载时获取实例列表
  useEffect(() => {
    fetchInstances();
  }, [filters]);

  // 实例操作方法
  const handleSuspendInstance = async (values: any) => {
    if (!selectedInstance) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/instance/${selectedInstance.id}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: values.reason
        })
      });

      if (response.ok) {
        message.success('流程实例暂停成功');
        setSuspendModalVisible(false);
        suspendForm.resetFields();
        fetchInstances(pagination.current, pagination.pageSize);
      } else {
        const errorData = await response.json();
        message.error(errorData.message || '流程实例暂停失败');
      }
    } catch (error) {
      console.error('暂停流程实例异常:', error);
      message.error('暂停流程实例异常');
    }
  };

  const handleResumeInstance = async (instanceId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/instance/${instanceId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('流程实例恢复成功');
        fetchInstances(pagination.current, pagination.pageSize);
      } else {
        const errorData = await response.json();
        message.error(errorData.message || '流程实例恢复失败');
      }
    } catch (error) {
      console.error('恢复流程实例异常:', error);
      message.error('恢复流程实例异常');
    }
  };

  const handleCancelInstance = async (values: any) => {
    if (!selectedInstance) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/instance/${selectedInstance.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: values.reason
        })
      });

      if (response.ok) {
        message.success('流程实例取消成功');
        setCancelModalVisible(false);
        cancelForm.resetFields();
        fetchInstances(pagination.current, pagination.pageSize);
      } else {
        const errorData = await response.json();
        message.error(errorData.message || '流程实例取消失败');
      }
    } catch (error) {
      console.error('取消流程实例异常:', error);
      message.error('取消流程实例异常');
    }
  };

  // 计算执行进度
  const calculateProgress = (instance: ProcessInstance) => {
    if (instance.task_count === 0) return 0;
    return Math.round((instance.completed_tasks / instance.task_count) * 100);
  };

  // 格式化执行时长
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0秒';
    const duration = dayjs.duration(seconds, 'seconds');
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    
    let result = '';
    if (days > 0) result += `${days}天`;
    if (hours > 0) result += `${hours}小时`;
    if (minutes > 0) result += `${minutes}分钟`;
    
    return result || '少于1分钟';
  };

  // 表格列定义
  const columns: ColumnsType<ProcessInstance> = [
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
        const statusInfo = instanceStatusMap[status as keyof typeof instanceStatusMap] || 
          { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_, record: ProcessInstance) => {
        const progress = calculateProgress(record);
        const status = record.status === 'completed' ? 'success' : 
                      record.status === 'failed' ? 'exception' : 'active';
        return (
          <div>
            <Progress 
              percent={progress} 
              size="small" 
              status={status}
              format={(percent) => `${percent}%`}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
              {record.completed_tasks}/{record.task_count} 任务
              {record.failed_tasks > 0 && (
                <span style={{ color: '#ff4d4f', marginLeft: 4 }}>
                  ({record.failed_tasks}失败)
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: number) => {
        const color = priority >= 90 ? 'red' : 
                     priority >= 70 ? 'orange' : 
                     priority >= 40 ? 'blue' : 'default';
        return <Tag color={color}>{priority}</Tag>;
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
      title: '启动人',
      key: 'starter',
      width: 100,
      render: (_, record: ProcessInstance) => (
        <div>
          <UserOutlined style={{ marginRight: 4 }} />
          {record.starter?.display_name || record.starter?.username}
        </div>
      )
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
            onClick={() => {
              setSelectedInstance(record);
              setInstanceDetailDrawerVisible(true);
            }}
          >
            详情
          </Button>
          
          <Button 
            size="small" 
            icon={<HistoryOutlined />}
            onClick={() => fetchExecutionHistory(record.id)}
          >
            历史
          </Button>

          {record.status === 'running' && (
            <Popconfirm
              title="确定要暂停此流程实例吗？"
              onConfirm={() => {
                setSelectedInstance(record);
                setSuspendModalVisible(true);
              }}
            >
              <Button size="small" icon={<PauseCircleOutlined />}>
                暂停
              </Button>
            </Popconfirm>
          )}

          {record.status === 'suspended' && (
            <Popconfirm
              title="确定要恢复此流程实例吗？"
              onConfirm={() => handleResumeInstance(record.id)}
            >
              <Button size="small" type="primary" icon={<PlayCircleOutlined />}>
                恢复
              </Button>
            </Popconfirm>
          )}

          {['running', 'suspended'].includes(record.status) && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => {
                setSelectedInstance(record);
                setCancelModalVisible(true);
              }}
            >
              取消
            </Button>
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
                <BarChartOutlined />
                流程实例监控
                <Badge count={instances.length} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
            extra={
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={() => fetchInstances(pagination.current, pagination.pageSize)}
                >
                  刷新
                </Button>
                <Button icon={<ExportOutlined />}>
                  导出
                </Button>
              </Space>
            }
          >
            {/* 筛选器 */}
            <div style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Search
                    placeholder="搜索业务键或标题"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onSearch={(value) => setFilters({ ...filters, search: value })}
                    allowClear
                  />
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="实例状态"
                    value={filters.status}
                    onChange={(value) => setFilters({ ...filters, status: value })}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="running">运行中</Option>
                    <Option value="suspended">已暂停</Option>
                    <Option value="completed">已完成</Option>
                    <Option value="failed">失败</Option>
                    <Option value="cancelled">已取消</Option>
                  </Select>
                </Col>
                <Col span={6}>
                  <RangePicker
                    placeholder={['开始时间', '结束时间']}
                    value={filters.dateRange}
                    onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </div>

            {/* 实例统计卡片 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="运行中"
                    value={instances.filter(i => i.status === 'running').length}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<PlayCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="已完成"
                    value={instances.filter(i => i.status === 'completed').length}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="已暂停"
                    value={instances.filter(i => i.status === 'suspended').length}
                    valueStyle={{ color: '#fa8c16' }}
                    prefix={<PauseCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="失败/取消"
                    value={instances.filter(i => ['failed', 'cancelled'].includes(i.status)).length}
                    valueStyle={{ color: '#ff4d4f' }}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* 流程实例列表 */}
            <Table
              columns={columns}
              dataSource={instances}
              rowKey="id"
              loading={loading}
              pagination={{
                ...pagination,
                onChange: (page, pageSize) => {
                  fetchInstances(page, pageSize);
                },
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条实例`
              }}
              scroll={{ x: 1200 }}
              expandable={{
                expandedRowRender: (record) => (
                  <div style={{ padding: '16px', background: '#fafafa' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="当前节点">{record.current_node}</Descriptions.Item>
                          <Descriptions.Item label="预期时长">{formatDuration(record.expected_duration)}</Descriptions.Item>
                          <Descriptions.Item label="活跃任务">{record.active_tasks}</Descriptions.Item>
                        </Descriptions>
                      </Col>
                      <Col span={12}>
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="描述">{record.description || '无'}</Descriptions.Item>
                          <Descriptions.Item label="到期时间">
                            {record.due_date ? dayjs(record.due_date).format('YYYY-MM-DD HH:mm') : '无'}
                          </Descriptions.Item>
                          {record.suspend_reason && (
                            <Descriptions.Item label="暂停原因">{record.suspend_reason}</Descriptions.Item>
                          )}
                        </Descriptions>
                      </Col>
                    </Row>
                  </div>
                ),
                rowExpandable: (record) => true,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 实例详情Drawer */}
      <Drawer
        title="流程实例详情"
        placement="right"
        width={600}
        open={instanceDetailDrawerVisible}
        onClose={() => setInstanceDetailDrawerVisible(false)}
      >
        {selectedInstance && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="实例ID">{selectedInstance.id}</Descriptions.Item>
              <Descriptions.Item label="业务键">{selectedInstance.business_key}</Descriptions.Item>
              <Descriptions.Item label="标题">{selectedInstance.title}</Descriptions.Item>
              <Descriptions.Item label="流程定义">
                {selectedInstance.definition?.name} (v{selectedInstance.definition?.version})
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={instanceStatusMap[selectedInstance.status as keyof typeof instanceStatusMap]?.color}>
                  {instanceStatusMap[selectedInstance.status as keyof typeof instanceStatusMap]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前节点">{selectedInstance.current_node}</Descriptions.Item>
              <Descriptions.Item label="执行进度">
                <Progress percent={calculateProgress(selectedInstance)} />
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  已完成 {selectedInstance.completed_tasks} / {selectedInstance.task_count} 个任务
                  {selectedInstance.failed_tasks > 0 && (
                    <span style={{ color: '#ff4d4f', marginLeft: 8 }}>
                      {selectedInstance.failed_tasks} 个失败
                    </span>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={selectedInstance.priority >= 80 ? 'red' : selectedInstance.priority >= 60 ? 'orange' : 'blue'}>
                  {selectedInstance.priority}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="启动人">
                {selectedInstance.starter?.display_name || selectedInstance.starter?.username}
              </Descriptions.Item>
              <Descriptions.Item label="启动时间">
                {dayjs(selectedInstance.start_time).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {selectedInstance.end_time && (
                <Descriptions.Item label="结束时间">
                  {dayjs(selectedInstance.end_time).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="执行时长">
                {formatDuration(selectedInstance.actual_duration || 
                  dayjs().diff(dayjs(selectedInstance.start_time), 'seconds'))}
              </Descriptions.Item>
              <Descriptions.Item label="预期时长">
                {formatDuration(selectedInstance.expected_duration)}
              </Descriptions.Item>
              {selectedInstance.due_date && (
                <Descriptions.Item label="到期时间">
                  {dayjs(selectedInstance.due_date).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {selectedInstance.description && (
                <Descriptions.Item label="描述">
                  {selectedInstance.description}
                </Descriptions.Item>
              )}
              {selectedInstance.suspend_reason && (
                <Descriptions.Item label="暂停原因">
                  {selectedInstance.suspend_reason}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 流程变量 */}
            {selectedInstance.variables && (
              <>
                <Divider>流程变量</Divider>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(JSON.parse(selectedInstance.variables), null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* 暂停实例Modal */}
      <Modal
        title="暂停流程实例"
        open={suspendModalVisible}
        onCancel={() => setSuspendModalVisible(false)}
        onOk={() => suspendForm.submit()}
        width={500}
      >
        <Form
          form={suspendForm}
          layout="vertical"
          onFinish={handleSuspendInstance}
        >
          <Form.Item
            name="reason"
            label="暂停原因"
            rules={[{ required: true, message: '请填写暂停原因' }]}
          >
            <TextArea rows={4} placeholder="请说明暂停原因..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 取消实例Modal */}
      <Modal
        title="取消流程实例"
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        onOk={() => cancelForm.submit()}
        width={500}
      >
        <Form
          form={cancelForm}
          layout="vertical"
          onFinish={handleCancelInstance}
        >
          <Form.Item
            name="reason"
            label="取消原因"
            rules={[{ required: true, message: '请填写取消原因' }]}
          >
            <TextArea rows={4} placeholder="请说明取消原因..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行历史Modal */}
      <Modal
        title="流程执行历史"
        open={executionHistoryModalVisible}
        onCancel={() => setExecutionHistoryModalVisible(false)}
        footer={null}
        width={800}
      >
        {executionHistory && (
          <div>
            <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="实例ID">{executionHistory.instance?.id}</Descriptions.Item>
              <Descriptions.Item label="业务键">{executionHistory.instance?.business_key}</Descriptions.Item>
              <Descriptions.Item label="执行状态">{executionHistory.instance?.status}</Descriptions.Item>
              <Descriptions.Item label="当前节点">{executionHistory.instance?.current_node}</Descriptions.Item>
            </Descriptions>

            {/* 任务执行历史 */}
            <div>
              <h4>任务执行历史</h4>
              <Timeline>
                {executionHistory.tasks?.map((task: any) => (
                  <Timeline.Item
                    key={task.id}
                    color={
                      task.status === 'completed' ? 'green' :
                      task.status === 'failed' ? 'red' :
                      task.status === 'in_progress' ? 'blue' : 'gray'
                    }
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        状态: <Tag size="small" color={taskStatusMap[task.status as keyof typeof taskStatusMap]?.color}>
                          {taskStatusMap[task.status as keyof typeof taskStatusMap]?.text}
                        </Tag>
                        {task.assignee && (
                          <span style={{ marginLeft: 8 }}>
                            负责人: {task.assignee.display_name || task.assignee.username}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        创建: {dayjs(task.created_at).format('MM-DD HH:mm')}
                        {task.complete_time && (
                          <span style={{ marginLeft: 8 }}>
                            完成: {dayjs(task.complete_time).format('MM-DD HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>

            {/* 执行路径 */}
            {executionHistory.execution_path && (
              <>
                <Divider>执行路径</Divider>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(JSON.parse(executionHistory.execution_path), null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProcessMonitor;
