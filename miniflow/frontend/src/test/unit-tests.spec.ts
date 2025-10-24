import { describe, it, expect } from 'vitest';
import { Validators } from '../utils/validators';
import { Formatters } from '../utils/formatters';

// Unit tests for Day 4 core functionality
describe('MiniFlow Frontend Core Functions', () => {
  
  describe('Validators', () => {
    describe('Username Validation', () => {
      it('should validate correct usernames', () => {
        expect(Validators.validateUsername('testuser123').isValid).toBe(true);
        expect(Validators.validateUsername('user_name').isValid).toBe(true);
        expect(Validators.validateUsername('abc').isValid).toBe(true);
      });

      it('should reject invalid usernames', () => {
        expect(Validators.validateUsername('').isValid).toBe(false);
        expect(Validators.validateUsername('ab').isValid).toBe(false);
        expect(Validators.validateUsername('test-user').isValid).toBe(false);
        expect(Validators.validateUsername('test@user').isValid).toBe(false);
      });
    });

    describe('Password Validation', () => {
      it('should validate correct passwords', () => {
        expect(Validators.validatePassword('password123').isValid).toBe(true);
        expect(Validators.validatePassword('123456').isValid).toBe(true);
      });

      it('should reject invalid passwords', () => {
        expect(Validators.validatePassword('').isValid).toBe(false);
        expect(Validators.validatePassword('12345').isValid).toBe(false);
      });
    });

    describe('Email Validation', () => {
      it('should validate correct emails', () => {
        expect(Validators.validateEmail('test@example.com').isValid).toBe(true);
        expect(Validators.validateEmail('user.name@domain.co.uk').isValid).toBe(true);
        expect(Validators.validateEmail('').isValid).toBe(true); // Empty is allowed
      });

      it('should reject invalid emails', () => {
        expect(Validators.validateEmail('invalid-email').isValid).toBe(false);
        expect(Validators.validateEmail('test@').isValid).toBe(false);
        expect(Validators.validateEmail('@example.com').isValid).toBe(false);
      });
    });

    describe('Phone Validation', () => {
      it('should validate correct Chinese phone numbers', () => {
        expect(Validators.validatePhone('13800138000').isValid).toBe(true);
        expect(Validators.validatePhone('15912345678').isValid).toBe(true);
        expect(Validators.validatePhone('').isValid).toBe(true); // Empty is allowed
      });

      it('should reject invalid phone numbers', () => {
        expect(Validators.validatePhone('12345678901').isValid).toBe(false);
        expect(Validators.validatePhone('1234567890').isValid).toBe(false);
        expect(Validators.validatePhone('abcdefghijk').isValid).toBe(false);
      });
    });
  });

  describe('Formatters', () => {
    describe('User Role Formatting', () => {
      it('should format user roles correctly', () => {
        expect(Formatters.formatUserRole('admin')).toBe('管理员');
        expect(Formatters.formatUserRole('user')).toBe('普通用户');
        expect(Formatters.formatUserRole('unknown')).toBe('unknown');
      });
    });

    describe('User Status Formatting', () => {
      it('should format user status correctly', () => {
        expect(Formatters.formatUserStatus('active')).toBe('活跃');
        expect(Formatters.formatUserStatus('inactive')).toBe('非活跃');
        expect(Formatters.formatUserStatus('suspended')).toBe('已暂停');
      });
    });

    describe('File Size Formatting', () => {
      it('should format file sizes correctly', () => {
        expect(Formatters.formatFileSize(0)).toBe('0 B');
        expect(Formatters.formatFileSize(1024)).toBe('1 KB');
        expect(Formatters.formatFileSize(1048576)).toBe('1 MB');
        expect(Formatters.formatFileSize(1536)).toBe('1.5 KB');
      });
    });

    describe('Number Formatting', () => {
      it('should format numbers with locale', () => {
        expect(Formatters.formatNumber(1000)).toBe('1,000');
        expect(Formatters.formatNumber(1000000)).toBe('1,000,000');
      });
    });

    describe('Percentage Formatting', () => {
      it('should calculate percentages correctly', () => {
        expect(Formatters.formatPercentage(25, 100)).toBe('25.0%');
        expect(Formatters.formatPercentage(1, 3)).toBe('33.3%');
        expect(Formatters.formatPercentage(5, 0)).toBe('0%');
      });
    });

    describe('Text Formatting', () => {
      it('should truncate text correctly', () => {
        const longText = 'a'.repeat(150);
        expect(Formatters.truncateText(longText, 100)).toBe('a'.repeat(100) + '...');
        expect(Formatters.truncateText('short', 100)).toBe('short');
      });

      it('should capitalize first letter', () => {
        expect(Formatters.capitalizeFirst('hello')).toBe('Hello');
        expect(Formatters.capitalizeFirst('')).toBe('');
      });
    });

    describe('Phone Number Formatting', () => {
      it('should format Chinese phone numbers', () => {
        expect(Formatters.formatPhoneNumber('13800138000')).toBe('138-0013-8000');
        expect(Formatters.formatPhoneNumber('')).toBe('');
      });
    });

    describe('Avatar Fallback', () => {
      it('should generate avatar fallback correctly', () => {
        expect(Formatters.getAvatarFallback('张三', 'zhangsan')).toBe('张');
        expect(Formatters.getAvatarFallback('', 'testuser')).toBe('T');
        expect(Formatters.getAvatarFallback('', '')).toBe('?');
      });
    });

    describe('URL Formatting', () => {
      it('should ensure HTTP protocol', () => {
        expect(Formatters.ensureHttpProtocol('example.com')).toBe('https://example.com');
        expect(Formatters.ensureHttpProtocol('http://example.com')).toBe('http://example.com');
        expect(Formatters.ensureHttpProtocol('')).toBe('');
      });
    });
  });

  describe('Constants and Types', () => {
    it('should have proper validation rules', async () => {
      const { VALIDATION_RULES } = await import('../constants');
      
      expect(VALIDATION_RULES.USERNAME.MIN_LENGTH).toBe(3);
      expect(VALIDATION_RULES.PASSWORD.MIN_LENGTH).toBe(6);
      expect(VALIDATION_RULES.USERNAME.PATTERN).toBeInstanceOf(RegExp);
      expect(VALIDATION_RULES.EMAIL.PATTERN).toBeInstanceOf(RegExp);
    });

    it('should have proper route constants', async () => {
      const { ROUTES } = await import('../constants');
      
      expect(ROUTES.LOGIN).toBe('/login');
      expect(ROUTES.DASHBOARD).toBe('/dashboard');
      expect(ROUTES.ADMIN.USERS).toBe('/admin/users');
    });

    it('should have proper storage keys', async () => {
      const { STORAGE_KEYS } = await import('../constants');
      
      expect(STORAGE_KEYS.AUTH_TOKEN).toBe('miniflow_token');
      expect(STORAGE_KEYS.USER_DATA).toBe('miniflow_user');
    });
  });

  describe('Type Definitions', () => {
    it('should have proper TypeScript interfaces', () => {
      // These tests verify that our types compile correctly
      const mockUser: import('../types/user').User = {
        id: 1,
        username: 'test',
        display_name: 'Test User',
        email: 'test@example.com',
        phone: '',
        role: 'user',
        status: 'active',
        avatar: '',
        last_login_at: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(mockUser.id).toBe(1);
      expect(mockUser.username).toBe('test');
    });

    it('should have proper API request types', () => {
      const mockLoginRequest: import('../types/user').LoginRequest = {
        username: 'test',
        password: 'password123',
      };

      const mockRegisterRequest: import('../types/user').RegisterRequest = {
        username: 'newuser',
        password: 'password123',
        display_name: 'New User',
        email: 'new@example.com',
      };

      expect(mockLoginRequest.username).toBe('test');
      expect(mockRegisterRequest.display_name).toBe('New User');
    });
  });
});
