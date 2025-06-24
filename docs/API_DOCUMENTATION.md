# 指标管理平台 API 文档

## 概述

基于 Doris + DolphinScheduler 的企业级指标管理平台，提供指标统一建模、血缘分析、元数据管理等功能。

## 基础信息

- **Base URL**: `http://localhost:3000/api/v1`
- **认证方式**: 暂未实现（后续可添加JWT）
- **数据格式**: JSON
- **字符编码**: UTF-8

## API 端点总览

### 1. 指标管理 `/metrics`

#### 获取所有指标
```http
GET /api/v1/metrics
```

**查询参数:**
- `category` (string): 指标分类过滤
- `status` (string): 状态过滤 (active/inactive)
- `page` (integer): 页码，默认 1
- `limit` (integer): 每页数量，默认 50

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "日活跃用户数",
      "description": "每日活跃用户数量统计",
      "category": "用户指标",
      "unit": "人",
      "calculation_formula": "COUNT(DISTINCT user_id)",
      "data_source": "user_activity_db",
      "update_frequency": "daily",
      "is_active": true,
      "created_at": "2025-06-24T10:00:00.000Z",
      "updated_at": "2025-06-24T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### 创建新指标
```http
POST /api/v1/metrics
```

**请求体:**
```json
{
  "name": "新指标名称",
  "description": "指标描述",
  "category": "业务指标",
  "unit": "元",
  "calculation_formula": "SUM(amount)",
  "data_source": "order_db",
  "update_frequency": "daily"
}
```

#### 获取指标趋势
```http
GET /api/v1/metrics/{id}/trend?days=30
```

### 2. 元数据管理 `/metadata`

#### 获取数据资产概览
```http
GET /api/v1/metadata/overview
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "dolphinscheduler": {
      "project_count": 5,
      "workflow_count": 23,
      "task_count": 156,
      "sql_task_count": 89
    },
    "doris": {
      "database_count": 8,
      "table_count": 245,
      "column_count": 1823,
      "total_rows": 15678901
    },
    "lineage": {
      "relation_count": 267,
      "source_count": 123,
      "target_count": 189
    },
    "lastCollectionTime": "2025-06-24T14:30:00.000Z"
  }
}
```

#### 触发元数据采集
```http
POST /api/v1/metadata/collect
```

**请求体:**
```json
{
  "force": false
}
```

#### 获取 DolphinScheduler 项目列表
```http
GET /api/v1/metadata/dolphinscheduler/projects
```

#### 获取 Doris 数据库列表
```http
GET /api/v1/metadata/doris/databases
```

#### 获取表详情
```http
GET /api/v1/metadata/doris/tables/{database}/{table}
```

### 3. 血缘分析 `/lineage`

#### 分析 SQL 血缘关系
```http
POST /api/v1/lineage/analyze-sql
```

**请求体:**
```json
{
  "sql": "INSERT INTO target_db.target_table SELECT * FROM source_db.source_table",
  "context": {
    "defaultDatabase": "source_db"
  }
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "targetTables": [
      {
        "database": "target_db",
        "table": "target_table",
        "fullName": "target_db.target_table",
        "exists": true
      }
    ],
    "sourceTables": [
      {
        "database": "source_db",
        "table": "source_table",
        "fullName": "source_db.source_table",
        "exists": true
      }
    ],
    "operations": ["INSERT"],
    "columnMappings": []
  },
  "tables": ["source_db.source_table", "target_db.target_table"],
  "columns": []
}
```

#### 获取表级血缘图
```http
GET /api/v1/lineage/table/{tableName}?direction=both&depth=3
```

**查询参数:**
- `direction` (string): 血缘方向 (upstream/downstream/both)
- `depth` (integer): 查询深度，默认 3

#### 分析血缘影响范围
```http
GET /api/v1/lineage/impact/{tableName}?changeType=schema
```

#### 生成血缘报告
```http
GET /api/v1/lineage/report/{tableName}
```

### 4. 数据资产管理 `/assets`

#### 获取数据资产目录
```http
GET /api/v1/assets/catalog
```

**查询参数:**
- `type` (string): 资产类型过滤
- `category` (string): 分类过滤
- `page` (integer): 页码
- `limit` (integer): 每页数量

#### 获取资产详情
```http
GET /api/v1/assets/detail/{assetType}/{assetId}
```

**支持的资产类型:**
- `doris_table`: Doris 表
- `dolphinscheduler_workflow`: DolphinScheduler 工作流
- `dolphinscheduler_task`: DolphinScheduler 任务

#### 搜索数据资产
```http
GET /api/v1/assets/search?keyword=user&type=doris_table&limit=20
```

#### 管理资产标签
```http
POST /api/v1/assets/{assetId}/tags
```

**请求体:**
```json
{
  "tags": ["业务关键", "日报表", "用户数据"]
}
```

#### 获取资产统计信息
```http
GET /api/v1/assets/statistics
```

### 5. 系统管理 `/system`

#### 系统健康检查
```http
GET /api/v1/system/health
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-06-24T15:00:00.000Z",
    "services": {
      "database": {
        "status": "healthy",
        "message": "数据库连接正常"
      },
      "dolphinscheduler": {
        "status": "healthy",
        "message": "DolphinScheduler连接正常"
      },
      "doris": {
        "status": "healthy",
        "message": "Doris连接正常"
      }
    },
    "version": "1.0.0"
  }
}
```

#### 获取系统信息
```http
GET /api/v1/system/info
```

#### 启动/停止元数据采集调度
```http
POST /api/v1/system/collection/start
POST /api/v1/system/collection/stop
```

#### 测试连接
```http
POST /api/v1/system/test-connection
```

**请求体:**
```json
{
  "service": "dolphinscheduler"
}
```

## 错误响应

所有 API 在发生错误时返回统一格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

**常见状态码:**
- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `409`: 冲突（如任务已在运行）
- `500`: 服务器内部错误

## 使用示例

### 完整的指标管理流程

1. **创建指标**
```bash
curl -X POST http://localhost:3000/api/v1/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "订单转化率",
    "description": "订单转化率指标",
    "category": "业务指标",
    "unit": "%",
    "calculation_formula": "(orders/visits)*100",
    "data_source": "analytics_db",
    "update_frequency": "daily"
  }'
```

2. **添加指标值**
```bash
curl -X POST http://localhost:3000/api/v1/metrics/1/values \
  -H "Content-Type: application/json" \
  -d '{
    "value": 12.5,
    "calculationDate": "2025-06-24",
    "dataQualityScore": 95
  }'
```

3. **查看指标趋势**
```bash
curl "http://localhost:3000/api/v1/metrics/1/trend?days=30"
```

### 血缘分析流程

1. **分析 SQL 血缘**
```bash
curl -X POST http://localhost:3000/api/v1/lineage/analyze-sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "INSERT INTO dw.fact_orders SELECT * FROM ods.orders WHERE date = \"2025-06-24\"",
    "context": {"defaultDatabase": "dw"}
  }'
```

2. **获取表血缘图**
```bash
curl "http://localhost:3000/api/v1/lineage/table/dw.fact_orders?direction=both&depth=2"
```

3. **分析影响范围**
```bash
curl "http://localhost:3000/api/v1/lineage/impact/dw.fact_orders?changeType=schema"
```

## 最佳实践

1. **元数据采集**: 建议每6小时自动采集一次，或在数据结构变更后手动触发
2. **血缘分析**: 对于复杂 SQL，建议先在测试环境验证血缘解析结果
3. **性能优化**: 大量数据查询时使用分页参数，避免超时
4. **错误处理**: 始终检查响应的 `success` 字段，并处理可能的错误情况

## 扩展功能

平台支持以下扩展：
- 自定义指标计算公式
- 多数据源连接
- 权限控制集成
- 告警规则配置
- 数据质量监控