import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined, 
  PhoneOutlined,
  EyeInvisibleOutlined, 
  EyeTwoTone 
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthActions } from '../../store/userStore';
import { getAntdRules } from '../../utils/validators';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';
import type { RegisterRequest } from '../../types/user';

const { Title, Text } = Typography;

interface RegisterFormData extends RegisterRequest {
  confirm_password: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthActions();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: RegisterFormData) => {
    setLoading(true);
    try {
      const { confirm_password, ...registerData } = values;
      await register(registerData);
      message.success(SUCCESS_MESSAGES.REGISTER_SUCCESS);
      message.info('请使用注册的账号登录');
      navigate('/login');
    } catch (error: any) {
      console.error('Register error:', error);
      message.error(error.message || ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-overlay" />
      </div>
      
      <div className="auth-content">
        <Card className="auth-card auth-card-wide" variant="outlined">
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/vite.svg" alt="MiniFlow" className="logo-image" />
            </div>
            <Title level={2} className="auth-title">
              创建 MiniFlow 账号
            </Title>
            <Text type="secondary" className="auth-subtitle">
              开始您的流程管理之旅
            </Text>
          </div>

          <Form
            form={form}
            name="register"
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
                placeholder="请输入用户名（3-50个字符）"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="display_name"
              label="显示名称"
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入显示名称（可选）"
                autoComplete="name"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱地址"
              rules={getAntdRules.email(true)}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入邮箱地址"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label="手机号码"
              rules={getAntdRules.phone()}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="请输入手机号码（可选）"
                autoComplete="tel"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={getAntdRules.password()}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码（至少6个字符）"
                autoComplete="new-password"
                iconRender={(visible) => 
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="确认密码"
              rules={getAntdRules.confirmPassword()}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入密码"
                autoComplete="new-password"
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
                  注册
                </Button>
              </Space>
            </Form.Item>
          </Form>

          <div className="auth-footer">
            <Text type="secondary">
              已有账号？{' '}
              <Link to="/login" className="auth-link">
                立即登录
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
