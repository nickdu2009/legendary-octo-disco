#!/usr/bin/env python3
"""
MiniFlow API快速测试脚本
用于快速验证已实现的API测试
"""

import os
import sys
import subprocess
import time


def run_test(test_name, test_path):
    """运行单个测试并打印结果"""
    print(f"\n{'='*60}")
    print(f"运行测试: {test_name}")
    print(f"{'='*60}")
    
    start_time = time.time()
    result = subprocess.run(
        ['python3', '-m', 'pytest', test_path, '-v', '--tb=short'],
        capture_output=True,
        text=True
    )
    end_time = time.time()
    
    duration = end_time - start_time
    
    print(f"测试耗时: {duration:.2f}秒")
    
    if result.returncode == 0:
        print(f"✅ {test_name} - 通过")
        return True
    else:
        print(f"❌ {test_name} - 失败")
        if result.stdout:
            print("输出:")
            print(result.stdout)
        if result.stderr:
            print("错误:")
            print(result.stderr)
        return False


def main():
    """主函数"""
    print("MiniFlow API快速测试")
    print("确保后端服务运行在 http://localhost:8080")
    
    # 确保在正确的目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # 测试列表
    tests = [
        ("健康检查API测试", "unit/test_health_check.py"),
        ("认证API测试", "unit/test_auth.py"),
        ("用户管理API测试", "unit/test_user.py"),
    ]
    
    # 运行测试
    passed = 0
    total = len(tests)
    
    for test_name, test_path in tests:
        if run_test(test_name, test_path):
            passed += 1
    
    # 打印总结
    print(f"\n{'='*60}")
    print(f"测试总结: {passed}/{total} 通过")
    print(f"{'='*60}")
    
    if passed == total:
        print("🎉 所有测试通过!")
        return 0
    else:
        print(f"⚠️  {total - passed} 个测试失败")
        return 1


if __name__ == '__main__':
    sys.exit(main())
