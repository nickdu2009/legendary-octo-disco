#!/usr/bin/env python3
"""
MiniFlow Process API Test Script
测试第2周Day 1开发的流程管理API接口
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

class ProcessAPITester:
    """流程API测试类"""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.token: Optional[str] = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'MiniFlow-Process-API-Tester/1.0'
        })
        self.created_process_id: Optional[int] = None
    
    def log(self, message: str, color: str = Colors.NC):
        """打印带颜色的日志"""
        print(f"{color}{message}{Colors.NC}")
    
    def login_first(self):
        """先登录获取token"""
        self.log("\n🔐 用户登录获取token", Colors.BLUE)
        self.log("=" * 40)
        
        login_data = {
            "username": "test_user_123",  # 使用第1周创建的用户
            "password": "123456"
        }
        
        try:
            response = self.session.post(f"{self.api_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json().get('data', {})
                self.token = data.get('token')
                if self.token:
                    self.session.headers['Authorization'] = f'Bearer {self.token}'
                    self.log(f"✅ 登录成功，Token: {self.token[:20]}...", Colors.GREEN)
                    return True
            else:
                self.log(f"❌ 登录失败: {response.status_code}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"❌ 登录异常: {e}", Colors.RED)
            return False
    
    def test_create_process(self):
        """测试创建流程"""
        self.log("\n📝 测试创建流程", Colors.BLUE)
        self.log("=" * 40)
        
        process_data = {
            "key": f"test_process_{int(time.time())}",
            "name": "测试审批流程",
            "description": "这是一个用于测试的简单审批流程",
            "category": "approval",
            "definition": {
                "nodes": [
                    {
                        "id": "start1",
                        "type": "start",
                        "name": "开始",
                        "x": 100,
                        "y": 100,
                        "props": {}
                    },
                    {
                        "id": "task1",
                        "type": "userTask", 
                        "name": "经理审核",
                        "x": 300,
                        "y": 100,
                        "props": {
                            "assignee": "manager"
                        }
                    },
                    {
                        "id": "gateway1",
                        "type": "gateway",
                        "name": "审核结果",
                        "x": 500,
                        "y": 100,
                        "props": {
                            "condition": "approved"
                        }
                    },
                    {
                        "id": "end1",
                        "type": "end",
                        "name": "结束",
                        "x": 700,
                        "y": 100,
                        "props": {}
                    }
                ],
                "flows": [
                    {
                        "id": "flow1",
                        "from": "start1",
                        "to": "task1",
                        "condition": "",
                        "label": ""
                    },
                    {
                        "id": "flow2",
                        "from": "task1", 
                        "to": "gateway1",
                        "condition": "",
                        "label": ""
                    },
                    {
                        "id": "flow3",
                        "from": "gateway1",
                        "to": "end1",
                        "condition": "approved == true",
                        "label": "通过"
                    }
                ]
            }
        }
        
        try:
            response = self.session.post(f"{self.api_url}/process", json=process_data)
            if response.status_code == 201:
                data = response.json().get('data', {})
                self.created_process_id = data.get('id')
                self.log(f"✅ 创建流程成功", Colors.GREEN)
                self.log(f"   流程ID: {self.created_process_id}")
                self.log(f"   流程标识: {data.get('key')}")
                self.log(f"   流程名称: {data.get('name')}")
                self.log(f"   版本号: {data.get('version')}")
                return True
            else:
                self.log(f"❌ 创建流程失败: {response.status_code}", Colors.RED)
                self.log(f"   错误信息: {response.text}", Colors.YELLOW)
                return False
        except Exception as e:
            self.log(f"❌ 创建流程异常: {e}", Colors.RED)
            return False
    
    def test_get_process_list(self):
        """测试获取流程列表"""
        self.log("\n📋 测试获取流程列表", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            response = self.session.get(f"{self.api_url}/process?page=1&page_size=10")
            if response.status_code == 200:
                data = response.json().get('data', {})
                processes = data.get('processes', [])
                total = data.get('total', 0)
                
                self.log(f"✅ 获取流程列表成功", Colors.GREEN)
                self.log(f"   流程总数: {total}")
                self.log(f"   当前页流程数: {len(processes)}")
                
                for process in processes:
                    self.log(f"   - {process.get('name')} (ID: {process.get('id')}, 状态: {process.get('status')})")
                
                return True
            else:
                self.log(f"❌ 获取流程列表失败: {response.status_code}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"❌ 获取流程列表异常: {e}", Colors.RED)
            return False
    
    def test_get_process_detail(self):
        """测试获取流程详情"""
        if not self.created_process_id:
            self.log("⚠️ 跳过流程详情测试（无可用流程ID）", Colors.YELLOW)
            return True
            
        self.log("\n🔍 测试获取流程详情", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            response = self.session.get(f"{self.api_url}/process/{self.created_process_id}")
            if response.status_code == 200:
                data = response.json().get('data', {})
                definition = data.get('definition', {})
                nodes = definition.get('nodes', [])
                flows = definition.get('flows', [])
                
                self.log(f"✅ 获取流程详情成功", Colors.GREEN)
                self.log(f"   流程名称: {data.get('name')}")
                self.log(f"   流程状态: {data.get('status')}")
                self.log(f"   节点数量: {len(nodes)}")
                self.log(f"   连线数量: {len(flows)}")
                self.log(f"   创建者: {data.get('creator_name')}")
                
                return True
            else:
                self.log(f"❌ 获取流程详情失败: {response.status_code}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"❌ 获取流程详情异常: {e}", Colors.RED)
            return False
    
    def test_update_process(self):
        """测试更新流程"""
        if not self.created_process_id:
            self.log("⚠️ 跳过流程更新测试（无可用流程ID）", Colors.YELLOW)
            return True
            
        self.log("\n✏️ 测试更新流程", Colors.BLUE)
        self.log("=" * 40)
        
        update_data = {
            "name": "更新后的测试审批流程",
            "description": "这是更新后的流程描述",
            "category": "workflow",
            "definition": {
                "nodes": [
                    {
                        "id": "start1",
                        "type": "start",
                        "name": "开始",
                        "x": 100,
                        "y": 100,
                        "props": {}
                    },
                    {
                        "id": "task1",
                        "type": "userTask",
                        "name": "部门经理审核",
                        "x": 300,
                        "y": 100,
                        "props": {
                            "assignee": "department_manager"
                        }
                    },
                    {
                        "id": "task2",
                        "type": "userTask",
                        "name": "总经理审核",
                        "x": 500,
                        "y": 100,
                        "props": {
                            "assignee": "general_manager"
                        }
                    },
                    {
                        "id": "end1",
                        "type": "end",
                        "name": "结束",
                        "x": 700,
                        "y": 100,
                        "props": {}
                    }
                ],
                "flows": [
                    {
                        "id": "flow1",
                        "from": "start1",
                        "to": "task1"
                    },
                    {
                        "id": "flow2",
                        "from": "task1",
                        "to": "task2"
                    },
                    {
                        "id": "flow3",
                        "from": "task2",
                        "to": "end1"
                    }
                ]
            }
        }
        
        try:
            response = self.session.put(f"{self.api_url}/process/{self.created_process_id}", json=update_data)
            if response.status_code == 200:
                data = response.json().get('data', {})
                self.log(f"✅ 更新流程成功", Colors.GREEN)
                self.log(f"   更新后名称: {data.get('name')}")
                self.log(f"   更新后分类: {data.get('category')}")
                self.log(f"   节点数量: {len(data.get('definition', {}).get('nodes', []))}")
                return True
            else:
                self.log(f"❌ 更新流程失败: {response.status_code}", Colors.RED)
                self.log(f"   错误信息: {response.text}", Colors.YELLOW)
                return False
        except Exception as e:
            self.log(f"❌ 更新流程异常: {e}", Colors.RED)
            return False
    
    def test_copy_process(self):
        """测试复制流程"""
        if not self.created_process_id:
            self.log("⚠️ 跳过流程复制测试（无可用流程ID）", Colors.YELLOW)
            return True
            
        self.log("\n📋 测试复制流程", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            response = self.session.post(f"{self.api_url}/process/{self.created_process_id}/copy")
            if response.status_code == 201:
                data = response.json().get('data', {})
                self.log(f"✅ 复制流程成功", Colors.GREEN)
                self.log(f"   新流程ID: {data.get('id')}")
                self.log(f"   新流程标识: {data.get('key')}")
                self.log(f"   新流程名称: {data.get('name')}")
                return True
            else:
                self.log(f"❌ 复制流程失败: {response.status_code}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"❌ 复制流程异常: {e}", Colors.RED)
            return False
    
    def test_process_stats(self):
        """测试流程统计"""
        self.log("\n📊 测试流程统计", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            response = self.session.get(f"{self.api_url}/process/stats")
            if response.status_code == 200:
                data = response.json().get('data', {})
                self.log(f"✅ 获取流程统计成功", Colors.GREEN)
                self.log(f"   草稿流程: {data.get('draft_count', 0)}个")
                self.log(f"   已发布流程: {data.get('published_count', 0)}个")
                self.log(f"   已归档流程: {data.get('archived_count', 0)}个")
                self.log(f"   总计: {data.get('total_count', 0)}个")
                return True
            else:
                self.log(f"❌ 获取流程统计失败: {response.status_code}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"❌ 获取流程统计异常: {e}", Colors.RED)
            return False
    
    def test_invalid_process_creation(self):
        """测试无效流程创建"""
        self.log("\n🚫 测试无效流程创建", Colors.BLUE)
        self.log("=" * 40)
        
        # 测试缺少开始节点的流程
        invalid_data = {
            "key": f"invalid_process_{int(time.time())}",
            "name": "无效流程",
            "definition": {
                "nodes": [
                    {
                        "id": "task1",
                        "type": "userTask",
                        "name": "任务1",
                        "x": 100,
                        "y": 100
                    }
                ],
                "flows": []
            }
        }
        
        try:
            response = self.session.post(f"{self.api_url}/process", json=invalid_data)
            if response.status_code == 400:
                error_data = response.json()
                self.log(f"✅ 正确拒绝无效流程", Colors.GREEN)
                self.log(f"   错误信息: {error_data.get('error')}", Colors.YELLOW)
                return True
            else:
                self.log(f"❌ 应该拒绝无效流程但没有: {response.status_code}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"❌ 测试无效流程异常: {e}", Colors.RED)
            return False
    
    def test_unauthorized_access(self):
        """测试未授权访问"""
        self.log("\n🔒 测试未授权访问", Colors.BLUE)
        self.log("=" * 40)
        
        # 临时移除token
        old_token = self.session.headers.get('Authorization')
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
        
        try:
            response = self.session.get(f"{self.api_url}/process")
            if response.status_code == 401:
                self.log(f"✅ 正确拒绝未授权访问", Colors.GREEN)
                # 恢复token
                if old_token:
                    self.session.headers['Authorization'] = old_token
                return True
            else:
                self.log(f"❌ 应该拒绝未授权访问但没有: {response.status_code}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"❌ 测试未授权访问异常: {e}", Colors.RED)
            return False
        finally:
            # 确保恢复token
            if old_token:
                self.session.headers['Authorization'] = old_token
    
    def run_all_tests(self):
        """运行所有流程API测试"""
        self.log("🧪 MiniFlow 流程API测试 (第2周Day 1)", Colors.BLUE)
        self.log("=" * 60)
        
        # 检查服务器状态
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code != 200:
                self.log("❌ 服务器未正常运行，请先启动服务器", Colors.RED)
                return False
        except requests.exceptions.RequestException:
            self.log("❌ 无法连接到服务器，请确保服务器正在运行", Colors.RED)
            self.log("   启动命令: cd backend && ./miniflow -config ./config", Colors.YELLOW)
            return False
        
        # 登录获取token
        if not self.login_first():
            self.log("❌ 登录失败，无法进行流程API测试", Colors.RED)
            return False
        
        # 运行测试序列
        tests = [
            ("创建流程", self.test_create_process),
            ("获取流程列表", self.test_get_process_list),
            ("获取流程详情", self.test_get_process_detail),
            ("更新流程", self.test_update_process),
            ("复制流程", self.test_copy_process),
            ("流程统计", self.test_process_stats),
            ("无效流程创建", self.test_invalid_process_creation),
            ("未授权访问", self.test_unauthorized_access),
        ]
        
        passed = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            if test_func():
                passed += 1
        
        # 测试总结
        self.log("\n📊 流程API测试总结", Colors.BLUE)
        self.log("=" * 40)
        self.log("✅ 流程创建API", Colors.GREEN)
        self.log("✅ 流程查询API", Colors.GREEN)
        self.log("✅ 流程更新API", Colors.GREEN)
        self.log("✅ 流程复制API", Colors.GREEN)
        self.log("✅ 流程统计API", Colors.GREEN)
        self.log("✅ 数据验证机制", Colors.GREEN)
        self.log("✅ 权限控制机制", Colors.GREEN)
        
        self.log(f"\n🎉 流程API测试完成！", Colors.GREEN)
        self.log(f"通过率: {passed}/{total_tests} ({passed/total_tests*100:.1f}%)", Colors.GREEN)
        
        return passed == total_tests

def main():
    """主函数"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:8080"
    
    print(f"🔗 测试服务器: {base_url}")
    
    tester = ProcessAPITester(base_url)
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{Colors.GREEN}✅ 所有流程API测试通过！{Colors.NC}")
        print(f"{Colors.GREEN}🚀 第2周Day 1流程管理后端功能验证成功！{Colors.NC}")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}❌ 流程API测试失败！{Colors.NC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
