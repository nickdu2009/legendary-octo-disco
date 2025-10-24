import { describe, it, expect } from 'vitest';
import { Validators } from '../validators';

describe('Validators', () => {
  describe('validateUsername', () => {
    it('should validate correct username', () => {
      const result = Validators.validateUsername('testuser123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty username', () => {
      const result = Validators.validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('用户名不能为空');
    });

    it('should reject username too short', () => {
      const result = Validators.validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('用户名至少需要3个字符');
    });

    it('should reject username too long', () => {
      const longUsername = 'a'.repeat(51);
      const result = Validators.validateUsername(longUsername);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('用户名不能超过50个字符');
    });

    it('should reject username with invalid characters', () => {
      const result = Validators.validateUsername('test-user@123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('用户名只能包含字母、数字和下划线');
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', () => {
      const result = Validators.validatePassword('password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty password', () => {
      const result = Validators.validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码不能为空');
    });

    it('should reject password too short', () => {
      const result = Validators.validatePassword('12345');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码至少需要6个字符');
    });

    it('should reject password too long', () => {
      const longPassword = 'a'.repeat(129);
      const result = Validators.validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码不能超过128个字符');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = Validators.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow empty email', () => {
      const result = Validators.validateEmail('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const result = Validators.validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('请输入有效的邮箱地址');
    });

    it('should reject email without domain', () => {
      const result = Validators.validateEmail('test@');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('请输入有效的邮箱地址');
    });
  });

  describe('validatePhone', () => {
    it('should validate correct Chinese phone number', () => {
      const result = Validators.validatePhone('13800138000');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow empty phone', () => {
      const result = Validators.validatePhone('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid phone format', () => {
      const result = Validators.validatePhone('12345678901');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('请输入有效的手机号码');
    });

    it('should reject phone with wrong length', () => {
      const result = Validators.validatePhone('138001380');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('请输入有效的手机号码');
    });
  });

  describe('validateConfirmPassword', () => {
    it('should validate matching passwords', () => {
      const result = Validators.validateConfirmPassword('password123', 'password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-matching passwords', () => {
      const result = Validators.validateConfirmPassword('password123', 'different456');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('两次输入的密码不一致');
    });
  });

  describe('validateForm', () => {
    it('should validate entire form correctly', () => {
      const fields = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      };

      const rules = {
        username: Validators.validateUsername,
        password: Validators.validatePassword,
        email: Validators.validateEmail,
      };

      const result = Validators.validateForm(fields, rules);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should collect all field errors', () => {
      const fields = {
        username: 'ab', // too short
        password: '123', // too short
        email: 'invalid-email', // invalid format
      };

      const rules = {
        username: Validators.validateUsername,
        password: Validators.validatePassword,
        email: Validators.validateEmail,
      };

      const result = Validators.validateForm(fields, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors.username).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.email).toBeDefined();
    });
  });
});
