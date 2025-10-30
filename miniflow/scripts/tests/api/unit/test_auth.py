"""
认证API测试
"""

import pytest
import random
import string
from lib.base_test import BaseAPITest


class TestAuth(BaseAPITest):
    """认证API测试类"""
    
    def test_user_registration_success(self):
        """测试用户注册成功"""
        self.log("测试用户注册成功", "info")
        
        # 生成随机用户名避免冲突
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        username = f"test_user_{random_suffix}"
        email = f"test_{random_suffix}@example.com"
        password = "testpass123"
        
        # 注册用户
        success, response, status = self.make_request(
            'POST', '/auth/register',
            data={
                "username": username,
                "password": password,
                "email": email
            },
            expected_status=201  # 注册成功返回201
        )
        
        assert success, f"用户注册失败: {response}"
        assert 'user' in response, "注册响应应包含用户信息"
        
        self.log("用户注册成功测试通过", "success")
    
    def test_user_registration_duplicate_username(self):
        """测试重复用户名注册"""
        self.log("测试重复用户名注册", "info")
        
        # 先注册一个用户
        username = "duplicate_test_user"
        email = "duplicate@example.com"
        password = "testpass123"
        
        # 确保用户存在
        self.register_user(username, password, email)
        
        # 尝试使用相同用户名再次注册
        success, response, status = self.make_request(
            'POST', '/auth/register',
            data={
                "username": username,
                "password": "anotherpass123",
                "email": "another@example.com"
            }
        )
        
        assert not success, "重复用户名注册应该失败"
        self.assert_error_response(response)
        
        self.log("重复用户名注册测试通过", "success")
    
    def test_user_registration_invalid_data(self):
        """测试无效数据注册"""
        self.log("测试无效数据注册", "info")
        
        # 测试无效数据
        invalid_users = self.test_data["invalid_data"]["users"]
        
        for i, user_data in enumerate(invalid_users):
            self.log(f"测试无效用户数据 {i+1}", "debug")
            
            success, response, status = self.make_request(
                'POST', '/auth/register',
                data=user_data,
                expected_status=400
            )
            
            # 注意：make_request函数在状态码匹配时返回success=True
            # 这里我们期望400，所以如果状态码是400，则测试通过
            assert status == 400, f"无效数据 {user_data} 应该返回400状态码"
        
        self.log("无效数据注册测试通过", "success")
    
    def test_user_login_success(self):
        """测试用户登录成功"""
        self.log("测试用户登录成功", "info")
        
        # 先注册一个用户
        username = "login_test_user"
        email = "login@example.com"
        password = "testpass123"
        
        self.register_user(username, password, email)
        
        # 尝试登录
        success = self.login("admin")  # 使用配置中的admin用户
        
        assert success, "用户登录应该成功"
        assert self.token is not None, "登录后应该获取到token"
        
        self.log("用户登录成功测试通过", "success")
    
    def test_user_login_invalid_credentials(self):
        """测试无效凭据登录"""
        self.log("测试无效凭据登录", "info")
        
        # 尝试使用无效凭据登录
        success, response, status = self.make_request(
            'POST', '/auth/login',
            data={
                "username": "nonexistent_user",
                "password": "wrong_password"
            },
            expected_status=401
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望401，所以如果状态码是401，则测试通过
        assert status == 401, "无效凭据登录应该返回401状态码"
        
        self.log("无效凭据登录测试通过", "success")
    
    def test_user_login_missing_fields(self):
        """测试缺少字段登录"""
        self.log("测试缺少字段登录", "info")
        
        # 测试缺少用户名
        success, response, status = self.make_request(
            'POST', '/auth/login',
            data={
                "password": "testpass123"
            },
            expected_status=400
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望400，所以如果状态码是400，则测试通过
        assert status == 400, "缺少用户名登录应该返回400状态码"
        
        # 测试缺少密码
        success, response, status = self.make_request(
            'POST', '/auth/login',
            data={
                "username": "testuser"
            },
            expected_status=400
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望400，所以如果状态码是400，则测试通过
        assert status == 400, "缺少密码登录应该返回400状态码"
        
        self.log("缺少字段登录测试通过", "success")
    
    def test_protected_endpoint_without_token(self):
        """测试无token访问受保护端点"""
        self.log("测试无token访问受保护端点", "info")
        
        # 尝试访问受保护的端点而不提供token
        success, response, status = self.make_request(
            'GET', '/user/profile',
            expected_status=401
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望401，所以如果状态码是401，则测试通过
        assert status == 401, "无token访问受保护端点应该返回401状态码"
        
        self.log("无token访问受保护端点测试通过", "success")
    
    def test_protected_endpoint_with_invalid_token(self):
        """测试无效token访问受保护端点"""
        self.log("测试无效token访问受保护端点", "info")
        
        # 尝试使用无效token访问受保护的端点
        headers = {"Authorization": "Bearer invalid_token"}
        success, response, status = self.make_request(
            'GET', '/user/profile',
            headers=headers,
            expected_status=401
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望401，所以如果状态码是401，则测试通过
        assert status == 401, "无效token访问受保护端点应该返回401状态码"
        
        self.log("无效token访问受保护端点测试通过", "success")
    
    def test_token_validation(self):
        """测试token验证"""
        self.log("测试token验证", "info")
        
        # 登录获取有效token
        assert self.login("admin"), "登录应该成功"
        
        # 使用有效token访问受保护端点
        success, response, status = self.make_request(
            'GET', '/user/profile',
            auth_required=True
        )
        
        assert success, "有效token应该允许访问受保护端点"
        # API返回的是data字段包含user信息，而不是直接返回user字段
        self.assert_valid_response(response, ['data'])
        
        # 检查响应中是否包含用户信息字段
        data = response.get('data', {})
        if isinstance(data, dict):
            # 如果data是字典，检查是否包含用户信息字段
            user_fields = ['id', 'username', 'email']
            for field in user_fields:
                assert field in data, f"响应数据中应包含用户信息字段: {field}"
        else:
            # 如果data不是字典，检查是否包含user字段
            assert 'user' in data, "响应数据中应包含用户信息"
        
        self.log("token验证测试通过", "success")
