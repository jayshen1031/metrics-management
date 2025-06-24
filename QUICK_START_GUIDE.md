# 🚀 指标管理平台快速启动指南

## 📋 系统要求

- **Node.js**: >= 16.0.0 (当前测试: v22.11.0)
- **Docker**: >= 20.10
- **内存**: >= 4GB
- **磁盘**: >= 10GB

## ⚡ 一键启动 (推荐)

```bash
# 进入项目目录
cd /Users/jay/Documents/baidu/projects/metrics-management

# 启动所有服务
./quick-start.sh
```

## 🔧 手动启动步骤

### 1. 启动基础服务
```bash
# 启动MySQL和Redis容器
docker-compose -f docker-compose-minimal.yml up -d

# 等待服务就绪
sleep 15
```

### 2. 启动Mock服务
```bash
# 启动DolphinScheduler和Doris模拟服务
nohup node mock-services.js > mock-services.log 2>&1 &
```

### 3. 启动指标管理应用
```bash
# 安装依赖（首次运行）
yarn install

# 启动应用
nohup node src/app.js > app.log 2>&1 &
```

## 🌐 访问信息

### 主要服务
- **指标管理平台**: http://localhost:3000
- **API文档**: http://localhost:3000/api/v1
- **系统健康检查**: http://localhost:3000/health

### 数据库服务
- **MySQL**: localhost:3307 (root/root123456)
- **Redis**: localhost:6379

### 模拟服务
- **DolphinScheduler**: http://localhost:12345/dolphinscheduler
- **Doris**: http://localhost:8030/api/health

## 🎯 功能验证

### 1. 检查系统健康
```bash
curl http://localhost:3000/api/v1/system/health | jq .
```

预期结果：所有服务显示 `"status": "healthy"`

### 2. 访问前端界面
打开浏览器访问 http://localhost:3000
- 系统监控卡片应显示绿色状态
- 数据概览正常加载
- 指标管理功能可用

### 3. 测试API接口
```bash
# 获取指标列表
curl http://localhost:3000/api/v1/metrics | jq .

# 获取元数据概览
curl http://localhost:3000/api/v1/metadata/overview | jq .
```

## 🛠️ 常用操作

### 查看服务状态
```bash
# 查看Docker容器
docker ps | grep metrics

# 查看应用日志
tail -f app.log

# 查看Mock服务日志
tail -f mock-services.log
```

### 重启服务
```bash
# 重启指标管理应用
pkill -f "node src/app.js"
nohup node src/app.js > app.log 2>&1 &

# 重启Mock服务
pkill -f "node mock-services.js"
nohup node mock-services.js > mock-services.log 2>&1 &
```

### 停止所有服务
```bash
# 停止Node.js进程
pkill -f "node src/app.js"
pkill -f "node mock-services.js"

# 停止Docker容器
docker-compose -f docker-compose-minimal.yml down
```

## 🔍 故障排查

### 1. 端口冲突
如果3306端口被占用：
```bash
# 已配置使用3307端口，无需处理
# 检查端口使用情况
lsof -i :3307
```

### 2. 中文乱码
如果出现中文显示问题：
```bash
# 重新插入测试数据
docker exec -i metrics-mysql mysql -u root -proot123456 --default-character-set=utf8mb4 metrics_management < insert-clean-metrics.sql
```

### 3. 健康检查失败
```bash
# 检查服务状态
curl http://localhost:3000/api/v1/system/health

# 检查Mock服务
curl http://localhost:12345/dolphinscheduler/actuator/health
curl http://localhost:8030/api/health
```

### 4. 数据库连接问题
```bash
# 测试MySQL连接
docker exec metrics-mysql mysql -u root -proot123456 -e "SELECT 1"

# 检查容器日志
docker logs metrics-mysql
```

## 📁 重要文件说明

- `mock-services.js` - DolphinScheduler和Doris模拟服务
- `docker-compose-minimal.yml` - 基础容器配置
- `.env` - 环境变量配置
- `app.log` - 应用运行日志
- `mock-services.log` - Mock服务日志

## 🎯 下一步开发

1. **测试元数据采集**
   ```bash
   curl -X POST http://localhost:3000/api/v1/metadata/collect
   ```

2. **测试血缘分析**
   ```bash
   curl -X POST http://localhost:3000/api/v1/lineage/analyze-sql \
     -H "Content-Type: application/json" \
     -d '{"sql": "INSERT INTO target_table SELECT * FROM source_table"}'
   ```

3. **创建自定义指标**
   使用前端界面或API创建新的业务指标

## 📞 支持

如果遇到问题：
1. 查看 `DEPLOYMENT_STATUS_REPORT.md` 了解详细部署状态
2. 查看 `PROJECT_ITERATION_LOG.md` 了解已解决的问题
3. 检查 `CLAUDE.md` 了解完整项目信息

---

**🎉 恭喜！您的指标管理平台已成功部署并运行！**