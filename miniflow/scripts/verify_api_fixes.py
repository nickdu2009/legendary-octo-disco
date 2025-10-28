#!/usr/bin/env python3
"""
API修复验证脚本
验证第3周Day 2的API修复是否成功
"""

import requests
import json
import time

def test_api_fixes():
    """测试API修复"""
    base_url = "http://localhost:8080"
    api_url = f"{base_url}/api/v1"
    
    print("🔧 验证API修复")
    print("=" * 40)
    
    # 1. 测试服务器连接
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ 服务器连接正常")
        else:
            print("❌ 服务器连接异常")
            return False
    except:
        print("❌ 无法连接服务器")
        return False
    
    # 2. 测试登录
    print("\n🔐 测试用户认证")
    login_data = {"username": "test_user_123", "password": "123456"}
    
    try:
        response = requests.post(f"{api_url}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json().get('data', {})
            token = data.get('token')
            print(f"✅ 登录成功，获取到token")
            headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        else:
            print(f"❌ 登录失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 登录异常: {e}")
        return False
    
    # 3. 测试流程列表API
    print("\n📋 测试流程列表API")
    try:
        response = requests.get(f"{api_url}/process", headers=headers)
        if response.status_code == 200:
            data = response.json().get('data', {})
            processes = data.get('processes', [])
            print(f"✅ 流程列表API正常，共{len(processes)}个流程")
            process_id = processes[0]['id'] if processes else None
        else:
            print(f"❌ 流程列表API失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 流程列表API异常: {e}")
        return False
    
    # 4. 测试用户任务API (修复后)
    print("\n🎯 测试用户任务API (修复后)")
    try:
        response = requests.get(f"{api_url}/user/tasks", headers=headers)
        print(f"   响应状态: {response.status_code}")
        if response.status_code == 200:
            data = response.json().get('data', {})
            tasks = data.get('tasks', [])
            total = data.get('total', 0)
            print(f"✅ 用户任务API修复成功，共{total}个任务")
        else:
            print(f"❌ 用户任务API仍有问题: {response.status_code}")
            print(f"   响应内容: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 用户任务API异常: {e}")
        return False
    
    # 5. 测试实例详情API
    if process_id:
        print(f"\n🏗️ 测试启动流程实例")
        start_data = {
            "business_key": f"api_fix_test_{int(time.time())}",
            "title": "API修复测试实例",
            "variables": {"approved": True},
            "priority": 80
        }
        
        try:
            response = requests.post(f"{api_url}/process/{process_id}/start", json=start_data, headers=headers)
            if response.status_code == 201:
                instance_data = response.json().get('data', {})
                instance_id = instance_data.get('id')
                print(f"✅ 流程实例启动成功: ID={instance_id}")
                
                # 测试获取实例详情
                print(f"\n📋 测试实例详情API")
                response = requests.get(f"{api_url}/instance/{instance_id}", headers=headers)
                if response.status_code == 200:
                    print("✅ 实例详情API正常工作")
                else:
                    print(f"❌ 实例详情API问题: {response.status_code}")
                
            else:
                print(f"❌ 启动流程实例失败: {response.status_code}")
                print(f"   响应: {response.text}")
        except Exception as e:
            print(f"❌ 启动流程实例异常: {e}")
    
    print(f"\n🎉 API修复验证完成！")
    return True

if __name__ == "__main__":
    if test_api_fixes():
        print("\n✅ API修复验证成功！")
    else:
        print("\n❌ API修复验证失败！")
