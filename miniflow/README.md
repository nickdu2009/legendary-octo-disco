# MiniFlow - 极简版流程引擎

MiniFlow 是一个轻量级、易于部署和维护的流程自动化解决方案，专注于核心流程执行功能。

## 项目特点

- 🚀 轻量级设计，快速部署
- 🎯 专注核心功能，简单易用
- 🔧 基于 Go + React + TypeScript 技术栈
- 📊 支持可视化流程建模
- 🔄 完整的任务管理和流程监控

## 技术架构

### 后端技术栈
- **语言**: Go 1.21+
- **框架**: Echo 4.11+
- **ORM**: GORM 1.25+
- **依赖注入**: Google Wire
- **数据库**: MySQL 8.0+ / SQLite
- **缓存**: Redis 7.0+
- **日志**: Zap

### 前端技术栈
- **语言**: TypeScript 5.0+
- **框架**: React 18+
- **UI库**: Ant Design 5.0+
- **状态管理**: Zustand
- **流程建模**: ReactFlow 11.0+
- **构建工具**: Vite 4.0+

## 快速开始

### 使用 Docker Compose (推荐)

1. 克隆项目
```bash
git clone <repository-url>
cd miniflow
```

2. 启动服务
```bash
docker-compose up -d
```

3. 访问应用
- 后端 API: http://localhost:8080
- 前端应用: http://localhost:3000 (待实现)

### 本地开发

#### 后端开发

1. 安装 Go 1.21+
2. 进入后端目录
```bash
cd backend
```

3. 安装依赖
```bash
go mod tidy
```

4. 生成Wire代码
```bash
make generate
# 或者直接运行
wire ./internal/wire
```

5. 配置数据库
- 启动 MySQL 服务
- 创建数据库 `miniflow`
- 修改 `config/config.yaml` 中的数据库配置

6. 运行服务
```bash
go run cmd/server/main.go
```

#### 前端开发 (待实现)

前端开发环境将在第4-5天实现。

## 项目结构

```
miniflow/
├── backend/                 # Go后端服务
│   ├── cmd/server/         # 应用程序入口
│   ├── internal/           # 内部包
│   │   ├── handler/        # HTTP处理器
│   │   ├── service/        # 业务逻辑层
│   │   ├── repository/     # 数据访问层
│   │   ├── model/          # 数据模型
│   │   └── middleware/     # 中间件
│   ├── pkg/                # 公共包
│   │   ├── config/         # 配置管理
│   │   ├── database/       # 数据库连接
│   │   ├── logger/         # 日志工具
│   │   └── utils/          # 工具函数
│   └── config/             # 配置文件
├── frontend/               # React前端应用 (待实现)
├── docs/                   # 项目文档
├── scripts/                # 构建和部署脚本
└── docker-compose.yml      # Docker编排文件
```

## 开发计划

- [x] **Day 1**: 项目基础搭建和环境配置
- [ ] **Day 2**: 数据库模型设计和用户管理后端
- [ ] **Day 3**: 用户管理API和JWT认证
- [ ] **Day 4**: 前端项目搭建和认证系统
- [ ] **Day 5**: 前端认证界面和基础布局

## API 文档

API 文档将在后续版本中提供 Swagger/OpenAPI 支持。

### API 测试

项目提供了完整的Python API测试工具：

```bash
# 1. 安装Python依赖
pip3 install requests

# 2. 启动数据库服务
docker-compose up -d mysql redis

# 3. 启动MiniFlow服务器
cd backend && ./miniflow -config ./config

# 4. 运行API测试（新终端）
python3 scripts/test_api.py
```

**测试覆盖：**
- 用户注册/登录API
- JWT认证和中间件
- 用户资料管理API
- 管理员用户管理API
- 认证保护机制验证

## 配置说明

主要配置文件位于 `backend/config/config.yaml`，包含以下配置项：

- `server`: 服务器配置 (端口、主机等)
- `database`: 数据库配置 (MySQL连接信息)
- `redis`: Redis缓存配置
- `jwt`: JWT认证配置
- `log`: 日志配置

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目 Issues: [GitHub Issues](https://github.com/your-username/miniflow/issues)
- 邮箱: your-email@example.com

---

**注意**: 这是项目的第1天交付版本，包含基础架构和配置。完整功能将在12周开发周期内逐步实现。
