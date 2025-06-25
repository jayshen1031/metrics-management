#!/bin/bash

# 核心服务部署脚本
# 优先启动MySQL、Redis和Doris，避免一次性启动所有服务

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message $BLUE "🚀 开始部署核心服务..."

# 创建必要的目录
mkdir -p logs config/doris

# 检查Docker
if ! command -v docker &> /dev/null; then
    print_message $RED "❌ Docker未安装"
    exit 1
fi

# 启动基础服务
print_message $BLUE "📦 启动MySQL和Redis..."
docker-compose up -d mysql redis

# 等待MySQL就绪
print_message $YELLOW "⏳ 等待MySQL启动..."
sleep 15
until docker exec metrics-mysql mysqladmin ping -h"localhost" --silent &> /dev/null; do
    printf '.'
    sleep 2
done
print_message $GREEN "✅ MySQL已就绪"

# 尝试启动Doris FE
print_message $BLUE "🗄️ 启动Doris FE..."
if docker-compose up -d doris-fe; then
    print_message $GREEN "✅ Doris FE启动成功"
    
    # 等待FE就绪
    print_message $YELLOW "⏳ 等待Doris FE启动..."
    sleep 30
    
    # 启动BE
    print_message $BLUE "💾 启动Doris BE..."
    if docker-compose up -d doris-be; then
        print_message $GREEN "✅ Doris BE启动成功"
    else
        print_message $YELLOW "⚠️ Doris BE启动失败，继续使用基础服务"
    fi
else
    print_message $YELLOW "⚠️ Doris FE启动失败，继续使用基础服务"
fi

# 显示服务状态
print_message $BLUE "📊 服务状态:"
docker-compose ps

print_message $GREEN "🎉 核心服务部署完成！"
print_message $BLUE "访问信息:"
echo "  MySQL: localhost:3307"
echo "  Redis: localhost:6379"
echo "  Doris FE: http://localhost:8030 (如果启动成功)"
echo "  Doris Query: localhost:9030 (如果启动成功)"