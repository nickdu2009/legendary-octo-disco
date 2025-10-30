"""
用户管理API测试
"""

import pytest
import random
import string
from lib.base_test import BaseAPITest


class TestUser(BaseAPITest):
    """用户管理API测试类"""
    
    @pytest.fixture(autouse=True)
    def user_setup(self):
        """用户测试前置条件"""
        # 登录获取token
        assert self.login("admin"), "登录应该成功"
        yield
    
    def test_get_user_profile(self):
        """测试获取用户资料"""
        self.log("测试获取用户资料", "info")
        
        # 获取用户资料
        success, response, status = self.make_request(
            'GET', '/user/profile',
            auth_required=True
        )
        
        assert success, f"获取用户资料失败: {response}"
        # API返回的是data字段包含user信息，而不是直接返回user字段
        self.assert_valid_response(response, ['data'])
        
        user = response['data']
        assert 'id' in user, "用户资料应包含ID"
        assert 'username' in user, "用户资料应包含用户名"
        assert 'email' in user, "用户资料应包含邮箱"
        
        self.log("获取用户资料测试通过", "success")
    
    def test_update_user_profile(self):
        """测试更新用户资料"""
        self.log("测试更新用户资料", "info")
        
        # 准备更新数据
        update_data = {
            "display_name": "测试用户",
            "email": "updated@example.com",
            "phone": "1234567890"
        }
        
        # 更新用户资料
        success, response, status = self.make_request(
            'PUT', '/user/profile',
            data=update_data,
            auth_required=True
        )
        
        assert success, f"更新用户资料失败: {response}"
        # API返回的是data字段包含user信息，而不是直接返回user字段
        self.assert_valid_response(response, ['data'])
        
        user = response['data']
        assert user['display_name'] == update_data['display_name'], "显示名称未更新"
        assert user['email'] == update_data['email'], "邮箱未更新"
        assert user['phone'] == update_data['phone'], "电话未更新"
        
        self.log("更新用户资料测试通过", "success")
    
    def test_change_password(self):
        """测试修改密码"""
        self.log("测试修改密码", "info")
        
        # 生成新密码
        new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        
        # 修改密码
        success, response, status = self.make_request(
            'POST', '/user/change-password',
            data={
                "old_password": self.config["test_users"]["admin"]["password"],
                "new_password": new_password
            },
            auth_required=True
        )
        
        assert success, f"修改密码失败: {response}"
        
        # 使用新密码登录验证
        success, response, status = self.make_request(
            'POST', '/auth/login',
            data={
                "username": self.config["test_users"]["admin"]["username"],
                "password": new_password
            }
        )
        
        assert success, "新密码登录应该成功"
        
        # 恢复原密码以便其他测试
        success, response, status = self.make_request(
            'POST', '/user/change-password',
            data={
                "old_password": new_password,
                "new_password": self.config["test_users"]["admin"]["password"]
            },
            auth_required=True
        )
        
        assert success, "恢复原密码应该成功"
        
        self.log("修改密码测试通过", "success")
    
    def test_change_password_wrong_old_password(self):
        """测试使用错误旧密码修改密码"""
        self.log("测试使用错误旧密码修改密码", "info")
        
        # 使用错误的旧密码尝试修改密码
        success, response, status = self.make_request(
            'POST', '/user/change-password',
            data={
                "old_password": "wrong_password",
                "new_password": "new_password123"
            },
            auth_required=True,
            expected_status=400
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望400，所以如果状态码是400，则测试通过
        assert status == 400, "使用错误旧密码修改密码应该返回400状态码"
        
        self.log("使用错误旧密码修改密码测试通过", "success")
    
    def test_get_user_tasks(self):
        """测试获取用户任务列表"""
        self.log("测试获取用户任务列表", "info")
        
        # 获取用户任务列表
        success, response, status = self.make_request(
            'GET', '/user/tasks',
            auth_required=True
        )
        
        assert success, f"获取用户任务列表失败: {response}"
        # API返回的是data字段包含tasks信息，而不是直接返回tasks字段
        self.assert_valid_response(response, ['data'])
        
        data = response['data']
        assert 'tasks' in data, "响应数据中应包含任务列表"
        
        tasks = data['tasks']
        assert isinstance(tasks, list), "任务列表应该是数组"
        
        self.log("获取用户任务列表测试通过", "success")
    
    def test_update_profile_invalid_data(self):
        """测试使用无效数据更新用户资料"""
        self.log("测试使用无效数据更新用户资料", "info")
        
        # 测试无效邮箱格式
        invalid_data = {
            "email": "invalid_email_format"
        }
        
        success, response, status = self.make_request(
            'PUT', '/user/profile',
            data=invalid_data,
            auth_required=True,
            expected_status=400
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望400，所以如果状态码是400，则测试通过
        assert status == 400, "使用无效邮箱格式更新资料应该返回400状态码"
        
        self.log("使用无效数据更新用户资料测试通过", "success")
    
    def test_change_password_missing_fields(self):
        """测试缺少字段修改密码"""
        self.log("测试缺少字段修改密码", "info")
        
        # 测试缺少旧密码
        success, response, status = self.make_request(
            'POST', '/user/change-password',
            data={
                "new_password": "new_password123"
            },
            auth_required=True,
            expected_status=400
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望400，所以如果状态码是400，则测试通过
        assert status == 400, "缺少旧密码修改密码应该返回400状态码"
        
        # 测试缺少新密码
        success, response, status = self.make_request(
            'POST', '/user/change-password',
            data={
                "old_password": self.config["test_users"]["admin"]["password"]
            },
            auth_required=True,
            expected_status=400
        )
        
        # 注意：make_request函数在状态码匹配时返回success=True
        # 这里我们期望400，所以如果状态码是400，则测试通过
        assert status == 400, "缺少新密码修改密码应该返回400状态码"
        
        self.log("缺少字段修改密码测试通过", "success")
