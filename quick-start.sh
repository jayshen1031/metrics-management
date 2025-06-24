#!/bin/bash

# 指标管理平台一键启动脚本

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

print_message $BLUE "🚀 启动指标管理平台..."

# 检查Docker
if ! command -v docker &> /dev/null; then
    print_message $RED "❌ Docker未安装，请先安装Docker"
    exit 1
fi

print_message $BLUE "📦 启动基础服务..."
# 启动MySQL和Redis
docker-compose -f docker-compose-minimal.yml up -d

print_message $YELLOW "⏳ 等待数据库就绪..."
sleep 15

print_message $BLUE "🎭 启动Mock服务..."
# 检查是否已有Mock服务运行
if pgrep -f "node mock-services.js" > /dev/null; then
    print_message $YELLOW "Mock服务已在运行，跳过启动"
else
    nohup node mock-services.js > mock-services.log 2>&1 &
    print_message $GREEN "✅ Mock服务启动成功"
fi

print_message $BLUE "📊 启动指标管理应用..."
# 检查依赖
if [ ! -d "node_modules" ]; then
    print_message $YELLOW "安装依赖..."
    yarn install
fi

# 检查是否已有应用运行
if pgrep -f "node src/app.js" > /dev/null; then
    print_message $YELLOW "应用已在运行，重启应用..."
    pkill -f "node src/app.js"
    sleep 2
fi

nohup node src/app.js > app.log 2>&1 &
print_message $GREEN "✅ 指标管理应用启动成功"

print_message $YELLOW "⏳ 等待所有服务就绪..."
sleep 10

# 健康检查
print_message $BLUE "🏥 执行健康检查..."
if curl -f http://localhost:3000/api/v1/system/health &> /dev/null; then
    print_message $GREEN "✅ 系统健康检查通过"
    
    # 显示详细状态
    print_message $BLUE "📊 服务状态详情:"
    curl -s http://localhost:3000/api/v1/system/health | jq '.data.services' 2>/dev/null || echo "JSON解析需要安装jq"
else
    print_message $YELLOW "⚠️ 健康检查失败，请稍后手动检查"
fi

print_message $BLUE "\n🌐 访问信息:"
echo "  前端界面: http://localhost:3000"
echo "  API文档:  http://localhost:3000/api/v1"
echo "  健康检查: http://localhost:3000/health"
echo ""
echo "  MySQL:    localhost:3307 (root/root123456)"
echo "  Redis:    localhost:6379"

print_message $BLUE "\n🔧 管理命令:"
echo "  查看应用日志: tail -f app.log"
echo "  查看Mock日志: tail -f mock-services.log"
echo "  停止所有服务: ./stop-all.sh"
echo "  重启应用:     ./restart-app.sh"

print_message $GREEN "\n🎉 指标管理平台启动完成！"
print_message $BLUE "访问 http://localhost:3000 开始使用"