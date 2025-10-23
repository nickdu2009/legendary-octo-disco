// Application constants

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'miniflow_token',
  USER_DATA: 'miniflow_user',
  THEME: 'miniflow_theme',
  LANGUAGE: 'miniflow_language',
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// User status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  USER: {
    PROFILE: '/user/profile',
    CHANGE_PASSWORD: '/user/change-password',
  },
  ADMIN: {
    USERS: '/admin/users',
    USER_STATS: '/admin/stats/users',
  },
} as const;

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  PROCESS: '/process',
  TASKS: '/tasks',
  ADMIN: {
    USERS: '/admin/users',
    STATS: '/admin/stats',
  },
} as const;

// Form validation rules
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^1[3-9]\d{9}$/,
  },
} as const;

// UI constants
export const UI_CONFIG = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  },
  DEBOUNCE: {
    SEARCH_DELAY: 300,
    SAVE_DELAY: 1000,
  },
  ANIMATION: {
    DURATION: 300,
    EASING: 'ease-in-out',
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  SERVER_ERROR: '服务器错误，请稍后重试',
  UNAUTHORIZED: '未授权访问，请重新登录',
  FORBIDDEN: '权限不足，无法访问此资源',
  NOT_FOUND: '请求的资源不存在',
  VALIDATION_ERROR: '输入数据验证失败',
  UNKNOWN_ERROR: '未知错误，请联系管理员',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '登录成功',
  REGISTER_SUCCESS: '注册成功',
  LOGOUT_SUCCESS: '退出成功',
  PROFILE_UPDATE_SUCCESS: '资料更新成功',
  PASSWORD_CHANGE_SUCCESS: '密码修改成功',
  OPERATION_SUCCESS: '操作成功',
} as const;
