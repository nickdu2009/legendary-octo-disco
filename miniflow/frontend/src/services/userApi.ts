import { http } from '../utils/http';
import type { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  UpdateProfileRequest, 
  ChangePasswordRequest,
  LoginResponse,
  UserListResponse,
  UserStats 
} from '../types/user';
import type { PaginationParams } from '../types/api';

export const userApi = {
  // Authentication
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await http.post<LoginResponse>('/auth/login', data);
    if ('error' in response.data) {
      throw new Error(response.data.error);
    }
    return response.data.data!;
  },

  async register(data: RegisterRequest): Promise<User> {
    const response = await http.post<User>('/auth/register', data);
    if ('error' in response.data) {
      throw new Error(response.data.error);
    }
    return response.data.data!;
  },

  // User profile
  async getProfile(): Promise<User> {
    const response = await http.get<User>('/user/profile');
    if ('error' in response.data) {
      throw new Error(response.data.error);
    }
    return response.data.data!;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await http.put<User>('/user/profile', data);
    if ('error' in response.data) {
      throw new Error(response.data.error);
    }
    return response.data.data!;
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await http.post('/user/change-password', data);
    if ('error' in response.data) {
      throw new Error(response.data.error);
    }
  },

  // Admin APIs
  async getUsers(params?: PaginationParams): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = `/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await http.get<UserListResponse>(url);
    if ('error' in response.data) {
      throw new Error(response.data.error);
    }
    return response.data.data!;
  },

  async deactivateUser(userId: number): Promise<void> {
    const response = await http.post(`/admin/users/${userId}/deactivate`);
    if ('error' in response.data) {
      throw new Error(response.data.error);
    }
  },

  async getUserStats(): Promise<UserStats> {
    const response = await http.get<UserStats>('/admin/stats/users');
    if ('error' in response.data) {
      throw new Error(response.data.error);
    }
    return response.data.data!;
  },
};

// Export individual API functions for tree shaking
export const {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  deactivateUser,
  getUserStats,
} = userApi;
