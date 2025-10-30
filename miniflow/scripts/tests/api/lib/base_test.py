"""
基础测试类，提供通用的测试方法和工具函数
"""

import json
import os
import time
import requests
from typing import Dict, Any, Optional, Tuple
import pytest


class BaseAPITest:
    """API测试基类"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """测试前置条件"""
        # 加载配置
        self.config = self._load_config()
        self.base_url = self.config["api"]["base_url"]
        self.api_url = f"{self.base_url}/api/{self.config['api']['version']}"
        self.timeout = self.config["api"]["timeout"]
        
        # 创建会话
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'MiniFlow-API-Tester/1.0'
        })
        
        # 初始化变量
        self.token = None
        self.test_user_id = None
        self.test_process_id = None
        self.test_instance_id = None
        self.test_task_id = None
        
        # 加载测试数据
        self.test_data = self._load_test_data()
        
        yield
        
        # 测试后清理
        self._cleanup()
    
    def _load_config(self) -> Dict[str, Any]:
        """加载测试配置"""
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'test_config.json')
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _load_test_data(self) -> Dict[str, Any]:
        """加载测试数据"""
        data_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'test_data.json')
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _cleanup(self):
        """测试后清理"""
        # 关闭会话
        if hasattr(self, 'session'):
            self.session.close()
    
    def log(self, message: str, level: str = "info"):
        """打印日志"""
        colors = {
            "info": '\033[0;34m',
            "success": '\033[0;32m',
            "warning": '\033[1;33m',
            "error": '\033[0;31m',
            "debug": '\033[0;37m',
            "nc": '\033[0m'
        }
        
        color = colors.get(level, colors["nc"])
        print(f"{color}[{level.upper()}] {message}{colors['nc']}")
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None,
                    headers: Optional[Dict] = None, expected_status: int = 200,
                    auth_required: bool = False) -> Tuple[bool, Dict, int]:
        """
        发送HTTP请求
        
        Args:
            method: HTTP方法 (GET, POST, PUT, DELETE)
            endpoint: API端点
            data: 请求数据
            headers: 请求头
            expected_status: 期望的HTTP状态码
            auth_required: 是否需要认证
            
        Returns:
            Tuple[成功标志, 响应数据, HTTP状态码]
        """
        url = f"{self.api_url}{endpoint}"
        req_headers = {}
        
        # 添加认证头
        if auth_required and self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        
        # 合并自定义头
        if headers:
            req_headers.update(headers)
        
        try:
            self.log(f"发送 {method} 请求到 {url}", "debug")
            start_time = time.time()
            
            if method.upper() == 'GET':
                response = self.session.get(url, headers=req_headers, timeout=self.timeout)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=req_headers, timeout=self.timeout)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=req_headers, timeout=self.timeout)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=req_headers, timeout=self.timeout)
            else:
                self.log(f"不支持的HTTP方法: {method}", "error")
                return False, {}, 405
            
            response_time = (time.time() - start_time) * 1000  # 转换为毫秒
            self.log(f"响应时间: {response_time:.2f}ms, 状态码: {response.status_code}", "debug")
            
            # 尝试解析JSON响应
            try:
                response_data = response.json()
            except ValueError:
                response_data = {"raw_response": response.text}
            
            # 检查状态码
            success = response.status_code == expected_status
            if not success:
                self.log(f"请求失败: 期望状态码 {expected_status}, 实际 {response.status_code}", "warning")
                self.log(f"响应内容: {response_data}", "debug")
            
            return success, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            self.log(f"请求异常: {str(e)}", "error")
            return False, {"error": str(e)}, 0
    
    def login(self, user_type: str = "admin") -> bool:
        """
        用户登录获取token
        
        Args:
            user_type: 用户类型 (admin/user)
            
        Returns:
            登录是否成功
        """
        user_data = self.config["test_users"].get(user_type)
        if not user_data:
            self.log(f"未找到用户类型: {user_type}", "error")
            return False
        
        self.log(f"用户登录: {user_data['username']}", "info")
        success, response, status = self.make_request(
            'POST', '/auth/login', 
            data={
                "username": user_data["username"],
                "password": user_data["password"]
            }
        )
        
        if success and 'data' in response and 'token' in response['data']:
            self.token = response['data']['token']
            self.test_user_id = response['data']['user']['id']
            self.log(f"登录成功, 获取到token", "success")
            return True
        else:
            self.log(f"登录失败: {response}", "error")
            return False
    
    def register_user(self, username: str, password: str, email: str) -> bool:
        """
        注册新用户
        
        Args:
            username: 用户名
            password: 密码
            email: 邮箱
            
        Returns:
            注册是否成功
        """
        self.log(f"注册用户: {username}", "info")
        success, response, status = self.make_request(
            'POST', '/auth/register',
            data={
                "username": username,
                "password": password,
                "email": email
            }
        )
        
        if success and 'user' in response:
            self.test_user_id = response['user']['id']
            self.log(f"用户注册成功, ID: {self.test_user_id}", "success")
            return True
        else:
            self.log(f"用户注册失败: {response}", "error")
            return False
    
    def assert_valid_response(self, response: Dict, expected_fields: list = None):
        """
        验证响应格式
        
        Args:
            response: 响应数据
            expected_fields: 期望的字段列表
        """
        assert isinstance(response, dict), "响应应该是字典格式"
        
        if expected_fields:
            for field in expected_fields:
                assert field in response, f"响应中缺少字段: {field}"
    
    def assert_error_response(self, response: Dict, expected_error_code: str = None):
        """
        验证错误响应格式
        
        Args:
            response: 响应数据
            expected_error_code: 期望的错误代码
        """
        assert isinstance(response, dict), "错误响应应该是字典格式"
        assert 'error' in response or 'code' in response, "错误响应应包含error或code字段"
        
        if expected_error_code:
            error_code = response.get('code') or response.get('error')
            assert error_code == expected_error_code, f"期望错误代码 {expected_error_code}, 实际 {error_code}"
    
    def measure_response_time(self, func, *args, **kwargs) -> Tuple[Any, float]:
        """
        测量函数执行时间
        
        Args:
            func: 要测量的函数
            *args: 函数参数
            **kwargs: 函数关键字参数
            
        Returns:
            Tuple[函数结果, 执行时间(毫秒)]
        """
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        execution_time = (end_time - start_time) * 1000  # 转换为毫秒
        return result, execution_time
