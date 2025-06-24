# Docker测试环境部署指南

本指南将帮助您使用Docker Compose快速启动Doris和DolphinScheduler，用于测试指标管理平台。

## 环境要求

- **Docker** >= 20.10
- **Docker Compose** >= 1.29
- **可用内存** >= 8GB (推荐16GB)
- **磁盘空间** >= 20GB

## 包含的服务

1. **Apache Doris**
   - FE (Frontend) - 查询入口和元数据管理
   - BE (Backend) - 数据存储和计算

2. **Apache DolphinScheduler**
   - API Server - REST API服务
   - Master Server - 工作流调度
   - Worker Server - 任务执行
   - Alert Server - 告警服务

3. **基础服务**
   - MySQL 8.0 - 指标管理平台元数据
   - PostgreSQL 13 - DolphinScheduler元数据
   - Redis 7 - 缓存服务
   - Zookeeper 3.8 - DolphinScheduler协调服务

## 快速启动

### 1. 启动所有服务

```bash
# 进入项目目录
cd /Users/jay/Documents/baidu/projects/metrics-management

# 启动Docker容器
./scripts/docker-startup.sh
```

这个脚本会自动:
- 检查Docker环境
- 启动所有容器
- 等待服务就绪
- 初始化测试数据
- 更新环境配置文件

### 2. 验证服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看服务日志
./scripts/docker-startup.sh logs
```

## 服务访问信息

### MySQL (指标管理平台)
- **地址**: localhost:3306
- **数据库**: metrics_management
- **用户名/密码**: root/root123456 或 metrics/metrics123

### Doris
- **Web UI**: http://localhost:8030
- **MySQL协议**: localhost:9030
- **用户名/密码**: root/(空密码)

### DolphinScheduler
- **Web UI**: http://localhost:12345/dolphinscheduler/ui
- **API**: http://localhost:12345/dolphinscheduler
- **用户名/密码**: admin/dolphinscheduler123

### Redis
- **地址**: localhost:6379
- **密码**: (无)

## 测试数据说明

### Doris测试数据

系统会自动创建以下测试表和数据：

1. **用户活动日志表** (`user_activity_log`)
   - 用于演示DAU（日活跃用户）指标
   - 包含最近7天的用户登录数据

2. **订单表** (`orders`)
   - 用于演示订单相关指标
   - 包含订单金额、状态等信息

3. **示例视图**
   - `daily_active_users` - 日活跃用户统计
   - `daily_order_stats` - 日订单统计

### 测试SQL示例

```sql
-- 查询日活跃用户数
SELECT 
    create_date,
    COUNT(DISTINCT user_id) as dau
FROM test_metrics.user_activity_log
WHERE action_type IN ('login', 'active')
GROUP BY create_date
ORDER BY create_date DESC;

-- 查询订单统计
SELECT 
    create_date,
    COUNT(*) as order_count,
    SUM(order_amount) as total_amount
FROM test_metrics.orders
WHERE order_status = 'completed'
GROUP BY create_date;
```

## 常用操作

### 停止服务
```bash
./scripts/docker-startup.sh stop
```

### 删除所有容器和数据
```bash
./scripts/docker-startup.sh down
```

### 重启服务
```bash
./scripts/docker-startup.sh restart
```

### 查看日志
```bash
# 查看所有服务日志
./scripts/docker-startup.sh logs

# 查看特定服务日志
docker-compose logs -f doris-fe
docker-compose logs -f dolphinscheduler-api
```

## 故障排查

### 1. Doris BE无法连接FE

如果Doris BE无法注册到FE，手动执行：

```bash
# 进入FE容器
docker exec -it doris-fe bash

# 添加BE节点
mysql -h127.0.0.1 -P9030 -uroot -e "ALTER SYSTEM ADD BACKEND 'doris-be:9050';"

# 查看BE状态
mysql -h127.0.0.1 -P9030 -uroot -e "SHOW BACKENDS;"
```

### 2. DolphinScheduler无法访问

DolphinScheduler启动较慢，请等待1-2分钟。检查状态：

```bash
# 检查健康状态
curl http://localhost:12345/dolphinscheduler/actuator/health

# 查看日志
docker-compose logs dolphinscheduler-api
```

### 3. 内存不足

如果遇到内存问题，可以调整docker-compose.yml中的内存限制：

```yaml
services:
  doris-fe:
    environment:
      - JAVA_OPTS=-Xmx2g  # 减少内存使用
```

### 4. 端口冲突

如果端口被占用，修改docker-compose.yml中的端口映射：

```yaml
ports:
  - "13306:3306"  # 使用不同的主机端口
```

## 性能优化建议

1. **调整Docker资源限制**
   ```bash
   # Docker Desktop设置
   - CPUs: 4+
   - Memory: 8GB+
   - Swap: 2GB+
   ```

2. **优化Doris配置**
   - 修改`config/doris/fe.conf`和`be.conf`
   - 调整内存和并发参数

3. **数据持久化**
   - 容器重启后数据会保留
   - 使用命名卷存储重要数据

## 集成测试

### 1. 测试Doris连接

```javascript
// 使用Node.js测试
const mysql = require('mysql2/promise');

async function testDoris() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 9030,
        user: 'root',
        password: ''
    });
    
    const [rows] = await connection.execute('SHOW DATABASES');
    console.log('Doris databases:', rows);
    
    await connection.end();
}
```

### 2. 测试DolphinScheduler API

```bash
# 登录获取token
curl -X POST http://localhost:12345/dolphinscheduler/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "userName=admin&userPassword=dolphinscheduler123"

# 查询项目列表
curl -X GET http://localhost:12345/dolphinscheduler/projects \
  -H "token: your_token_here"
```

## 注意事项

1. **资源消耗**: 完整环境需要较多内存，建议在配置较高的机器上运行
2. **数据安全**: 这是测试环境，不要用于生产数据
3. **网络配置**: 所有服务在同一个Docker网络中通信
4. **持久化**: 数据存储在Docker卷中，`down`命令会删除所有数据

## 下一步

1. 启动指标管理平台
   ```bash
   ./start.sh dev
   ```

2. 创建测试指标
   - 使用Doris中的测试表作为数据源
   - 在DolphinScheduler中创建调度任务

3. 测试完整流程
   - 指标定义 → SQL模板 → 调度执行 → 结果查询

## 相关文档

- [快速开始指南](QUICK_START.md)
- [API文档](API_DOCUMENTATION.md)
- [Doris官方文档](https://doris.apache.org/docs/)
- [DolphinScheduler官方文档](https://dolphinscheduler.apache.org/zh-cn/docs/)