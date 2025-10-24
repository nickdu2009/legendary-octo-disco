import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthActions } from '../../store/userStore';
import { getAntdRules } from '../../utils/validators';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';
import type { LoginRequest } from '../../types/user';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthActions();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: LoginRequest) => {
    setLoading(true);
    try {
      await login(values);
      message.success(SUCCESS_MESSAGES.LOGIN_SUCCESS);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.message || ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    message.info('忘记密码功能将在后续版本中提供');
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-overlay" />
      </div>
      
      <div className="auth-content">
        <Card className="auth-card" bordered={false}>
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/vite.svg" alt="MiniFlow" className="logo-image" />
            </div>
            <Title level={2} className="auth-title">
              欢迎使用 MiniFlow
            </Title>
            <Text type="secondary" className="auth-subtitle">
              极简版流程引擎 - 让工作流程更简单
            </Text>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
            layout="vertical"
            className="auth-form"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={getAntdRules.username()}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={getAntdRules.password()}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                autoComplete="current-password"
                iconRender={(visible) => 
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Form.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="auth-submit-btn"
                >
                  登录
                </Button>
                
                <div className="auth-links">
                  <Button 
                    type="link" 
                    onClick={handleForgotPassword}
                    size="small"
                  >
                    忘记密码？
                  </Button>
                </div>
              </Space>
            </Form.Item>
          </Form>

          <div className="auth-footer">
            <Text type="secondary">
              还没有账号？{' '}
              <Link to="/register" className="auth-link">
                立即注册
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
