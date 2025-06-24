#!/bin/bash

# Docker环境启动脚本
# 用于启动Doris和DolphinScheduler测试环境

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印函数
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查Docker和Docker Compose
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_message $RED "❌ Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_message $RED "❌ Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    print_message $GREEN "✅ Docker环境检查通过"
}

# 清理旧容器
cleanup_containers() {
    print_message $BLUE "🧹 清理旧容器..."
    docker-compose down -v
}

# 启动容器
start_containers() {
    print_message $BLUE "🚀 启动容器..."
    docker-compose up -d
    
    if [ $? -ne 0 ]; then
        print_message $RED "❌ 容器启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_services() {
    print_message $BLUE "⏳ 等待服务启动..."
    
    # 等待MySQL就绪
    print_message $YELLOW "等待MySQL启动..."
    until docker exec metrics-mysql mysqladmin ping -h"localhost" --silent &> /dev/null; do
        printf '.'
        sleep 2
    done
    print_message $GREEN "✅ MySQL已就绪"
    
    # 等待Doris FE就绪
    print_message $YELLOW "等待Doris FE启动..."
    until curl -f http://localhost:8030/api/health &> /dev/null; do
        printf '.'
        sleep 5
    done
    print_message $GREEN "✅ Doris FE已就绪"
    
    # 等待DolphinScheduler API就绪
    print_message $YELLOW "等待DolphinScheduler启动..."
    sleep 30  # DolphinScheduler需要更长时间初始化
    until curl -f http://localhost:12345/dolphinscheduler/actuator/health &> /dev/null; do
        printf '.'
        sleep 5
    done
    print_message $GREEN "✅ DolphinScheduler已就绪"
}

# 初始化Doris
init_doris() {
    print_message $BLUE "📊 初始化Doris..."
    
    # 等待BE注册到FE
    sleep 10
    
    # 添加BE节点
    docker exec doris-fe mysql -h127.0.0.1 -P9030 -uroot -e "ALTER SYSTEM ADD BACKEND 'doris-be:9050';" 2>/dev/null || true
    
    # 初始化测试数据
    docker exec doris-fe mysql -h127.0.0.1 -P9030 -uroot < /scripts/init-doris.sql
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ Doris初始化完成"
    else
        print_message $YELLOW "⚠️  Doris初始化可能失败，请手动检查"
    fi
}

# 初始化DolphinScheduler
init_dolphinscheduler() {
    print_message $BLUE "🐬 初始化DolphinScheduler..."
    
    # 创建默认租户和用户
    docker exec dolphinscheduler-api bash -c "
        cd /opt/dolphinscheduler && \
        bash ./tools/bin/create-dolphinscheduler.sh
    " 2>/dev/null || true
    
    print_message $GREEN "✅ DolphinScheduler初始化完成"
}

# 显示访问信息
show_access_info() {
    print_message $BLUE "\n📋 服务访问信息:"
    echo ""
    print_message $GREEN "MySQL (指标管理平台元数据):"
    echo "  - 地址: localhost:3306"
    echo "  - 数据库: metrics_management"
    echo "  - 用户名: root / 密码: root123456"
    echo "  - 或使用: metrics / metrics123"
    echo ""
    print_message $GREEN "Doris:"
    echo "  - FE Web UI: http://localhost:8030"
    echo "  - MySQL协议: localhost:9030"
    echo "  - 用户名: root / 密码: (空)"
    echo ""
    print_message $GREEN "DolphinScheduler:"
    echo "  - Web UI: http://localhost:12345/dolphinscheduler/ui"
    echo "  - API: http://localhost:12345/dolphinscheduler"
    echo "  - 默认用户: admin / dolphinscheduler123"
    echo ""
    print_message $GREEN "Redis:"
    echo "  - 地址: localhost:6379"
    echo "  - 密码: (无)"
    echo ""
    print_message $GREEN "PostgreSQL (DolphinScheduler元数据):"
    echo "  - 地址: localhost:5432"
    echo "  - 数据库: dolphinscheduler"
    echo "  - 用户名: dolphinscheduler / 密码: dolphinscheduler123"
}

# 更新环境配置
update_env_file() {
    print_message $BLUE "📝 更新环境配置..."
    
    if [ -f .env ]; then
        # 备份原配置
        cp .env .env.backup
    else
        cp .env.example .env
    fi
    
    # 更新配置
    cat > .env << EOF
# 数据库配置 (用于存储元数据)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root123456
DB_NAME=metrics_management

# JWT配置
JWT_SECRET=your_jwt_secret_key_$(date +%s)
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3000
NODE_ENV=development

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 指标计算配置
METRIC_CALCULATION_INTERVAL=300000
DATA_RETENTION_DAYS=365

# DolphinScheduler配置
DOLPHINSCHEDULER_URL=http://localhost:12345/dolphinscheduler
DOLPHINSCHEDULER_USER=admin
DOLPHINSCHEDULER_PASSWORD=dolphinscheduler123
DOLPHINSCHEDULER_PROJECT_CODE=

# Doris配置
DORIS_FE_HOST=localhost
DORIS_FE_QUERY_PORT=9030
DORIS_FE_HTTP_PORT=8030
DORIS_USER=root
DORIS_PASSWORD=
DORIS_DATABASE=test_metrics

# 元数据采集配置
METADATA_COLLECT_INTERVAL=0 */6 * * *

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
EOF
    
    print_message $GREEN "✅ 环境配置已更新"
}

# 主函数
main() {
    print_message $BLUE "🎯 启动Doris和DolphinScheduler测试环境"
    echo ""
    
    # 检查Docker
    check_docker
    
    # 启动选项
    case "$1" in
        "stop")
            print_message $BLUE "⏹️  停止所有容器..."
            docker-compose stop
            exit 0
            ;;
        "down")
            print_message $BLUE "🗑️  删除所有容器和数据..."
            docker-compose down -v
            exit 0
            ;;
        "restart")
            print_message $BLUE "🔄 重启所有容器..."
            docker-compose restart
            exit 0
            ;;
        "logs")
            docker-compose logs -f
            exit 0
            ;;
        "clean")
            cleanup_containers
            ;;
        *)
            # 默认启动流程
            ;;
    esac
    
    # 创建必要的目录
    mkdir -p logs
    
    # 复制初始化脚本到容器可访问位置
    docker volume create metrics-scripts
    docker run --rm -v metrics-scripts:/scripts -v $(pwd)/scripts:/source alpine cp /source/init-doris.sql /scripts/
    
    # 启动容器
    start_containers
    
    # 等待服务就绪
    wait_for_services
    
    # 初始化服务
    init_doris
    init_dolphinscheduler
    
    # 更新环境配置
    update_env_file
    
    # 显示访问信息
    show_access_info
    
    print_message $GREEN "\n🎉 所有服务已启动成功！"
    print_message $BLUE "\n下一步:"
    echo "1. 启动指标管理平台: ./start.sh dev"
    echo "2. 访问各服务的Web UI进行管理"
    echo "3. 查看日志: ./scripts/docker-startup.sh logs"
    echo ""
    print_message $YELLOW "提示:"
    echo "- 停止服务: ./scripts/docker-startup.sh stop"
    echo "- 删除所有: ./scripts/docker-startup.sh down"
    echo "- 重启服务: ./scripts/docker-startup.sh restart"
}

# 执行主函数
main "$@"