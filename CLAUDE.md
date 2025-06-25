# 指标管理系统 项目记忆

## 项目概述
企业级指标管理平台，提供数据资产管理、血缘分析、指标治理的一体化解决方案。集成DolphinScheduler和Doris，支持SQL血缘解析、可视化血缘图谱、指标全生命周期管理等功能。

## 技术栈
- **后端**: Node.js + Express.js
- **前端**: HTML5 + Bootstrap 5 + Vanilla JavaScript
- **数据库**: MySQL 8.0 (utf8mb4字符集)
- **缓存**: Redis 
- **容器化**: Docker + Docker Compose
- **代码编辑**: CodeMirror (SQL编辑器)
- **可视化**: D3.js (血缘图谱)
- **集成**: DolphinScheduler (Mock) + Doris (Mock)

## 项目结构
```
metrics-management/
├── src/
│   ├── app.js                    # 应用入口
│   ├── routes/                   # API路由
│   │   ├── metrics.js           # 指标管理API
│   │   ├── lineage.js           # 血缘分析API
│   │   ├── metadata.js          # 元数据管理API
│   │   ├── assets.js            # 数据资产API
│   │   └── system.js            # 系统管理API
│   ├── services/                # 业务逻辑服务
│   │   ├── MetricService.js     # 指标服务
│   │   ├── LineageAnalysisService.js # 血缘分析服务
│   │   ├── MetricGovernanceService.js # 指标治理服务
│   │   ├── DolphinSchedulerService.js # DS集成服务(Mock)
│   │   └── DorisService.js      # Doris集成服务(Mock)
│   └── utils/                   # 工具函数
├── public/                      # 前端页面
│   ├── index.html               # 系统主页(原navigation-v2.html)
│   ├── dashboard.html           # 系统仪表板(原index.html)
│   ├── metrics-list.html        # 指标列表管理
│   ├── metrics-search.html      # 指标搜索页面
│   ├── sql-analyzer.html        # SQL血缘分析工具
│   ├── assets-catalog.html      # 数据资产目录
│   ├── api-tester.html          # API测试工具
│   ├── metric-lineage-graph.html # D3.js血缘图谱(优化版)
│   ├── neovis-lineage.html      # 模拟Neo4j血缘图(vis.js)
│   ├── neovis-lineage-real.html # 真实Neo4j血缘图(Neovis.js)
│   ├── lineage-demo.html        # 血缘演示页面
│   └── navigation-v2.html       # 原导航页面(已作为index.html)
├── config/
│   ├── database.js              # 数据库配置
│   └── 售前项目客户评级系统1.0.html # UI设计参考
├── scripts/
│   ├── init-database.sql        # 数据库初始化
│   ├── test-case-lineage.sql    # 测试数据
│   ├── create-metric-governance-tables.sql # 指标治理表
│   ├── create-test-workflow.js  # 测试工作流创建
│   ├── start-neo4j.sh          # Neo4j启动脚本
│   └── neo4j-init/             # Neo4j初始化目录
│       └── init-metrics-lineage.cypher # 血缘数据初始化
├── tests/                       # 测试文件
├── docs/                        # 文档
├── docker-compose.yml           # Docker编排
├── package.json                 # 项目配置
└── .env.example                # 环境变量示例
```

## 核心功能

### 1. 指标管理模块
- **指标列表管理** (`/metrics-list.html`)
  - 指标CRUD操作（创建、读取、更新、删除）
  - 分类筛选（业务、用户、流量、技术、服务）
  - 状态管理（启用/停用）
  - 数据质量评分显示
  - 批量操作和导入导出
- **智能搜索** (`/metrics-search.html`)
  - 关键词搜索与高亮显示
  - 多维度筛选（分类、频率、质量）
  - 高级搜索选项（时间范围、数据源）
  - 搜索历史和快速筛选

### 2. 血缘分析系统
- **SQL血缘分析** (`/sql-analyzer.html`)
  - CodeMirror SQL编辑器
  - 支持多种SQL类型（INSERT、CREATE TABLE AS、MERGE等）
  - 血缘关系解析和可视化
  - 示例SQL模板
- **可视化血缘图谱** (`/metric-lineage-graph.html`)
  - D3.js实现的交互式图谱
  - 支持6种节点类型（Table、Field、Metric、Report、Dashboard、API）
  - 智能文字适配和节点大小自动调整
  - 节点筛选、搜索、缩放功能
  - 血缘路径分析
- **Neo4j专业血缘图** (`/neovis-lineage.html`)
  - 基于Neovis.js的专业级图谱可视化
  - 真实Neo4j Browser界面风格
  - Cypher查询语言支持
  - 高级物理引擎和布局算法
  - 专业级节点和关系渲染

### 3. 数据资产管理
- **资产目录** (`/assets-catalog.html`)
  - 统一资产目录展示
  - 网格/列表视图切换
  - 分类树导航（Doris表、DS工作流、DS任务）
  - 资产详情查看和标签管理
- **元数据采集**
  - DolphinScheduler项目、工作流、任务信息
  - Doris数据库、表、列信息
  - 自动/手动采集机制

### 4. 开发者工具
- **API测试工具** (`/api-tester.html`)
  - 可视化API测试界面
  - 支持所有HTTP方法（GET、POST、PUT、DELETE）
  - 请求历史记录
  - 响应格式化显示
- **系统导航中心** (`/navigation-v2.html`)
  - Bootstrap 5统一设计风格
  - 6大功能模块快速访问
  - 实时系统状态监控
  - 响应式设计

### 5. 平台集成
- **DolphinScheduler集成** (Mock服务)
  - 项目、工作流、任务元数据采集
  - 任务依赖关系分析
  - 调度信息同步
- **Doris集成** (Mock服务)
  - 数据库、表、列信息同步
  - 表分区和统计信息
  - 数据血缘关系构建

### 6. 指标治理体系
- **指标元数据管理** (`metric_metadata`表)
  - 完整生命周期管理
  - 多维度分类和标签
  - 质量监控和使用统计
- **指标快照管理** (`metric_snapshots`表)
  - 历史数据存储
  - 趋势分析和对比
  - 数据质量评分
- **血缘依赖管理** (`metric_lineage`表)
  - 指标间依赖关系
  - 影响范围分析
  - 变更影响评估

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

### Neo4j代理 `/api/v1/neo4j` 🆕
- `GET /neo4j/health` - Neo4j连接健康检查
- `POST /neo4j/query` - 执行Cypher查询
- `GET /neo4j/stats` - 获取数据库统计信息

## 部署状态与访问信息

### ✅ 当前运行状态 (2025-06-25 最新)
- **应用状态**: 正常运行
- **系统主页**: http://localhost:3000 (新导航中心)
- **API服务**: http://localhost:3000/api/v1 (RESTful API)
- **健康检查**: http://localhost:3000/health
- **系统状态**: 🟢 核心服务健康 (Database、Redis、Mock Services)
- **数据库**: MySQL容器运行正常 (metrics-mysql:3307)
- **缓存**: Redis容器运行正常 (metrics-redis:6379)
- **DolphinScheduler**: Mock服务运行正常 (localhost:12345/dolphinscheduler)
- **Doris**: Mock服务运行正常 (localhost:8030/api/health)
- **Neo4j**: 图数据库运行正常 (localhost:7474/7687)

### 🌐 前端功能页面
- **导航中心**: `/navigation-v2.html` - 系统主页，Bootstrap 5设计
- **指标管理**: `/metrics-list.html` - 完整的指标CRUD操作
- **指标搜索**: `/metrics-search.html` - 智能搜索与筛选
- **SQL分析**: `/sql-analyzer.html` - CodeMirror SQL血缘分析工具
- **资产目录**: `/assets-catalog.html` - 数据资产统一管理
- **API测试**: `/api-tester.html` - 可视化API测试工具
- **血缘图谱**: 
  - `/metric-lineage-graph.html` - D3.js交互式血缘图（已优化文字适配）
  - `/neovis-lineage.html` - 模拟Neo4j界面（vis.js）
  - `/neovis-lineage-real.html` - 真实Neovis.js（需解决连接问题）
  - `/neo4j-http-graph.html` - HTTP API方案（稳定可靠）
  - `/neovis-proxy.html` - 服务器代理方案（推荐使用）✨
- **血缘演示**: `/lineage-demo.html` - 血缘关系演示页面
- **导航中心**: `/index.html` - 新的系统主页

### 📊 测试数据与案例
- **示例指标**: 5个业务指标（日活、转化率、满意度等）
- **测试血缘**: 6张测试表的完整血缘关系
- **Mock工作流**: DolphinScheduler工作流和任务数据
- **指标治理**: 完整的元数据、快照、血缘表结构

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
7. **DolphinScheduler连接问题** → 修复URL路径重复问题
8. **Doris部署复杂性** → 使用Mock服务简化部署
9. **系统健康检查失败** → 优化服务连接和检查逻辑
10. **前端页面缺失** → 创建完整的功能页面体系
11. **导航链接断开** → 更新所有导航链接到实际页面

### 当前存在的问题
1. **SQL参数绑定错误** - 部分API查询存在参数个数不匹配
2. **表结构不一致** - data_lineage表缺少project_code和workflow_code字段
3. **字段名不匹配** - SQL查询中的sql_content字段与实际表结构不符
4. **空值处理** - 部分查询返回null值导致前端显示异常

### 配置要求  
1. **字符集**: 数据库连接必须使用utf8mb4字符集
2. **端口配置**: MySQL使用3307端口避免冲突
3. **Docker网络**: 确保容器间网络通信正常
4. **权限配置**: MySQL允许从Docker网络连接

### 功能限制
1. **外部系统连接**: 当前使用Mock服务模拟DolphinScheduler和Doris
2. **SQL血缘解析**: 支持常见语句类型（INSERT、CREATE TABLE AS SELECT等）
3. **数据质量评分**: 范围0-100
4. **血缘分析深度**: 建议不超过5层
5. **查询性能**: 大量数据查询时使用分页避免超时
6. **Mock服务限制**: 提供基础API响应，不包含真实数据处理

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
- 遵循RESTful API设计
- 使用环境变量管理配置
- 错误处理和日志记录
- 前端页面统一使用Bootstrap 5设计风格
- 所有页面包含返回导航中心的链接
- API接口统一返回JSON格式 {success: boolean, data: any, message?: string}

## 最新更新记录 (2025-06-25)

### ✅ 完成项目
1. **创建完整前端页面体系**
   - `metrics-list.html` - 指标列表管理页面
   - `metrics-search.html` - 指标搜索页面  
   - `sql-analyzer.html` - SQL血缘分析工具
   - `assets-catalog.html` - 数据资产目录
   - `api-tester.html` - API测试工具
   - `dashboard.html` - 系统仪表板（原index.html）

2. **统一导航系统**
   - 确定`navigation-v2.html`为系统主页(现index.html)
   - 更新所有导航链接指向实际功能页面
   - 采用Bootstrap 5统一设计风格
   - 所有页面统一使用CSS变量系统

3. **血缘图谱可视化优化**
   - **D3.js血缘图优化** (`metric-lineage-graph.html`)
     - 智能文字适配：根据文字长度动态调整节点大小
     - 智能文字截断：长文字自动截断并显示省略号
     - 自适应字体大小：不同长度文字使用合适字体
     - 完整文字tooltip：hover显示完整节点名称
     - 动态碰撞检测：防止节点重叠，优化布局
   - **模拟Neovis.js血缘图** (`neovis-lineage.html`) 
     - 使用vis.js模拟Neo4j风格（无需真实Neo4j）
     - Neo4j Browser界面设计
     - 模拟Cypher查询功能
     - 预设查询模板
   - **真实Neovis.js血缘图** (`neovis-lineage-real.html`) 🆕
     - 需要Neo4j数据库运行
     - 真正的Neovis.js集成
     - 实时Cypher查询执行
     - 专业图数据库功能
   - **HTTP API血缘图** (`neo4j-http-graph.html`) 🆕
     - 使用Neo4j HTTP API避开Bolt协议限制
     - vis.js渲染图形
     - 支持完整Cypher查询
     - 适合生产环境
   - **服务器代理方案** (`neovis-proxy.html`) 🆕✨
     - 通过服务器端代理解决所有连接问题
     - 现代化自定义UI设计
     - 完整的查询和可视化功能
     - **推荐使用的最终方案**

4. **Neo4j图数据库集成** 🆕
   - 创建`docker-compose-neo4j.yml`配置
   - 编写初始化Cypher脚本(`scripts/neo4j-init/init-metrics-lineage.cypher`)
   - 预加载完整的指标血缘测试数据
   - 启动脚本`scripts/start-neo4j.sh`
   - Neo4j访问信息：
     - Browser: http://localhost:7474
     - Bolt: bolt://localhost:7687
     - 用户名: neo4j
     - 密码: metrics123

5. **功能特性完善**
   - CodeMirror SQL编辑器集成
   - 响应式设计适配移动端
   - API测试工具支持历史记录
   - 服务器网络绑定修复(0.0.0.0)

### 🔄 待完善项目
1. **数据库问题修复**
   - 修复SQL参数绑定错误
   - 统一表结构和字段命名
   - 完善错误处理机制

2. **功能页面补充**
   - 指标分类管理页面
   - 系统配置管理页面
   - 采集日志查看页面
   - Mock数据管理工具

3. **性能优化**
   - API响应时间优化
   - 前端页面加载优化
   - 大数据量查询分页处理