# MiniFlow API自动化测试

本目录包含MiniFlow系统的API自动化测试脚本和工具。

## 目录结构

- `config/`: 测试配置文件
- `lib/`: 测试库和工具函数
- `unit/`: 单元测试
- `integration/`: 集成测试
- `performance/`: 性能测试
- `fixtures/`: 测试夹具和数据
- `reports/`: 测试报告输出目录

## 已实现的测试

### 1. 基础测试框架
- ✅ 基础测试类 (`lib/base_test.py`)
- ✅ 测试配置文件 (`config/test_config.json`)
- ✅ 测试数据文件 (`config/test_data.json`)
- ✅ 测试运行脚本 (`run_tests.py`)
- ✅ 快速测试脚本 (`quick_test.py`)

### 2. 健康检查API测试 (`unit/test_health_check.py`)
- ✅ 测试健康检查端点
- ✅ 测试API版本健康检查端点
- ✅ 测试健康检查响应时间
- ✅ 测试无效端点

### 3. 认证API测试 (`unit/test_auth.py`)
- ✅ 测试用户注册成功
- ✅ 测试重复用户名注册
- ✅ 测试无效数据注册
- ✅ 测试用户登录成功
- ✅ 测试无效凭据登录
- ✅ 测试缺少字段登录
- ✅ 测试无token访问受保护端点
- ✅ 测试无效token访问受保护端点
- ✅ 测试token验证

### 4. 用户管理API测试 (`unit/test_user.py`)
- ✅ 测试获取用户资料
- ✅ 测试更新用户资料
- ✅ 测试修改密码
- ✅ 测试使用错误旧密码修改密码
- ✅ 测试获取用户任务列表
- ✅ 测试使用无效数据更新用户资料
- ✅ 测试缺少字段修改密码

## 待实现的测试

### 5. 流程管理API测试
- [ ] 获取流程列表测试
- [ ] 创建新流程测试
- [ ] 获取特定流程详情测试
- [ ] 更新流程测试
- [ ] 删除流程测试
- [ ] 复制流程测试
- [ ] 发布流程测试
- [ ] 获取流程统计信息测试
- [ ] 启动流程实例测试

### 6. 流程实例管理API测试
- [ ] 获取特定流程实例详情测试
- [ ] 暂停流程实例测试
- [ ] 恢复流程实例测试
- [ ] 取消流程实例测试
- [ ] 获取流程实例历史记录测试
- [ ] 获取流程实例列表测试

### 7. 任务管理API测试
- [ ] 获取特定任务详情测试
- [ ] 认领任务测试
- [ ] 完成任务测试
- [ ] 释放任务测试
- [ ] 委派任务测试
- [ ] 获取任务表单测试
- [ ] 提交任务表单测试

### 8. 任务状态API测试
- [ ] 根据状态获取任务列表测试

### 9. 管理员API测试
- [ ] 获取用户列表测试
- [ ] 停用用户测试
- [ ] 获取用户统计信息测试

### 10. 集成测试
- [ ] 完整流程创建到执行测试
- [ ] 用户权限和角色测试
- [ ] 错误处理和边界条件测试
- [ ] 数据一致性测试

### 11. 性能测试
- [ ] API响应时间测试
- [ ] 并发请求测试
- [ ] 负载测试

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行测试

#### 快速测试
```bash
# 运行所有已实现的测试
python quick_test.py
```

#### 使用测试运行脚本
```bash
# 运行所有测试
python run_tests.py

# 运行特定类型的测试
python run_tests.py --type unit

# 运行特定模块
python run_tests.py --type unit --module test_auth

# 运行特定测试函数
python run_tests.py --type unit --module test_auth --function test_login_success

# 生成HTML报告
python run_tests.py --html

# 生成覆盖率报告
python run_tests.py --coverage

# 详细输出
python run_tests.py --verbose
```

#### 直接使用pytest
```bash
# 运行所有测试
pytest

# 运行特定测试文件
pytest unit/test_auth.py

# 运行特定测试用例
pytest unit/test_auth.py::TestAuth::test_login_success

# 生成HTML报告
pytest --html=reports/report.html

# 运行性能测试
pytest performance/test_response_time.py
```

## 测试报告

测试报告将生成在 `reports/` 目录下，包括：
- HTML格式报告
- 测试覆盖率报告
- 性能测试结果

## 测试配置

测试配置文件位于 `config/test_config.json`，可以修改以下设置：
- API基础URL
- 测试用户凭据
- 数据库连接信息
- 性能测试参数

## 贡献指南

1. 添加新的测试用例时，请遵循现有的命名约定和结构
2. 确保所有测试用例都有适当的文档字符串
3. 在提交前运行所有测试并确保通过
4. 更新相关文档

## 问题反馈

如果发现测试问题或有改进建议，请提交Issue或Pull Request。
