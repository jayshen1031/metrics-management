# 快速开始指南

本指南将帮助您快速部署和使用基于 Doris + DolphinScheduler 的指标管理平台。

## 前置条件

### 必需环境
- **Node.js** >= 16.0.0
- **MySQL** >= 8.0
- **已部署的 Apache Doris 集群**
- **已部署的 DolphinScheduler 平台**

### 确认现有平台
1. **确认 Doris 可访问**
   ```bash
   mysql -h your_doris_fe_host -P 9030 -u root -p
   ```

2. **确认 DolphinScheduler 可访问**
   ```bash
   curl http://your_dolphinscheduler_host:12345/dolphinscheduler/ui
   ```

## 安装步骤

### 1. 克隆项目
```bash
cd /Users/jay/Documents/baidu/projects/metrics-management
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置您的环境信息：

```bash
# 数据库配置 (用于存储元数据)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=metrics_management

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3000
NODE_ENV=development

# DolphinScheduler配置
DOLPHINSCHEDULER_URL=http://your_dolphinscheduler_host:12345
DOLPHINSCHEDULER_USER=admin
DOLPHINSCHEDULER_PASSWORD=dolphinscheduler123
DOLPHINSCHEDULER_PROJECT_CODE=your_project_code

# Doris配置
DORIS_FE_HOST=your_doris_fe_host
DORIS_FE_QUERY_PORT=9030
DORIS_FE_HTTP_PORT=8030
DORIS_USER=root
DORIS_PASSWORD=your_doris_password
DORIS_DATABASE=information_schema

# 元数据采集配置
METADATA_COLLECT_INTERVAL=0 */6 * * *
```

### 4. 初始化数据库
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS metrics_management DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 初始化表结构
mysql -u root -p metrics_management < scripts/init-database.sql
```

### 5. 启动服务
```bash
# 开发模式
npm run dev

# 或生产模式
npm start
```

### 6. 验证安装
```bash
# 检查服务状态
curl http://localhost:3000/health

# 检查API
curl http://localhost:3000/api/v1
```

## 首次使用

### 1. 测试平台连接
```bash
# 测试DolphinScheduler连接
curl -X POST http://localhost:3000/api/v1/system/test-connection \
  -H "Content-Type: application/json" \
  -d '{"service": "dolphinscheduler"}'

# 测试Doris连接  
curl -X POST http://localhost:3000/api/v1/system/test-connection \
  -H "Content-Type: application/json" \
  -d '{"service": "doris"}'
```

### 2. 启动元数据采集
```bash
# 启动定时采集
curl -X POST http://localhost:3000/api/v1/system/collection/start

# 或手动触发一次采集
curl -X POST http://localhost:3000/api/v1/metadata/collect
```

### 3. 查看数据资产概览
```bash
curl http://localhost:3000/api/v1/metadata/overview
```

### 4. 创建第一个指标
```bash
curl -X POST http://localhost:3000/api/v1/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "日订单数量",
    "description": "每日订单总数统计",
    "category": "业务指标",
    "unit": "笔",
    "calculation_formula": "COUNT(*)",
    "data_source": "orders_table",
    "update_frequency": "daily"
  }'
```

## 核心功能演示

### 1. 指标管理
```bash
# 获取所有指标
curl "http://localhost:3000/api/v1/metrics?page=1&limit=10"

# 搜索指标
curl "http://localhost:3000/api/v1/metrics/search/订单"

# 获取指标分类统计
curl "http://localhost:3000/api/v1/metrics/statistics/categories"
```

### 2. 血缘分析
```bash
# 分析SQL血缘
curl -X POST http://localhost:3000/api/v1/lineage/analyze-sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "INSERT INTO dw.fact_orders SELECT order_id, customer_id, amount FROM ods.raw_orders WHERE create_date = CURRENT_DATE",
    "context": {"defaultDatabase": "dw"}
  }'

# 获取表血缘图  
curl "http://localhost:3000/api/v1/lineage/table/dw.fact_orders?direction=both&depth=2"

# 生成血缘报告
curl "http://localhost:3000/api/v1/lineage/report/dw.fact_orders"
```

### 3. 数据资产管理
```bash
# 浏览数据资产目录
curl "http://localhost:3000/api/v1/assets/catalog?type=doris_table&page=1&limit=20"

# 搜索数据资产
curl "http://localhost:3000/api/v1/assets/search?keyword=order&limit=10"

# 查看资产详情
curl "http://localhost:3000/api/v1/assets/detail/doris_table/dw.fact_orders"
```

### 4. 元数据管理
```bash
# 获取DolphinScheduler项目
curl "http://localhost:3000/api/v1/metadata/dolphinscheduler/projects"

# 获取Doris数据库列表
curl "http://localhost:3000/api/v1/metadata/doris/databases"

# 获取表详情
curl "http://localhost:3000/api/v1/metadata/doris/tables/your_database/your_table"
```

## 常见问题

### Q1: 连接 DolphinScheduler 失败
**A:** 检查以下配置：
1. `DOLPHINSCHEDULER_URL` 是否正确
2. 用户名密码是否正确
3. DolphinScheduler 服务是否正常运行
4. 网络连通性

```bash
# 手动测试连接
curl http://your_dolphinscheduler_host:12345/dolphinscheduler/login \
  -d "userName=admin&userPassword=dolphinscheduler123"
```

### Q2: 连接 Doris 失败
**A:** 检查以下配置：
1. `DORIS_FE_HOST` 和端口配置是否正确
2. 用户权限是否足够
3. Doris FE 节点是否正常

```bash
# 测试MySQL协议连接
mysql -h your_doris_fe_host -P 9030 -u root -p -e "SHOW DATABASES;"

# 测试HTTP API
curl http://your_doris_fe_host:8030/api/show_data
```

### Q3: 元数据采集失败
**A:** 查看日志和采集记录：
```bash
# 查看采集日志
curl "http://localhost:3000/api/v1/system/collection/logs?limit=5"

# 查看系统健康状态
curl http://localhost:3000/api/v1/system/health
```

### Q4: SQL血缘解析不准确
**A:** 当前支持的SQL类型有限，包括：
- INSERT INTO ... SELECT
- CREATE TABLE ... AS SELECT  
- 简单的UPDATE语句

复杂SQL可能需要手动处理或扩展解析器。

### Q5: 性能优化
**A:** 针对大规模数据的优化建议：
1. 调整采集频率：修改 `METADATA_COLLECT_INTERVAL`
2. 使用分页查询：API调用时设置合适的 `limit`
3. 定期清理历史数据：使用系统管理API
4. 优化数据库索引：运行维护命令

```bash
# 数据库优化
curl -X POST http://localhost:3000/api/v1/system/maintenance \
  -H "Content-Type: application/json" \
  -d '{"operation": "optimize_tables"}'
```

## 监控和维护

### 系统监控
```bash
# 查看系统信息
curl http://localhost:3000/api/v1/system/info

# 查看采集状态
curl "http://localhost:3000/api/v1/system/collection/logs?status=success&limit=10"
```

### 数据清理
```bash
# 清理30天前的采集日志
curl -X POST http://localhost:3000/api/v1/system/cleanup \
  -H "Content-Type: application/json" \
  -d '{"type": "collection_logs", "days": 30}'
```

### 配置备份
```bash
# 导出指标配置
curl http://localhost:3000/api/v1/system/export/config > metrics-backup.json
```

## 下一步

1. **集成BI工具**: 通过API将指标数据接入您的BI系统
2. **权限控制**: 根据需要实现用户权限管理
3. **告警配置**: 设置指标异常告警机制
4. **自定义扩展**: 根据业务需求开发特定功能

## 技术支持

- **API文档**: `/docs/API_DOCUMENTATION.md`
- **项目记忆**: `/CLAUDE.md`
- **迭代日志**: `/PROJECT_ITERATION_LOG.md`

有问题请查看日志文件或联系技术支持。