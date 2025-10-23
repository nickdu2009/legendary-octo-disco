import { VALIDATION_RULES } from '../constants';

// Validation utility functions

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class Validators {
  // Username validation
  static validateUsername(username: string): ValidationResult {
    const errors: string[] = [];
    
    if (!username) {
      errors.push('用户名不能为空');
    } else {
      if (username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
        errors.push(`用户名至少需要${VALIDATION_RULES.USERNAME.MIN_LENGTH}个字符`);
      }
      
      if (username.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
        errors.push(`用户名不能超过${VALIDATION_RULES.USERNAME.MAX_LENGTH}个字符`);
      }
      
      if (!VALIDATION_RULES.USERNAME.PATTERN.test(username)) {
        errors.push('用户名只能包含字母、数字和下划线');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Password validation
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('密码不能为空');
    } else {
      if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
        errors.push(`密码至少需要${VALIDATION_RULES.PASSWORD.MIN_LENGTH}个字符`);
      }
      
      if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
        errors.push(`密码不能超过${VALIDATION_RULES.PASSWORD.MAX_LENGTH}个字符`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Email validation
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (email && !VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
      errors.push('请输入有效的邮箱地址');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Phone validation
  static validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];
    
    if (phone && !VALIDATION_RULES.PHONE.PATTERN.test(phone)) {
      errors.push('请输入有效的手机号码');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Confirm password validation
  static validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
    const errors: string[] = [];
    
    if (password !== confirmPassword) {
      errors.push('两次输入的密码不一致');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Form validation helper
  static validateForm(fields: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): {
    isValid: boolean;
    errors: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};
    let isValid = true;

    for (const [fieldName, value] of Object.entries(fields)) {
      const validator = rules[fieldName];
      if (validator) {
        const result = validator(value);
        if (!result.isValid) {
          errors[fieldName] = result.errors;
          isValid = false;
        }
      }
    }

    return { isValid, errors };
  }
}

// Ant Design form rules
export const getAntdRules = {
  username: () => [
    { required: true, message: '请输入用户名' },
    { 
      min: VALIDATION_RULES.USERNAME.MIN_LENGTH, 
      message: `用户名至少${VALIDATION_RULES.USERNAME.MIN_LENGTH}个字符` 
    },
    { 
      max: VALIDATION_RULES.USERNAME.MAX_LENGTH, 
      message: `用户名不能超过${VALIDATION_RULES.USERNAME.MAX_LENGTH}个字符` 
    },
    { 
      pattern: VALIDATION_RULES.USERNAME.PATTERN, 
      message: '用户名只能包含字母、数字和下划线' 
    },
  ],

  password: () => [
    { required: true, message: '请输入密码' },
    { 
      min: VALIDATION_RULES.PASSWORD.MIN_LENGTH, 
      message: `密码至少${VALIDATION_RULES.PASSWORD.MIN_LENGTH}个字符` 
    },
  ],

  email: (required = false) => [
    ...(required ? [{ required: true, message: '请输入邮箱地址' }] : []),
    { type: 'email' as const, message: '请输入有效的邮箱地址' },
  ],

  phone: () => [
    { 
      pattern: VALIDATION_RULES.PHONE.PATTERN, 
      message: '请输入有效的手机号码' 
    },
  ],

  confirmPassword: () => [
    { required: true, message: '请确认密码' },
    ({ getFieldValue }: any) => ({
      validator(_: any, value: string) {
        if (!value || getFieldValue('password') === value) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('两次输入的密码不一致'));
      },
    }),
  ],
};
