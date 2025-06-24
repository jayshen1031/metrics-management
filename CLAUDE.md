# 指标管理系统 项目记忆

## 项目概述
企业级指标管理系统，用于定义、计算、监控和分析各类业务指标。支持多种数据源集成，自动化指标计算，实时监控和趋势分析。

## 技术栈
- **后端**: Node.js + Express
- **数据库**: MySQL 8.0
- **认证**: JWT
- **工具**: ESLint, Jest, Nodemon
- **部署**: Docker (计划)

## 项目结构
```
metrics-management/
├── src/
│   ├── app.js              # 应用入口
│   ├── components/         # 可复用组件
│   ├── pages/             # 页面组件
│   ├── services/          # 业务逻辑服务
│   │   └── MetricService.js # 指标服务
│   └── utils/             # 工具函数
├── config/
│   └── database.js        # 数据库配置
├── scripts/
│   └── init-database.sql  # 数据库初始化脚本
├── tests/                 # 测试文件
├── data/
│   ├── input/            # 输入数据
│   └── output/           # 输出数据
├── docs/                 # 文档
├── package.json          # 项目配置
└── .env.example         # 环境变量示例
```

## 核心功能
1. **指标定义管理**
   - 指标名称、描述、分类
   - 计算公式和数据源配置
   - 更新频率设置
   - 指标搜索和分类统计

2. **指标值管理**
   - 历史数据存储
   - 数据质量评分
   - 趋势分析
   - 批量导入导出

3. **目标管理**
   - 多维度目标设置
   - 目标达成率监控

4. **平台连接集成**
   - **DolphinScheduler集成**: 项目、工作流、任务元数据采集
   - **Doris集成**: 数据库、表、列信息同步
   - **元数据采集器**: 定时自动采集，支持手动触发

5. **血缘分析系统**
   - SQL血缘解析（INSERT、CREATE TABLE AS SELECT等）
   - 表级血缘图构建
   - 影响范围分析
   - 血缘报告生成
   - 上下游依赖关系查询

6. **数据资产管理**
   - 统一资产目录
   - 资产搜索和分类
   - 资产标签管理
   - 资产详情查看
   - 资产统计分析

7. **系统管理功能**
   - 健康检查和监控
   - 连接测试
   - 数据清理和维护
   - 配置导入导出
   - 采集日志管理

## 数据库表结构

### 指标管理相关
- `metrics`: 指标定义表
- `metric_values`: 指标值表
- `metric_targets`: 指标目标表
- `data_sources`: 数据源配置表
- `metric_calculation_logs`: 计算日志表

### DolphinScheduler相关
- `ds_projects`: DolphinScheduler项目表
- `ds_workflows`: 工作流表
- `ds_tasks`: 任务表
- `ds_sql_tasks`: SQL任务表

### Doris相关
- `doris_databases`: Doris数据库表
- `doris_tables`: 表信息表
- `doris_columns`: 列信息表
- `doris_table_stats`: 表统计信息表
- `doris_table_partitions`: 表分区信息表

### 血缘和资产管理
- `data_lineage`: 数据血缘关系表
- `metadata_collection_logs`: 元数据采集日志表
- `asset_tags`: 资产标签表

## 常用命令
```bash
# 安装依赖（推荐使用yarn，避免npm缓存问题）
yarn install

# 开发模式启动
npm run dev

# 生产模式启动
npm start

# 后台启动（生产环境）
nohup node src/app.js > app.log 2>&1 &

# 运行测试
npm test

# 代码检查
npm run lint

# 停止后台进程
pkill -f "node src/app.js"

# 数据库相关
# 初始化数据库
docker exec -i metrics-mysql mysql -u root -proot123456 metrics_management < scripts/init-database.sql

# 修复中文字符集问题
docker exec -i metrics-mysql mysql -u root -proot123456 --default-character-set=utf8mb4 metrics_management < insert-clean-metrics.sql
```

## 环境配置
复制 `.env.example` 为 `.env` 并配置以下项：
- 数据库连接信息（注意：使用端口3307避免冲突）
- JWT密钥
- 服务端口
- 日志配置

### 当前测试环境配置
```env
DB_HOST=localhost
DB_PORT=3307  # 避免与本地MySQL冲突
DB_USER=root
DB_PASSWORD=root123456
DB_NAME=metrics_management
JWT_SECRET=metrics_jwt_secret_key_2025
PORT=3000
NODE_ENV=development
```

## API端点

### 系统基础
- `GET /` - 系统信息
- `GET /health` - 健康检查
- `GET /api/v1` - API信息

### 指标管理 `/api/v1/metrics`
- `GET /metrics` - 获取所有指标
- `GET /metrics/:id` - 获取指标详情
- `POST /metrics` - 创建指标
- `PUT /metrics/:id` - 更新指标
- `DELETE /metrics/:id` - 删除指标
- `GET /metrics/:id/values` - 获取指标历史值
- `POST /metrics/:id/values` - 添加指标值
- `GET /metrics/:id/trend` - 获取指标趋势
- `GET /metrics/search/:keyword` - 搜索指标
- `POST /metrics/batch/import` - 批量导入指标

### 元数据管理 `/api/v1/metadata`
- `GET /metadata/overview` - 数据资产概览
- `POST /metadata/collect` - 触发元数据采集
- `GET /metadata/collection-logs` - 采集历史
- `GET /metadata/dolphinscheduler/projects` - DS项目列表
- `GET /metadata/dolphinscheduler/workflows` - DS工作流列表
- `GET /metadata/doris/databases` - Doris数据库列表
- `GET /metadata/doris/tables` - Doris表列表
- `GET /metadata/search` - 搜索数据资产

### 血缘分析 `/api/v1/lineage`
- `POST /lineage/analyze-sql` - 分析SQL血缘
- `GET /lineage/table/:tableName` - 表级血缘图
- `GET /lineage/graph/:assetId` - 通用血缘图
- `GET /lineage/impact/:tableName` - 影响范围分析
- `GET /lineage/report/:tableName` - 血缘报告
- `GET /lineage/upstream/:tableName` - 上游依赖
- `GET /lineage/downstream/:tableName` - 下游依赖
- `GET /lineage/statistics` - 血缘统计

### 数据资产 `/api/v1/assets`
- `GET /assets/catalog` - 资产目录
- `GET /assets/detail/:assetType/:assetId` - 资产详情
- `GET /assets/search` - 资产搜索
- `GET /assets/statistics` - 资产统计
- `POST /assets/:assetId/tags` - 管理资产标签
- `GET /assets/:assetId/tags` - 获取资产标签
- `GET /assets/dependencies/:assetId` - 资产依赖关系

### 系统管理 `/api/v1/system`
- `GET /system/health` - 系统健康检查
- `GET /system/info` - 系统信息
- `GET /system/config` - 系统配置
- `POST /system/collection/start` - 启动采集调度
- `POST /system/collection/stop` - 停止采集调度
- `GET /system/collection/logs` - 采集日志
- `POST /system/cleanup` - 数据清理
- `POST /system/maintenance` - 数据库维护
- `POST /system/test-connection` - 测试连接

## 部署状态与访问信息

### ✅ 当前运行状态 (2025-06-24)
- **应用状态**: 正常运行
- **前端界面**: http://localhost:3000 (可视化管理界面)
- **API服务**: http://localhost:3000/api/v1 (RESTful API)
- **健康检查**: http://localhost:3000/health
- **数据库**: MySQL容器运行正常 (metrics-mysql:3307)
- **缓存**: Redis容器运行正常 (metrics-redis:6379)

### 🌐 前端功能
- **系统监控**: 实时健康状态检查
- **数据概览**: 资产统计和概览信息
- **指标管理**: 指标列表查看和管理
- **API测试**: 内置API接口测试工具
- **响应式设计**: 支持桌面和移动端访问

### 📊 测试数据
系统已包含5个示例指标：
- 日活跃用户数 (用户指标)
- 订单转化率 (业务指标)  
- 客户满意度 (服务指标)
- 页面访问量 (流量指标)
- 系统可用性 (技术指标)

## 注意事项

### 环境要求
1. Docker >= 20.10, Docker Compose >= 1.29
2. Node.js版本 >= 16.0.0 (当前测试: v22.11.0)
3. 可用内存 >= 4GB (推荐8GB+)
4. 磁盘空间 >= 10GB

### 已解决的部署问题
1. **npm缓存权限问题** → 使用yarn安装依赖
2. **MySQL端口冲突** → 使用3307端口避免冲突
3. **环境变量加载问题** → 调整dotenv.config()位置
4. **中文字符乱码** → 配置utf8mb4字符集
5. **数据库表缺失** → 手动创建缺失的血缘分析表
6. **SQL查询错误** → 修正列名匹配问题

### 配置要求  
1. **字符集**: 数据库连接必须使用utf8mb4字符集
2. **端口配置**: MySQL使用3307端口避免冲突
3. **Docker网络**: 确保容器间网络通信正常
4. **权限配置**: MySQL允许从Docker网络连接

### 功能限制
1. **外部系统连接**: DolphinScheduler和Doris需要单独部署
2. **SQL血缘解析**: 支持常见语句类型（INSERT、CREATE TABLE AS SELECT等）
3. **数据质量评分**: 范围0-100
4. **血缘分析深度**: 建议不超过5层
5. **查询性能**: 大量数据查询时使用分页避免超时

### 性能优化
1. 元数据采集建议在业务低峰期进行
2. 定期清理历史采集日志
3. 合理设置API查询的limit参数
4. 对大表的血缘分析可能耗时较长

### 安全建议
1. 生产环境务必修改默认密码
2. 配置适当的网络访问控制
3. 定期备份元数据和配置
4. 监控系统资源使用情况

### 故障排查
1. **应用无法启动**: 检查端口占用和环境变量
2. **数据库连接失败**: 验证MySQL容器状态和连接配置
3. **中文乱码**: 确保使用utf8mb4字符集
4. **API接口错误**: 查看app.log日志文件

## 开发规范
- 使用ESLint进行代码检查
- 编写单元测试
- 遵循RESTful API设计
- 使用环境变量管理配置
- 错误处理和日志记录