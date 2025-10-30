#!/usr/bin/env python3
"""
MiniFlow API测试运行脚本
"""

import os
import sys
import argparse
import subprocess
import json
from datetime import datetime


def run_command(cmd, description):
    """运行命令并打印结果"""
    print(f"\n{'='*60}")
    print(f"执行: {description}")
    print(f"命令: {cmd}")
    print(f"{'='*60}")
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    
    if result.stderr:
        print(f"错误: {result.stderr}")
    
    return result.returncode == 0


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='MiniFlow API测试运行脚本')
    parser.add_argument('--type', choices=['unit', 'integration', 'performance', 'all'], 
                        default='all', help='测试类型')
    parser.add_argument('--module', help='特定测试模块 (例如: test_auth)')
    parser.add_argument('--function', help='特定测试函数 (例如: test_login_success)')
    parser.add_argument('--html', action='store_true', help='生成HTML报告')
    parser.add_argument('--coverage', action='store_true', help='生成覆盖率报告')
    parser.add_argument('--verbose', '-v', action='store_true', help='详细输出')
    
    args = parser.parse_args()
    
    # 确保在正确的目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # 构建pytest命令
    cmd_parts = ['python3', '-m', 'pytest']
    
    # 添加详细输出
    if args.verbose:
        cmd_parts.append('-v')
    else:
        cmd_parts.append('-q')
    
    # 添加测试类型
    if args.type == 'unit':
        cmd_parts.append('unit/')
    elif args.type == 'integration':
        cmd_parts.append('integration/')
    elif args.type == 'performance':
        cmd_parts.append('performance/')
    
    # 添加特定模块
    if args.module:
        if args.type == 'unit':
            cmd_parts.append(f'unit/{args.module}.py')
        elif args.type == 'integration':
            cmd_parts.append(f'integration/{args.module}.py')
        elif args.type == 'performance':
            cmd_parts.append(f'performance/{args.module}.py')
    
    # 添加特定函数
    if args.function:
        if args.module:
            cmd_parts[-1] += f'::{args.function}'
        else:
            print("错误: 指定函数时必须同时指定模块")
            sys.exit(1)
    
    # 添加HTML报告
    if args.html:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_dir = os.path.join('reports', f'report_{timestamp}')
        os.makedirs(report_dir, exist_ok=True)
        cmd_parts.extend(['--html', f'{report_dir}/report.html', '--self-contained-html'])
    
    # 添加覆盖率报告
    if args.coverage:
        cmd_parts.extend(['--cov=lib', '--cov-report=html:reports/htmlcov', '--cov-report=term'])
    
    # 添加测试标记
    cmd_parts.extend(['-m', 'not slow'])
    
    # 构建完整命令
    cmd = ' '.join(cmd_parts)
    
    # 运行测试
    success = run_command(cmd, f"运行{args.type}测试")
    
    # 如果生成了报告，打印报告位置
    if args.html:
        print(f"\nHTML报告已生成: {report_dir}/report.html")
    
    if args.coverage:
        print(f"\n覆盖率报告已生成: reports/htmlcov/index.html")
    
    # 退出码
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
