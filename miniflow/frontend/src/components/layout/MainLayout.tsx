import React, { useState } from 'react';
import { 
  Layout, 
  Menu, 
  Dropdown, 
  Avatar, 
  Button, 
  Typography, 
  Space,
  Badge,
  Divider,
  message
} from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  ApartmentOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  BarChartOutlined,
  BellOutlined,
  MonitorOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth, useAuthActions, useUserInfo } from '../../store/userStore';
import { formatUserRole, getAvatarFallback } from '../../utils/formatters';
import { SUCCESS_MESSAGES } from '../../constants';
import type { MenuProps } from 'antd';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const { isAdmin } = useUserInfo();
  const [collapsed, setCollapsed] = useState(false);

  // Main navigation menu items
  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/process',
      icon: <ApartmentOutlined />,
      label: '流程管理',
      children: [
        {
          key: '/process',
          icon: <ApartmentOutlined />,
          label: '流程定义',
        },
        {
          key: '/process/monitor',
          icon: <MonitorOutlined />,
          label: '流程监控',
        },
        {
          key: '/process/instances',
          icon: <EyeOutlined />,
          label: '实例管理',
        },
      ],
    },
    {
      key: '/tasks',
      icon: <CheckSquareOutlined />,
      label: '任务中心',
      children: [
        {
          key: '/tasks/workspace',
          icon: <CheckSquareOutlined />,
          label: '我的工作台',
        },
        {
          key: '/tasks',
          icon: <UserOutlined />,
          label: '任务列表',
        },
      ],
    },
    // Admin menu items
    ...(isAdmin() ? [
      {
        type: 'divider' as const,
      },
      {
        key: '/admin',
        icon: <TeamOutlined />,
        label: '系统管理',
        children: [
          {
            key: '/admin/users',
            icon: <TeamOutlined />,
            label: '用户管理',
          },
          {
            key: '/admin/stats',
            icon: <BarChartOutlined />,
            label: '统计分析',
          },
        ],
      },
    ] : []),

    // System monitoring menu (admin or development environment)
    ...((isAdmin() || process.env.NODE_ENV === 'development') ? [
      {
        type: 'divider' as const,
      },
      {
        key: '/system',
        icon: <MonitorOutlined />,
        label: '系统监控',
        children: [
          {
            key: '/system/integration',
            icon: <CheckCircleOutlined />,
            label: '集成测试',
          },
          {
            key: '/system/performance',
            icon: <DashboardOutlined />,
            label: '性能监控',
          },
          {
            key: '/system/e2e',
            icon: <ExperimentOutlined />,
            label: '端到端测试',
          },
        ],
      },
    ] : []),
    
    // Development menu items (only in development environment)
    ...(process.env.NODE_ENV === 'development' ? [
      {
        type: 'divider' as const,
      },
      {
        key: '/dev',
        icon: <ExperimentOutlined />,
        label: '开发工具',
        children: [
          {
            key: '/dev/basic',
            icon: <ApartmentOutlined />,
            label: '基础演示',
          },
          {
            key: '/dev/enhanced',
            icon: <DashboardOutlined />,
            label: '增强演示',
          },
          {
            key: '/dev/demo',
            icon: <CheckCircleOutlined />,
            label: 'ReactFlow演示',
          },
          {
            key: '/dev/day3',
            icon: <SettingOutlined />,
            label: 'Day3功能测试',
          },
          {
            key: '/dev/day3-integration',
            icon: <UserOutlined />,
            label: 'Day3前端界面',
          },
          {
            key: '/dev/day4',
            icon: <MonitorOutlined />,
            label: 'Day4 API测试',
          },
        ],
      },
    ] : []),
  ];

  // User dropdown menu items
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  function handleLogout() {
    logout();
    message.success(SUCCESS_MESSAGES.LOGOUT_SUCCESS);
    navigate('/login');
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const getPageTitle = () => {
    const pathTitleMap: Record<string, string> = {
      '/dashboard': '仪表板',
      '/process': '流程定义',
      '/process/monitor': '流程监控',
      '/process/instances': '实例管理',
      '/tasks': '任务列表',
      '/tasks/workspace': '我的工作台',
      '/profile': '个人资料',
      '/settings': '设置',
      '/admin/users': '用户管理',
      '/admin/stats': '统计分析',
      '/system/integration': '系统集成测试',
      '/system/performance': '性能监控',
      '/system/e2e': '端到端测试',
      '/dev/basic': '基础演示',
      '/dev/enhanced': '增强演示',
      '/dev/demo': 'ReactFlow演示',
      '/dev/day3': 'Day3功能测试',
      '/dev/day3-integration': 'Day3前端界面集成',
      '/dev/day4': 'Day4 API测试',
    };
    return pathTitleMap[location.pathname] || 'MiniFlow';
  };

  return (
    <Layout className="main-layout">
      {/* Sidebar */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="main-sidebar"
        width={200}
        collapsedWidth={60}
      >
        <div className="sidebar-header">
          <div className="logo">
            <img src="/vite.svg" alt="MiniFlow" className="logo-image" />
            {!collapsed && (
              <Text className="logo-text">MiniFlow</Text>
            )}
          </div>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="main-menu"
        />

        {/* User info in sidebar */}
        {!collapsed && (
          <div className="sidebar-user-info">
            <Divider style={{ margin: '12px 0', borderColor: '#434343' }} />
            <div className="user-info-compact">
              <Avatar 
                size="small"
                src={user?.avatar}
                icon={<UserOutlined />}
              >
                {!user?.avatar && getAvatarFallback(user?.display_name || '', user?.username || '')}
              </Avatar>
              <div className="user-info-text">
                <Text className="username" ellipsis>
                  {user?.display_name || user?.username}
                </Text>
                <Text type="secondary" className="user-role">
                  {formatUserRole(user?.role || '')}
                </Text>
              </div>
            </div>
          </div>
        )}
      </Sider>

      {/* Main content area */}
      <Layout className="main-content-layout">
        {/* Header */}
        <Header className="main-header">
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="sidebar-toggle"
            />
            <Typography.Title level={4} className="page-title">
              {getPageTitle()}
            </Typography.Title>
          </div>

          <div className="header-right">
            <Space size="middle">
              {/* Notifications */}
              <Badge count={0} showZero={false}>
                <Button 
                  type="text" 
                  icon={<BellOutlined />}
                  onClick={() => message.info('通知功能将在后续版本中提供')}
                />
              </Badge>

              {/* User dropdown */}
              <Dropdown 
                menu={{ items: userMenuItems }} 
                placement="bottomRight"
                trigger={['click']}
              >
                <div className="user-dropdown-trigger">
                  <Avatar 
                    src={user?.avatar}
                    icon={<UserOutlined />}
                    className="user-avatar"
                  >
                    {!user?.avatar && getAvatarFallback(user?.display_name || '', user?.username || '')}
                  </Avatar>
                  <div className="user-info">
                    <Text className="user-name">
                      {user?.display_name || user?.username}
                    </Text>
                    <Text type="secondary" className="user-role">
                      {formatUserRole(user?.role || '')}
                    </Text>
                  </div>
                </div>
              </Dropdown>
            </Space>
          </div>
        </Header>

        {/* Page content */}
        <Content className="main-content">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </Content>

        {/* Footer - 临时移除以节省空间 */}
        {false && (
          <Footer className="main-footer">
            <div className="footer-content">
              <Text type="secondary">
                MiniFlow 极简版流程引擎 © 2025 Created with ❤️
              </Text>
              <Space split={<Divider type="vertical" />}>
                <Button type="link" size="small">帮助文档</Button>
                <Button type="link" size="small">意见反馈</Button>
                <Button type="link" size="small">关于我们</Button>
              </Space>
            </div>
          </Footer>
        )}
      </Layout>
    </Layout>
  );
};

export default MainLayout;
