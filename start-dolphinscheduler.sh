#!/bin/bash

# 启动DolphinScheduler脚本（忽略健康检查）

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}\033[0m"
}

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'

print_message $BLUE "🐬 启动DolphinScheduler..."

# 等待依赖服务稍微就绪
sleep 10

# 强制启动DolphinScheduler API（不等待健康检查）
print_message $YELLOW "启动DolphinScheduler API服务..."

docker run -d \
  --name dolphinscheduler-api \
  --network metrics-management_metrics-network \
  -p 12345:12345 \
  -e DATABASE_TYPE=postgresql \
  -e DATABASE_DRIVER=org.postgresql.Driver \
  -e DATABASE_HOST=dolphinscheduler-postgres \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USERNAME=dolphinscheduler \
  -e DATABASE_PASSWORD=dolphinscheduler123 \
  -e DATABASE_DATABASE=dolphinscheduler \
  -e ZOOKEEPER_QUORUM=dolphinscheduler-zookeeper:2181 \
  -e REGISTRY_TYPE=zookeeper \
  apache/dolphinscheduler-api:3.2.1

if [ $? -eq 0 ]; then
    print_message $GREEN "✅ DolphinScheduler API启动成功"
    print_message $BLUE "🔍 服务状态检查..."
    
    # 等待服务启动
    sleep 30
    
    # 检查服务状态
    if curl -f http://localhost:12345/dolphinscheduler/actuator/health &> /dev/null; then
        print_message $GREEN "✅ DolphinScheduler API健康检查通过"
    else
        print_message $YELLOW "⚠️ DolphinScheduler API可能仍在启动中"
    fi
    
    print_message $BLUE "📊 访问信息:"
    echo "  DolphinScheduler API: http://localhost:12345/dolphinscheduler"
    echo "  DolphinScheduler UI: http://localhost:12345/dolphinscheduler/ui"
    echo "  默认账号: admin / dolphinscheduler123"
else
    print_message $YELLOW "⚠️ DolphinScheduler启动可能失败，请检查日志"
fi