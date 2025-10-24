import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// Mock store hooks
vi.mock('../../store/userStore', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  })),
  useAuthActions: vi.fn(() => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  })),
  useUserInfo: vi.fn(() => ({
    user: null,
    isAdmin: () => false,
    hasRole: () => false,
  })),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/login' }),
  };
});

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConfigProvider locale={zhCN}>
    <MemoryRouter>
      {children}
    </MemoryRouter>
  </ConfigProvider>
);

// Import components after mocking
import Login from '../auth/Login';
import Register from '../auth/Register';

describe('Authentication Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Page', () => {
    it('should render login form elements', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText('欢迎使用 MiniFlow')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    });

    it('should have register link', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText('立即注册')).toBeInTheDocument();
    });
  });

  describe('Register Page', () => {
    it('should render register form elements', () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      expect(screen.getByText('创建 MiniFlow 账号')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/请输入用户名/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/请输入密码.*至少6个字符/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument();
    });

    it('should have login link', () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      expect(screen.getByText('立即登录')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText(/用户名.*3-50个字符/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/显示名称.*可选/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/邮箱地址.*可选/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/手机号码.*可选/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/再次输入密码/)).toBeInTheDocument();
    });
  });
});
