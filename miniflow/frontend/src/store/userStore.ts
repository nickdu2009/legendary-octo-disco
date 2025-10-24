import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest, UpdateProfileRequest, ChangePasswordRequest, AuthState } from '../types/user';
import { userApi } from '../services/userApi';
import { http } from '../utils/http';

interface UserStore extends AuthState {
  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // State setters
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Computed properties
  isAdmin: () => boolean;
  hasRole: (role: string) => boolean;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (data: LoginRequest) => {
        set({ isLoading: true });
        
        try {
          const response = await userApi.login(data);
          const { user, token } = response;
          
          // Set auth token in HTTP client
          http.setAuthToken(token);
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          console.log('User logged in successfully:', user.username);
        } catch (error) {
          set({ isLoading: false });
          console.error('Login failed:', error);
          throw error;
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true });
        
        try {
          await userApi.register(data);
          set({ isLoading: false });
          console.log('User registered successfully:', data.username);
        } catch (error) {
          set({ isLoading: false });
          console.error('Registration failed:', error);
          throw error;
        }
      },

      logout: () => {
        // Clear auth token
        http.clearAuthToken();
        
        // Reset state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        console.log('User logged out');
      },

      updateProfile: async (data: UpdateProfileRequest) => {
        set({ isLoading: true });
        
        try {
          const updatedUser = await userApi.updateProfile(data);
          
          set({
            user: updatedUser,
            isLoading: false,
          });
          
          console.log('Profile updated successfully');
        } catch (error) {
          set({ isLoading: false });
          console.error('Profile update failed:', error);
          throw error;
        }
      },

      changePassword: async (data: ChangePasswordRequest) => {
        set({ isLoading: true });
        
        try {
          await userApi.changePassword(data);
          set({ isLoading: false });
          console.log('Password changed successfully');
        } catch (error) {
          set({ isLoading: false });
          console.error('Password change failed:', error);
          throw error;
        }
      },

      refreshProfile: async () => {
        const { token } = get();
        if (!token) {
          return;
        }

        set({ isLoading: true });
        
        try {
          const user = await userApi.getProfile();
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to refresh profile:', error);
          // If refresh fails, logout user
          get().logout();
        }
      },

      // State setters
      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },

      setToken: (token: string | null) => {
        if (token) {
          http.setAuthToken(token);
        } else {
          http.clearAuthToken();
        }
        
        set({ 
          token,
          isAuthenticated: !!token 
        });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      // Computed properties
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      hasRole: (role: string) => {
        const { user } = get();
        return user?.role === role;
      },
    }),
    {
      name: 'miniflow-auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore auth token to HTTP client after hydration
        if (state?.token) {
          http.setAuthToken(state.token);
        }
      },
    }
  )
);

// Selectors for better performance - use individual selectors to avoid object creation
export const useAuth = () => {
  const user = useUserStore(state => state.user);
  const token = useUserStore(state => state.token);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const isLoading = useUserStore(state => state.isLoading);
  
  return { user, token, isAuthenticated, isLoading };
};

export const useAuthActions = () => {
  const login = useUserStore(state => state.login);
  const register = useUserStore(state => state.register);
  const logout = useUserStore(state => state.logout);
  const updateProfile = useUserStore(state => state.updateProfile);
  const changePassword = useUserStore(state => state.changePassword);
  const refreshProfile = useUserStore(state => state.refreshProfile);
  
  return { login, register, logout, updateProfile, changePassword, refreshProfile };
};

export const useUserInfo = () => {
  const user = useUserStore(state => state.user);
  const isAdmin = useUserStore(state => state.isAdmin);
  const hasRole = useUserStore(state => state.hasRole);
  
  return { user, isAdmin, hasRole };
};
