import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUserStore } from '../userStore';

// Mock the userApi
vi.mock('../../services/userApi', () => ({
  userApi: {
    login: vi.fn(),
    register: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

// Mock the http client
vi.mock('../../utils/http', () => ({
  http: {
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
  },
}));

describe('useUserStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useUserStore.getState());
    act(() => {
      result.current.logout();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUserStore());
      
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('State Setters', () => {
    it('should set user correctly', () => {
      const { result } = renderHook(() => useUserStore());
      const mockUser = {
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
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should set token correctly', () => {
      const { result } = renderHook(() => useUserStore());
      const mockToken = 'mock-jwt-token';

      act(() => {
        result.current.setToken(mockToken);
      });

      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should set loading state correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should determine admin role correctly', () => {
      const { result } = renderHook(() => useUserStore());
      const adminUser = {
        id: 1,
        username: 'admin',
        display_name: 'Admin User',
        email: 'admin@example.com',
        phone: '',
        role: 'admin',
        status: 'active',
        avatar: '',
        last_login_at: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      act(() => {
        result.current.setUser(adminUser);
      });

      expect(result.current.isAdmin()).toBe(true);
    });

    it('should check user role correctly', () => {
      const { result } = renderHook(() => useUserStore());
      const regularUser = {
        id: 1,
        username: 'user',
        display_name: 'Regular User',
        email: 'user@example.com',
        phone: '',
        role: 'user',
        status: 'active',
        avatar: '',
        last_login_at: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      act(() => {
        result.current.setUser(regularUser);
      });

      expect(result.current.hasRole('user')).toBe(true);
      expect(result.current.hasRole('admin')).toBe(false);
    });
  });

  describe('Logout Action', () => {
    it('should clear state on logout', () => {
      const { result } = renderHook(() => useUserStore());
      const mockUser = {
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
      };

      // Set user first
      act(() => {
        result.current.setUser(mockUser);
        result.current.setToken('mock-token');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('should provide auth selector', () => {
      const { result } = renderHook(() => useUserStore((state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      })));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
