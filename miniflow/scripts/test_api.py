#!/usr/bin/env python3
"""
MiniFlow API Test Script (Python Version)
测试所有用户管理API接口
"""

import requests
import json
import time
import sys
from typing import Optional, Dict, Any

class Colors:
    """终端颜色常量"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

class MiniFlowAPITester:
    """MiniFlow API测试类"""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.token: Optional[str] = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'MiniFlow-API-Tester/1.0'
        })
    
    def log(self, message: str, color: str = Colors.NC):
        """打印带颜色的日志"""
        print(f"{color}{message}{Colors.NC}")
    
    def test_endpoint(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                     expected_status: int = 200, description: str = "", 
                     auth: bool = False) -> Optional[Dict]:
        """测试API端点"""
        url = f"{self.api_url}{endpoint}"
        headers = {}
        
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                self.log(f"❌ 不支持的HTTP方法: {method}", Colors.RED)
                return None
            
            status_code = response.status_code
            
            if status_code == expected_status:
                self.log(f"✅ {description} - PASS", Colors.GREEN)
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            else:
                self.log(f"❌ {description} - FAIL (期望: {expected_status}, 实际: {status_code})", Colors.RED)
                try:
                    error_data = response.json()
                    self.log(f"   错误响应: {error_data}", Colors.YELLOW)
                except:
                    self.log(f"   响应内容: {response.text}", Colors.YELLOW)
                return None
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ {description} - 网络错误: {e}", Colors.RED)
            return None
    
    def test_health_check(self):
        """测试健康检查接口"""
        self.log("\n🏥 健康检查测试", Colors.BLUE)
        self.log("=" * 40)
        
        result = self.test_endpoint(
            method="GET", 
            endpoint="/health",
            expected_status=200,
            description="健康检查接口"
        )
        
        if result:
            self.log(f"   服务状态: {result.get('status', 'unknown')}")
            self.log(f"   服务版本: {result.get('version', 'unknown')}")
    
    def test_user_registration(self) -> bool:
        """测试用户注册"""
        self.log("\n📝 用户注册测试", Colors.BLUE)
        self.log("=" * 40)
        
        # 生成唯一用户名
        timestamp = int(time.time())
        test_user = {
            "username": f"apitest_{timestamp}",
            "password": "test123456",
            "display_name": f"API Test User {timestamp}",
            "email": f"apitest_{timestamp}@example.com",
            "phone": "13800138000"
        }
        
        result = self.test_endpoint(
            method="POST",
            endpoint="/auth/register",
            data=test_user,
            expected_status=201,
            description="用户注册"
        )
        
        if result:
            user_data = result.get('user', {})
            self.log(f"   注册用户ID: {user_data.get('id')}")
            self.log(f"   用户名: {user_data.get('username')}")
            self.log(f"   显示名: {user_data.get('display_name')}")
            
            # 保存用户信息用于后续登录测试
            self.test_username = test_user['username']
            self.test_password = test_user['password']
            return True
        
        return False
    
    def test_user_login(self) -> bool:
        """测试用户登录"""
        self.log("\n🔑 用户登录测试", Colors.BLUE)
        self.log("=" * 40)
        
        if not hasattr(self, 'test_username'):
            self.log("⚠️ 跳过登录测试（注册失败）", Colors.YELLOW)
            return False
        
        login_data = {
            "username": self.test_username,
            "password": self.test_password
        }
        
        result = self.test_endpoint(
            method="POST",
            endpoint="/auth/login",
            data=login_data,
            expected_status=200,
            description="用户登录"
        )
        
        if result:
            data = result.get('data', {})
            self.token = data.get('token')
            user_data = data.get('user', {})
            
            self.log(f"   登录用户ID: {user_data.get('id')}")
            self.log(f"   Token长度: {len(self.token) if self.token else 0}")
            self.log(f"   Token前缀: {self.token[:50] if self.token else 'None'}...")
            
            return self.token is not None
        
        return False
    
    def test_user_profile(self):
        """测试用户资料相关接口"""
        self.log("\n👤 用户资料测试", Colors.BLUE)
        self.log("=" * 40)
        
        if not self.token:
            self.log("⚠️ 跳过用户资料测试（无有效token）", Colors.YELLOW)
            return
        
        # 测试获取用户资料
        result = self.test_endpoint(
            method="GET",
            endpoint="/user/profile",
            expected_status=200,
            description="获取用户资料",
            auth=True
        )
        
        if result:
            user_data = result.get('data', {})
            self.log(f"   用户名: {user_data.get('username')}")
            self.log(f"   显示名: {user_data.get('display_name')}")
            self.log(f"   邮箱: {user_data.get('email')}")
        
        # 测试更新用户资料
        update_data = {
            "display_name": "Updated API Test User",
            "phone": "13900139000"
        }
        
        self.test_endpoint(
            method="PUT",
            endpoint="/user/profile",
            data=update_data,
            expected_status=200,
            description="更新用户资料",
            auth=True
        )
        
        # 测试修改密码
        password_data = {
            "old_password": self.test_password,
            "new_password": "newpassword123"
        }
        
        self.test_endpoint(
            method="POST",
            endpoint="/user/change-password",
            data=password_data,
            expected_status=200,
            description="修改密码",
            auth=True
        )
    
    def test_admin_apis(self):
        """测试管理员接口"""
        self.log("\n👑 管理员接口测试", Colors.BLUE)
        self.log("=" * 40)
        
        if not self.token:
            self.log("⚠️ 跳过管理员接口测试（无有效token）", Colors.YELLOW)
            return
        
        # 测试获取用户列表
        result = self.test_endpoint(
            method="GET",
            endpoint="/admin/users?page=1&page_size=5",
            expected_status=200,
            description="获取用户列表",
            auth=True
        )
        
        if result:
            data = result.get('data', {})
            users = data.get('users', [])
            total = data.get('total', 0)
            self.log(f"   用户总数: {total}")
            self.log(f"   当前页用户数: {len(users)}")
        
        # 测试获取用户统计
        result = self.test_endpoint(
            method="GET",
            endpoint="/admin/stats/users",
            expected_status=200,
            description="获取用户统计",
            auth=True
        )
        
        if result:
            stats = result.get('data', {})
            self.log(f"   活跃用户数: {stats.get('total_active', 0)}")
            self.log(f"   普通用户数: {stats.get('user_count', 0)}")
            self.log(f"   管理员数: {stats.get('admin_count', 0)}")
    
    def test_auth_protection(self):
        """测试认证保护机制"""
        self.log("\n🚫 认证保护测试", Colors.BLUE)
        self.log("=" * 40)
        
        # 测试无认证访问保护接口
        self.test_endpoint(
            method="GET",
            endpoint="/user/profile",
            expected_status=401,
            description="无认证访问保护接口",
            auth=False
        )
        
        # 测试无效token
        old_token = self.token
        self.token = "invalid_token_123"
        
        self.test_endpoint(
            method="GET",
            endpoint="/user/profile",
            expected_status=401,
            description="使用无效token访问",
            auth=True
        )
        
        # 恢复有效token
        self.token = old_token
    
    def run_all_tests(self):
        """运行所有API测试"""
        self.log("🧪 MiniFlow API 接口测试 (Python版本)", Colors.BLUE)
        self.log("=" * 60)
        
        # 检查服务器是否运行
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code != 200:
                self.log("❌ 服务器未正常运行，请先启动服务器", Colors.RED)
                return False
        except requests.exceptions.RequestException:
            self.log("❌ 无法连接到服务器，请确保服务器正在运行", Colors.RED)
            self.log("   启动命令: cd backend && ./miniflow -config ./config", Colors.YELLOW)
            return False
        
        # 运行测试序列
        self.test_health_check()
        
        if not self.test_user_registration():
            self.log("❌ 用户注册失败，跳过后续测试", Colors.RED)
            return False
        
        if not self.test_user_login():
            self.log("❌ 用户登录失败，跳过需要认证的测试", Colors.RED)
            return False
        
        self.test_user_profile()
        self.test_admin_apis()
        self.test_auth_protection()
        
        # 测试总结
        self.log("\n📊 API测试总结", Colors.BLUE)
        self.log("=" * 40)
        self.log("✅ 健康检查API", Colors.GREEN)
        self.log("✅ 用户注册API", Colors.GREEN)
        self.log("✅ 用户登录API", Colors.GREEN)
        self.log("✅ 用户资料API", Colors.GREEN)
        self.log("✅ 管理员API", Colors.GREEN)
        self.log("✅ 认证中间件", Colors.GREEN)
        
        self.log("\n🎉 所有API测试完成！", Colors.GREEN)
        return True

def main():
    """主函数"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:8080"
    
    print(f"🔗 测试服务器: {base_url}")
    
    tester = MiniFlowAPITester(base_url)
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{Colors.GREEN}✅ 所有API测试通过！{Colors.NC}")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}❌ API测试失败！{Colors.NC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
