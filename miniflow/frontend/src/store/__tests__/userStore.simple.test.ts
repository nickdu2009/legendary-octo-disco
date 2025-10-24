import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../../services/userApi', () => ({
  userApi: {
    login: vi.fn().mockResolvedValue({
      user: { id: 1, username: 'test' },
      token: 'mock-token'
    }),
    register: vi.fn().mockResolvedValue({ id: 1, username: 'test' }),
    getProfile: vi.fn().mockResolvedValue({ id: 1, username: 'test' }),
    updateProfile: vi.fn().mockResolvedValue({ id: 1, username: 'test' }),
    changePassword: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/http', () => ({
  http: {
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
  },
}));

describe('useUserStore (Simplified)', () => {
  let store: any;

  beforeEach(async () => {
    // Dynamic import to avoid hoisting issues
    const { useUserStore } = await import('../userStore');
    store = useUserStore.getState();
    
    // Reset store
    store.logout();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', async () => {
      const { useUserStore } = await import('../userStore');
      const state = useUserStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('State Mutations', () => {
    it('should set user correctly', async () => {
      const { useUserStore } = await import('../userStore');
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

      const store = useUserStore.getState();
      store.setUser(mockUser);

      const newState = useUserStore.getState();
      expect(newState.user).toEqual(mockUser);
      expect(newState.isAuthenticated).toBe(true);
    });

    it('should set token correctly', async () => {
      const { useUserStore } = await import('../userStore');
      const mockToken = 'mock-jwt-token';

      const store = useUserStore.getState();
      store.setToken(mockToken);

      const newState = useUserStore.getState();
      expect(newState.token).toBe(mockToken);
      expect(newState.isAuthenticated).toBe(true);
    });

    it('should clear state on logout', async () => {
      const { useUserStore } = await import('../userStore');
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

      const store = useUserStore.getState();
      
      // Set user and token
      store.setUser(mockUser);
      store.setToken('mock-token');
      
      expect(useUserStore.getState().isAuthenticated).toBe(true);

      // Logout
      store.logout();

      const finalState = useUserStore.getState();
      expect(finalState.user).toBeNull();
      expect(finalState.token).toBeNull();
      expect(finalState.isAuthenticated).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should determine admin role correctly', async () => {
      const { useUserStore } = await import('../userStore');
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

      const store = useUserStore.getState();
      store.setUser(adminUser);

      expect(store.isAdmin()).toBe(true);
    });

    it('should check user role correctly', async () => {
      const { useUserStore } = await import('../userStore');
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

      const store = useUserStore.getState();
      store.setUser(regularUser);

      expect(store.hasRole('user')).toBe(true);
      expect(store.hasRole('admin')).toBe(false);
    });
  });
});
