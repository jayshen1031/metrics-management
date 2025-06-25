#!/bin/bash

# 修复DolphinScheduler配置问题

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'

print_message() {
    echo -e "${1}${2}\033[0m"
}

print_message $BLUE "🔧 修复DolphinScheduler配置..."

# 停止有问题的容器
print_message $YELLOW "停止现有容器..."
docker stop dolphinscheduler-api dolphinscheduler-zookeeper 2>/dev/null
docker rm dolphinscheduler-api dolphinscheduler-zookeeper 2>/dev/null

# 启动修复后的Zookeeper（允许ruok命令）
print_message $BLUE "启动修复后的Zookeeper..."
docker run -d \
  --name dolphinscheduler-zookeeper \
  --network metrics-management_metrics-network \
  -p 2181:2181 \
  -e ZOO_MY_ID=1 \
  -e ZOO_SERVERS="server.1=0.0.0.0:2888:3888;2181" \
  -e ZOO_4LW_COMMANDS_WHITELIST="mntr,conf,ruok" \
  zookeeper:3.7

sleep 15

# 测试Zookeeper
print_message $YELLOW "测试Zookeeper连接..."
if docker exec dolphinscheduler-zookeeper bash -c "echo ruok | nc localhost 2181" | grep -q "imok"; then
    print_message $GREEN "✅ Zookeeper运行正常"
    
    # 启动DolphinScheduler API
    print_message $BLUE "启动DolphinScheduler API..."
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
    
    print_message $GREEN "✅ DolphinScheduler API启动完成"
    print_message $YELLOW "等待服务就绪..."
    sleep 30
    
    # 测试API
    if curl -f http://localhost:12345/dolphinscheduler/actuator/health &> /dev/null; then
        print_message $GREEN "🎉 DolphinScheduler部署成功！"
        echo "访问地址: http://localhost:12345/dolphinscheduler/ui"
        echo "默认账号: admin / dolphinscheduler123"
    else
        print_message $YELLOW "⚠️ API可能仍在启动中，请稍后测试"
    fi
else
    print_message $YELLOW "⚠️ Zookeeper启动失败"
fi