import { describe, it, expect } from 'vitest';
import { Formatters } from '../formatters';

describe('Formatters', () => {
  describe('formatUserRole', () => {
    it('should format known roles correctly', () => {
      expect(Formatters.formatUserRole('admin')).toBe('管理员');
      expect(Formatters.formatUserRole('user')).toBe('普通用户');
      expect(Formatters.formatUserRole('moderator')).toBe('版主');
    });

    it('should return original role for unknown roles', () => {
      expect(Formatters.formatUserRole('unknown')).toBe('unknown');
    });
  });

  describe('formatUserStatus', () => {
    it('should format known status correctly', () => {
      expect(Formatters.formatUserStatus('active')).toBe('活跃');
      expect(Formatters.formatUserStatus('inactive')).toBe('非活跃');
      expect(Formatters.formatUserStatus('suspended')).toBe('已暂停');
      expect(Formatters.formatUserStatus('banned')).toBe('已封禁');
    });

    it('should return original status for unknown status', () => {
      expect(Formatters.formatUserStatus('unknown')).toBe('unknown');
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(Formatters.formatFileSize(0)).toBe('0 B');
      expect(Formatters.formatFileSize(1024)).toBe('1 KB');
      expect(Formatters.formatFileSize(1048576)).toBe('1 MB');
      expect(Formatters.formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal places correctly', () => {
      expect(Formatters.formatFileSize(1536)).toBe('1.5 KB');
      expect(Formatters.formatFileSize(1572864)).toBe('1.5 MB');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with Chinese locale', () => {
      expect(Formatters.formatNumber(1000)).toBe('1,000');
      expect(Formatters.formatNumber(1000000)).toBe('1,000,000');
    });
  });

  describe('formatPercentage', () => {
    it('should calculate and format percentage correctly', () => {
      expect(Formatters.formatPercentage(25, 100)).toBe('25.0%');
      expect(Formatters.formatPercentage(33, 100)).toBe('33.0%');
      expect(Formatters.formatPercentage(1, 3)).toBe('33.3%');
    });

    it('should handle zero total correctly', () => {
      expect(Formatters.formatPercentage(5, 0)).toBe('0%');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text correctly', () => {
      const longText = 'a'.repeat(150);
      const result = Formatters.truncateText(longText, 100);
      expect(result).toBe('a'.repeat(100) + '...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      const result = Formatters.truncateText(shortText, 100);
      expect(result).toBe(shortText);
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter correctly', () => {
      expect(Formatters.capitalizeFirst('hello')).toBe('Hello');
      expect(Formatters.capitalizeFirst('HELLO')).toBe('HELLO');
    });

    it('should handle empty string', () => {
      expect(Formatters.capitalizeFirst('')).toBe('');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format Chinese phone number correctly', () => {
      expect(Formatters.formatPhoneNumber('13800138000')).toBe('138-0013-8000');
    });

    it('should handle phone with non-numeric characters', () => {
      expect(Formatters.formatPhoneNumber('138-0013-8000')).toBe('138-0013-8000');
    });

    it('should return original for invalid length', () => {
      expect(Formatters.formatPhoneNumber('1234567890')).toBe('1234567890');
    });

    it('should handle empty phone', () => {
      expect(Formatters.formatPhoneNumber('')).toBe('');
    });
  });

  describe('getAvatarFallback', () => {
    it('should return first character of display name', () => {
      expect(Formatters.getAvatarFallback('张三', 'zhangsan')).toBe('张');
    });

    it('should fallback to username if no display name', () => {
      expect(Formatters.getAvatarFallback('', 'testuser')).toBe('T');
    });

    it('should return question mark for empty names', () => {
      expect(Formatters.getAvatarFallback('', '')).toBe('?');
    });
  });

  describe('ensureHttpProtocol', () => {
    it('should add https to URL without protocol', () => {
      expect(Formatters.ensureHttpProtocol('example.com')).toBe('https://example.com');
    });

    it('should not modify URL with protocol', () => {
      expect(Formatters.ensureHttpProtocol('http://example.com')).toBe('http://example.com');
      expect(Formatters.ensureHttpProtocol('https://example.com')).toBe('https://example.com');
    });

    it('should handle empty URL', () => {
      expect(Formatters.ensureHttpProtocol('')).toBe('');
    });
  });
});
