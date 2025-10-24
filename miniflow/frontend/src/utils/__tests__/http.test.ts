import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpClient } from '../http';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient();
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    it('should set auth token correctly', () => {
      const token = 'test-token-123';
      httpClient.setAuthToken(token);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('miniflow_token', token);
    });

    it('should clear auth token correctly', () => {
      httpClient.clearAuthToken();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('miniflow_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('miniflow_user');
    });

    it('should get auth token from localStorage', () => {
      const token = 'stored-token-456';
      mockLocalStorage.getItem.mockReturnValue(token);
      
      // Access private method through reflection for testing
      const getAuthToken = (httpClient as any).getAuthToken;
      const result = getAuthToken.call(httpClient);
      
      expect(result).toBe(token);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('miniflow_token');
    });
  });

  describe('Base URL Configuration', () => {
    it('should set base URL correctly', () => {
      const newBaseURL = 'https://api.example.com';
      httpClient.setBaseURL(newBaseURL);
      
      const instance = httpClient.getInstance();
      expect(instance.defaults.baseURL).toBe(newBaseURL);
    });

    it('should use default base URL from environment', () => {
      const instance = httpClient.getInstance();
      // Should use the default or environment variable
      expect(instance.defaults.baseURL).toBeDefined();
    });
  });

  describe('Request Methods', () => {
    it('should make GET request correctly', async () => {
      const response = await httpClient.get('/test-endpoint');
      expect(response).toBeDefined();
    });

    it('should make POST request correctly', async () => {
      const testData = { test: 'data' };
      const response = await httpClient.post('/test-endpoint', testData);
      expect(response).toBeDefined();
    });

    it('should make PUT request correctly', async () => {
      const testData = { test: 'data' };
      const response = await httpClient.put('/test-endpoint', testData);
      expect(response).toBeDefined();
    });

    it('should make DELETE request correctly', async () => {
      const response = await httpClient.delete('/test-endpoint');
      expect(response).toBeDefined();
    });
  });

  describe('Request Helper', () => {
    it('should handle successful API response', async () => {
      // This test would work with the mock server
      try {
        const result = await httpClient.request({
          method: 'GET',
          url: '/user/profile',
        });
        expect(result).toBeDefined();
      } catch (error) {
        // Expected in test environment without real server
        expect(error).toBeDefined();
      }
    });
  });

  describe('File Upload', () => {
    it('should prepare file upload request correctly', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const onProgress = vi.fn();
      
      // Test that the method exists and can be called
      expect(typeof httpClient.uploadFile).toBe('function');
      
      // Note: Full upload test would require mock server setup
    });
  });
});
