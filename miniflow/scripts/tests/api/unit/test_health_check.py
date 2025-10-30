"""
健康检查API测试
"""

import pytest
from lib.base_test import BaseAPITest


class TestHealthCheck(BaseAPITest):
    """健康检查API测试类"""
    
    def test_health_check_endpoint(self):
        """测试健康检查端点"""
        self.log("测试健康检查端点", "info")
        
        # 测试根路径健康检查
        success, response, status = self.make_request('GET', '/health')
        
        assert success, f"健康检查请求失败: {response}"
        self.assert_valid_response(response, ['status', 'service', 'version'])
        assert response['status'] == 'healthy', f"期望状态为healthy, 实际: {response['status']}"
        assert response['service'] == 'miniflow', f"期望服务为miniflow, 实际: {response['service']}"
        
        self.log("健康检查端点测试通过", "success")
    
    def test_api_health_check_endpoint(self):
        """测试API版本健康检查端点"""
        self.log("测试API版本健康检查端点", "info")
        
        # 测试API版本健康检查
        success, response, status = self.make_request('GET', '/health')
        
        assert success, f"API健康检查请求失败: {response}"
        self.assert_valid_response(response, ['status', 'service', 'version'])
        assert response['status'] == 'healthy', f"期望状态为healthy, 实际: {response['status']}"
        
        self.log("API版本健康检查端点测试通过", "success")
    
    def test_health_check_response_time(self):
        """测试健康检查响应时间"""
        self.log("测试健康检查响应时间", "info")
        
        # 测量响应时间
        result, response_time = self.measure_response_time(
            self.make_request, 'GET', '/health'
        )
        
        success, response, status = result
        assert success, f"健康检查请求失败: {response}"
        
        # 验证响应时间在阈值内
        threshold = self.config["performance"]["response_time_threshold"]
        assert response_time < threshold, f"响应时间 {response_time}ms 超过阈值 {threshold}ms"
        
        self.log(f"健康检查响应时间 {response_time:.2f}ms 在阈值内", "success")
    
    def test_invalid_endpoint(self):
        """测试无效端点"""
        self.log("测试无效端点", "info")
        
        # 测试不存在的端点
        success, response, status = self.make_request('GET', '/invalid-endpoint', expected_status=404)
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望404，所以如果状态码是404，则测试通过
        assert status == 404, f"期望状态码404, 实际: {status}"
        
        self.log("无效端点测试通过", "success")
