import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http as mswHttp } from 'msw';

// Mock server for API testing
const mockApiHandlers = [
  // Auth endpoints
  mswHttp.post('*/auth/login', () => {
    return Response.json({
      message: '登录成功',
      data: {
        user: {
          id: 1,
          username: 'testuser',
          display_name: 'Test User',
          email: 'test@example.com',
          phone: '13800138000',
          role: 'user',
          status: 'active',
          avatar: '',
          last_login_at: null,
          created_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token-12345',
      },
    });
  }),

  mswHttp.post('*/auth/register', () => {
    return Response.json({
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
    });
  }),

  // User profile endpoints
  mswHttp.get('*/user/profile', () => {
    return Response.json({
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
    });
  }),

  mswHttp.put('*/user/profile', () => {
    return Response.json({
      message: '更新用户资料成功',
      data: {
        id: 1,
        username: 'testuser',
        display_name: 'Updated User',
        email: 'updated@example.com',
        phone: '13900139000',
        role: 'user',
        status: 'active',
        avatar: '',
        last_login_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      },
    });
  }),

  mswHttp.post('*/user/change-password', () => {
    return Response.json({
      message: '密码修改成功',
    });
  }),

  // Admin endpoints
  mswHttp.get('*/admin/users', () => {
    return Response.json({
      message: '获取用户列表成功',
      data: {
        users: [
          {
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
        ],
        total: 1,
        page: 1,
        page_size: 20,
      },
    });
  }),

  mswHttp.get('*/admin/stats/users', () => {
    return Response.json({
      message: '获取用户统计成功',
      data: {
        total_active: 10,
        admin_count: 2,
        user_count: 8,
      },
    });
  }),

  // Test endpoints for HTTP client testing
  mswHttp.get('*/test-endpoint', () => {
    return Response.json({ message: 'Test GET success' });
  }),

  mswHttp.post('*/test-endpoint', () => {
    return Response.json({ message: 'Test POST success' });
  }),

  mswHttp.put('*/test-endpoint', () => {
    return Response.json({ message: 'Test PUT success' });
  }),

  mswHttp.delete('*/test-endpoint', () => {
    return Response.json({ message: 'Test DELETE success' });
  }),
];

const server = setupServer(...mockApiHandlers);

// Start mock server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Clean up after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock window.matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
