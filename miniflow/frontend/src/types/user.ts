// User related TypeScript types

export interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  avatar: string;
  last_login_at: string | null;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  display_name?: string;
  email?: string;
  phone?: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// API Response types
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
  code?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserStats {
  total_active: number;
  admin_count: number;
  user_count: number;
}

// Form validation types
export interface FormErrors {
  [key: string]: string[];
}

// Auth context types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Route types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}
