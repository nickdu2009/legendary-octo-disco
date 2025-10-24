import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Space, 
  Button,
  Table,
  Tag,
  Avatar,
  Progress 
} from 'antd';
import { 
  ApartmentOutlined, 
  CheckSquareOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  PlusOutlined,
  EyeOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUserInfo } from '../../store/userStore';
import { userApi } from '../../services/userApi';
import { formatRelativeTime, formatUserRole } from '../../utils/formatters';
import type { User, UserStats } from '../../types/user';

const { Title, Text, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserInfo();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!isAdmin()) return;
    
    setLoading(true);
    try {
      // Load user statistics (admin only)
      const stats = await userApi.getUserStats();
      setUserStats(stats);

      // Load recent users (admin only)
      const usersResponse = await userApi.getUsers({ page: 1, page_size: 5 });
      setRecentUsers(usersResponse.users);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demo
  const mockStats = {
    myProcesses: 3,
    pendingTasks: 5,
    completedTasks: 12,
    totalProcessTime: '2.5小时',
  };

  const mockRecentProcesses = [
    { id: 1, name: '请假审批流程', status: 'running', progress: 60 },
    { id: 2, name: '报销审批流程', status: 'completed', progress: 100 },
    { id: 3, name: '采购申请流程', status: 'pending', progress: 20 },
  ];

  const recentUsersColumns = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: User) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />}>
            {record.display_name?.[0] || username[0]}
          </Avatar>
          <div>
            <div>{record.display_name || username}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              @{username}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {formatUserRole(role)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '活跃' : '非活跃'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt: string) => formatRelativeTime(createdAt),
    },
  ];

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <Title level={3}>
          欢迎回来, {user?.display_name || user?.username}! 👋
        </Title>
        <Paragraph type="secondary">
          今天是 {new Date().toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long' 
          })}，让我们开始高效的工作吧！
        </Paragraph>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[12, 12]} className="stats-section">
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="我的流程"
              value={mockStats.myProcesses}
              prefix={<ApartmentOutlined style={{ color: '#1890ff' }} />}
              suffix="个"
            />
            <Button 
              type="link" 
              size="small" 
              onClick={() => navigate('/process')}
            >
              查看详情
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="待办任务"
              value={mockStats.pendingTasks}
              prefix={<CheckSquareOutlined style={{ color: '#fa8c16' }} />}
              suffix="个"
            />
            <Button 
              type="link" 
              size="small" 
              onClick={() => navigate('/tasks')}
            >
              立即处理
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="已完成任务"
              value={mockStats.completedTasks}
              prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
              suffix="个"
            />
            <Button 
              type="link" 
              size="small" 
              onClick={() => navigate('/tasks?filter=completed')}
            >
              查看历史
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="处理时长"
              value={mockStats.totalProcessTime}
              prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              本月累计
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} className="content-section">
        {/* Recent Processes */}
        <Col xs={24} lg={isAdmin() ? 16 : 18}>
          <Card 
            title="最近的流程" 
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => navigate('/process/create')}
              >
                创建流程
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {mockRecentProcesses.map(process => (
                <Card key={process.id} size="small" className="process-card">
                  <div className="process-info">
                    <div className="process-header">
                      <Text strong>{process.name}</Text>
                      <Tag color={
                        process.status === 'completed' ? 'green' :
                        process.status === 'running' ? 'blue' : 'orange'
                      }>
                        {process.status === 'completed' ? '已完成' :
                         process.status === 'running' ? '进行中' : '待处理'}
                      </Tag>
                    </div>
                    <Progress 
                      percent={process.progress} 
                      size="small" 
                      status={process.status === 'completed' ? 'success' : 'active'}
                    />
                    <div className="process-actions">
                      <Button 
                        type="link" 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/process/${process.id}`)}
                      >
                        查看详情
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {mockRecentProcesses.length === 0 && (
                <div className="empty-state">
                  <Text type="secondary">暂无流程数据</Text>
                  <br />
                  <Button 
                    type="link" 
                    onClick={() => navigate('/process/create')}
                  >
                    创建第一个流程
                  </Button>
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* Admin Panel */}
        {isAdmin() && (
          <Col xs={24} lg={8}>
            <Card title="系统概览">
              {userStats && (
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Statistic
                      title="活跃用户"
                      value={userStats.total_active}
                      prefix={<UserOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="管理员"
                      value={userStats.admin_count}
                      prefix={<UserOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="普通用户"
                      value={userStats.user_count}
                      prefix={<UserOutlined />}
                    />
                  </Col>
                </Row>
              )}

              {recentUsers.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <Title level={5}>最近注册用户</Title>
                  <Table
                    dataSource={recentUsers}
                    columns={recentUsersColumns}
                    pagination={false}
                    size="small"
                    rowKey="id"
                  />
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Button 
                      type="link" 
                      onClick={() => navigate('/admin/users')}
                    >
                      查看所有用户
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        )}

        {/* Regular User Quick Actions */}
        {!isAdmin() && (
          <Col xs={24} lg={6}>
            <Card title="快速操作">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  block 
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/process/create')}
                >
                  创建新流程
                </Button>
                <Button 
                  block 
                  icon={<CheckSquareOutlined />}
                  onClick={() => navigate('/tasks')}
                >
                  处理待办任务
                </Button>
                <Button 
                  block 
                  icon={<ApartmentOutlined />}
                  onClick={() => navigate('/process')}
                >
                  查看我的流程
                </Button>
              </Space>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default Dashboard;
