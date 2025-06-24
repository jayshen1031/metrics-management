# 指标管理系统

企业级指标管理系统，用于定义、计算、监控和分析各类业务指标。

## 功能特性

- 🎯 **指标定义管理** - 灵活的指标定义和分类管理
- 📊 **数据可视化** - 实时图表和趋势分析
- 🔄 **自动化计算** - 支持多种更新频率的自动计算
- 📈 **目标监控** - 目标设置和达成率监控
- 🔌 **多数据源** - 支持数据库、API、文件等多种数据源
- ⚡ **实时监控** - 实时数据更新和告警机制

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- npm >= 8.0.0

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd metrics-management
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

4. 初始化数据库
```bash
mysql -u root -p < scripts/init-database.sql
```

5. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 项目结构

```
metrics-management/
├── src/                    # 源代码
│   ├── app.js             # 应用入口
│   ├── services/          # 业务服务层
│   ├── components/        # 可复用组件
│   ├── pages/            # 页面组件
│   └── utils/            # 工具函数
├── config/               # 配置文件
├── scripts/              # 脚本文件
├── tests/               # 测试文件
├── data/                # 数据文件
└── docs/                # 文档
```

## API 文档

### 指标管理
- `GET /api/metrics` - 获取所有指标
- `GET /api/metrics/:id` - 获取指定指标
- `POST /api/metrics` - 创建新指标
- `PUT /api/metrics/:id` - 更新指标
- `DELETE /api/metrics/:id` - 删除指标

### 指标值管理
- `GET /api/metrics/:id/values` - 获取指标历史值
- `POST /api/metrics/:id/values` - 添加指标值

## 核心概念

### 指标定义
指标是业务监控的基本单元，包含：
- 名称和描述
- 分类和单位
- 计算公式
- 数据源配置
- 更新频率

### 数据源
支持多种数据源类型：
- **数据库**: MySQL, PostgreSQL等
- **API**: RESTful API接口
- **文件**: CSV, Excel等
- **手动**: 人工录入

### 计算频率
- 实时 (real-time)
- 小时 (hourly)  
- 日 (daily)
- 周 (weekly)
- 月 (monthly)

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。