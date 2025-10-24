# MiniFlow 应用启动指南

## 🚀 应用启动状态

**启动时间**: 2025-10-23 21:45  
**应用版本**: v1.0.0  
**开发阶段**: 第1周完成  

---

## 📋 服务状态检查

### **1. 数据库服务 ✅**
```bash
服务状态: 运行中
MySQL: localhost:3306 (运行16小时+)
Redis: localhost:6379 (运行16小时+)
```

### **2. 后端API服务 ✅**
```bash
服务地址: http://localhost:8080
健康状态: healthy
版本信息: 1.0.0
启动状态: 正常运行
```

**健康检查响应:**
```json
{
  "service": "miniflow",
  "status": "healthy", 
  "timestamp": "2025-10-23T17:00:00Z",
  "version": "1.0.0"
}
```

### **3. 前端开发服务 ✅**
```bash
服务地址: http://localhost:5173
开发工具: Vite v7.1.12
启动状态: 正常运行
热重载: 已启用
```

---

## 🌐 应用访问信息

### **前端应用**
- **地址**: http://localhost:5173
- **功能**: 用户认证、仪表板、主布局
- **特性**: 响应式设计、现代化UI

### **后端API**
- **地址**: http://localhost:8080/api/v1
- **文档**: 详见API测试脚本
- **认证**: JWT Bearer Token

### **数据库**
- **MySQL**: localhost:3306 (用户数据存储)
- **Redis**: localhost:6379 (缓存和会话)

---

## 🎯 应用功能概览

### **已实现的功能**

#### **用户认证系统**
- ✅ 用户注册 (POST /api/v1/auth/register)
- ✅ 用户登录 (POST /api/v1/auth/login)
- ✅ JWT认证和状态管理
- ✅ 路由保护和权限控制

#### **用户管理功能**
- ✅ 个人资料查看和更新
- ✅ 密码修改功能
- ✅ 管理员用户列表
- ✅ 用户统计和分析

#### **前端界面**
- ✅ 现代化登录注册页面
- ✅ 企业级主布局设计
- ✅ 个性化仪表板
- ✅ 响应式移动端适配

### **占位功能 (待开发)**
- 🔮 流程管理 (第2周开发)
- 🔮 任务管理 (第2-3周开发)
- 🔮 流程建模器 (第2周开发)
- 🔮 流程监控 (第3周开发)

---

## 🧪 快速功能测试

### **测试用户注册**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo_user",
    "password": "password123",
    "display_name": "演示用户",
    "email": "demo@example.com"
  }'
```

### **测试用户登录**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo_user", 
    "password": "password123"
  }'
```

### **运行完整API测试**
```bash
python3 scripts/test_api.py
```

### **运行前端测试**
```bash
cd frontend && npm run test:run
```

---

## 🎨 用户界面预览

### **登录页面功能**
- 🎨 渐变背景设计
- 📝 用户名和密码输入
- 🔒 密码可见性切换
- 🔗 注册页面跳转链接
- ⚡ 表单验证和错误提示

### **注册页面功能**
- 📋 完整的用户信息表单
- ✅ 密码确认验证
- 📧 邮箱格式验证
- 📱 手机号格式验证
- 🔗 登录页面跳转链接

### **仪表板功能**
- 👋 个性化欢迎信息
- 📊 统计数据卡片展示
- ⚡ 快速操作按钮
- 👑 管理员功能区域
- 📱 响应式布局设计

### **主布局功能**
- 🎛️ 可折叠侧边栏导航
- 👤 用户信息下拉菜单
- 🔔 通知功能预留
- 📍 页面标题动态显示
- 🚪 优雅的退出登录

---

## 🛠️ 开发者工具

### **后端开发**
```bash
cd backend

# 编译项目
go build -o miniflow ./cmd/server

# 运行服务
./miniflow -config ./config

# 生成Wire代码
wire ./internal/wire

# 运行测试
python3 ../scripts/test_api.py
```

### **前端开发**
```bash
cd frontend

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm run test:run

# 测试覆盖率
npm run test:coverage
```

### **数据库管理**
```bash
# 启动数据库
docker-compose up -d mysql redis

# 停止数据库
docker-compose down

# 查看数据库日志
docker-compose logs mysql
```

---

## 🎯 下一步开发

### **第2周开发计划**
1. **可视化流程建模器** - ReactFlow集成
2. **流程定义管理** - CRUD操作
3. **流程执行引擎** - 状态机实现
4. **任务管理系统** - 用户任务处理

### **技术准备**
- ✅ 完整的用户管理系统
- ✅ 稳定的前后端架构
- ✅ 企业级的质量标准
- ✅ 现代化的开发工具链

---

## 📞 支持和帮助

### **常见问题**
1. **端口冲突**: 确保8080和5173端口未被占用
2. **数据库连接**: 确保MySQL服务正常运行
3. **依赖问题**: 运行`npm install`和`go mod tidy`
4. **权限问题**: 确保可执行文件有执行权限

### **开发资源**
- 📚 **API文档**: scripts/test_api.py中的测试用例
- 🧪 **测试工具**: 完整的自动化测试套件
- 📝 **开发文档**: docs/目录下的详细文档
- 🔧 **配置文件**: backend/config/config.yaml

---

**应用启动完成! 🎉**

**前端访问**: http://localhost:5173  
**后端API**: http://localhost:8080  
**状态**: 全部服务正常运行 ✅
