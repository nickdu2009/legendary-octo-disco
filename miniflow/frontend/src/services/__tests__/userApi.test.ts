import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the http client before importing userApi
vi.mock('../../utils/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocking
import { userApi } from '../userApi';
import { http } from '../../utils/http';

const mockHttp = vi.mocked(http);

describe('userApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication APIs', () => {
    it('should call login API correctly', async () => {
      const loginData = { username: 'testuser', password: 'password123' };
      const mockResponse = {
        data: {
          message: '登录成功',
          data: {
            user: {
              id: 1,
              username: 'testuser',
              display_name: 'Test User',
              email: 'test@example.com',
              phone: '',
              role: 'user',
              status: 'active',
              avatar: '',
              last_login_at: null,
              created_at: '2024-01-01T00:00:00Z',
            },
            token: 'mock-jwt-token',
          },
        },
      };

      mockHttp.post.mockResolvedValue(mockResponse);

      const result = await userApi.login(loginData);

      expect(mockHttp.post).toHaveBeenCalledWith('/auth/login', loginData);
      expect(result.user.username).toBe('testuser');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should call register API correctly', async () => {
      const registerData = {
        username: 'newuser',
        password: 'password123',
        display_name: 'New User',
        email: 'new@example.com',
      };
      const mockResponse = {
        data: {
          message: '注册成功',
          data: {
            id: 2,
            username: 'newuser',
            display_name: 'New User',
            email: 'new@example.com',
            phone: '',
            role: 'user',
            status: 'active',
            avatar: '',
            last_login_at: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      };

      mockHttp.post.mockResolvedValue(mockResponse);

      const result = await userApi.register(registerData);

      expect(mockHttp.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result.username).toBe('newuser');
    });

    it('should handle login API error correctly', async () => {
      const loginData = { username: 'testuser', password: 'wrongpassword' };
      const mockErrorResponse = {
        data: {
          error: '用户名或密码错误',
          code: 'LOGIN_FAILED',
        },
      };

      mockHttp.post.mockResolvedValue(mockErrorResponse);

      await expect(userApi.login(loginData)).rejects.toThrow('用户名或密码错误');
    });
  });

  describe('User Profile APIs', () => {
    it('should call getProfile API correctly', async () => {
      const mockResponse = {
        data: {
          message: '获取用户资料成功',
          data: {
            id: 1,
            username: 'testuser',
            display_name: 'Test User',
            email: 'test@example.com',
            phone: '13800138000',
            role: 'user',
            status: 'active',
            avatar: '',
            last_login_at: '2024-01-01T12:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      };

      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await userApi.getProfile();

      expect(mockHttp.get).toHaveBeenCalledWith('/user/profile');
      expect(result.username).toBe('testuser');
    });

    it('should call updateProfile API correctly', async () => {
      const updateData = {
        display_name: 'Updated User',
        phone: '13900139000',
      };
      const mockResponse = {
        data: {
          message: '更新用户资料成功',
          data: {
            id: 1,
            username: 'testuser',
            display_name: 'Updated User',
            email: 'test@example.com',
            phone: '13900139000',
            role: 'user',
            status: 'active',
            avatar: '',
            last_login_at: '2024-01-01T12:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      };

      mockHttp.put.mockResolvedValue(mockResponse);

      const result = await userApi.updateProfile(updateData);

      expect(mockHttp.put).toHaveBeenCalledWith('/user/profile', updateData);
      expect(result.display_name).toBe('Updated User');
      expect(result.phone).toBe('13900139000');
    });

    it('should call changePassword API correctly', async () => {
      const passwordData = {
        old_password: 'oldpass123',
        new_password: 'newpass123',
      };
      const mockResponse = {
        data: {
          message: '密码修改成功',
        },
      };

      mockHttp.post.mockResolvedValue(mockResponse);

      await userApi.changePassword(passwordData);

      expect(mockHttp.post).toHaveBeenCalledWith('/user/change-password', passwordData);
    });
  });

  describe('Admin APIs', () => {
    it('should call getUsers API with pagination', async () => {
      const paginationParams = { page: 1, page_size: 10 };
      const mockResponse = {
        data: {
          message: '获取用户列表成功',
          data: {
            users: [
              {
                id: 1,
                username: 'testuser',
                display_name: 'Test User',
                email: 'test@example.com',
                phone: '',
                role: 'user',
                status: 'active',
                avatar: '',
                last_login_at: null,
                created_at: '2024-01-01T00:00:00Z',
              },
            ],
            total: 1,
            page: 1,
            page_size: 10,
          },
        },
      };

      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await userApi.getUsers(paginationParams);

      expect(mockHttp.get).toHaveBeenCalledWith('/admin/users?page=1&page_size=10');
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should call getUserStats API correctly', async () => {
      const mockResponse = {
        data: {
          message: '获取用户统计成功',
          data: {
            total_active: 10,
            admin_count: 2,
            user_count: 8,
          },
        },
      };

      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await userApi.getUserStats();

      expect(mockHttp.get).toHaveBeenCalledWith('/admin/stats/users');
      expect(result.total_active).toBe(10);
      expect(result.admin_count).toBe(2);
      expect(result.user_count).toBe(8);
    });

    it('should call deactivateUser API correctly', async () => {
      const userId = 123;
      const mockResponse = {
        data: {
          message: '用户停用成功',
        },
      };

      mockHttp.post.mockResolvedValue(mockResponse);

      await userApi.deactivateUser(userId);

      expect(mockHttp.post).toHaveBeenCalledWith('/admin/users/123/deactivate');
    });
  });

  describe('Error Handling', () => {
    it('should handle API error responses correctly', async () => {
      const loginData = { username: 'testuser', password: 'wrongpassword' };
      const mockErrorResponse = {
        data: {
          error: '用户名或密码错误',
          code: 'LOGIN_FAILED',
        },
      };

      mockHttp.post.mockResolvedValue(mockErrorResponse);

      await expect(userApi.login(loginData)).rejects.toThrow('用户名或密码错误');
    });
  });

  describe('URL Parameter Handling', () => {
    it('should handle getUsers without parameters', async () => {
      const mockResponse = {
        data: {
          message: '获取用户列表成功',
          data: {
            users: [],
            total: 0,
            page: 1,
            page_size: 20,
          },
        },
      };

      mockHttp.get.mockResolvedValue(mockResponse);

      await userApi.getUsers();

      expect(mockHttp.get).toHaveBeenCalledWith('/admin/users');
    });

    it('should handle getUsers with only page parameter', async () => {
      const mockResponse = {
        data: {
          message: '获取用户列表成功',
          data: {
            users: [],
            total: 0,
            page: 2,
            page_size: 20,
          },
        },
      };

      mockHttp.get.mockResolvedValue(mockResponse);

      await userApi.getUsers({ page: 2 });

      expect(mockHttp.get).toHaveBeenCalledWith('/admin/users?page=2');
    });
  });
});
