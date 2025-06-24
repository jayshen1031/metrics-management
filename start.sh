#!/bin/bash

# 指标管理平台启动脚本
# 使用方法: ./start.sh [dev|prod|init]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查Node.js版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        print_message $RED "❌ Node.js 未安装，请先安装 Node.js >= 16.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_message $RED "❌ Node.js 版本过低，当前版本: $(node --version)，需要 >= 16.0.0"
        exit 1
    fi
    
    print_message $GREEN "✅ Node.js 版本检查通过: $(node --version)"
}

# 检查MySQL连接
check_mysql() {
    if ! command -v mysql &> /dev/null; then
        print_message $YELLOW "⚠️  MySQL 客户端未安装，跳过数据库连接检查"
        return 0
    fi
    
    if [ -f .env ]; then
        source .env
        print_message $BLUE "🔍 检查数据库连接..."
        
        # 简单的连接测试
        if mysql -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -u"${DB_USER:-root}" -p"${DB_PASSWORD}" -e "SELECT 1;" 2>/dev/null; then
            print_message $GREEN "✅ 数据库连接正常"
        else
            print_message $YELLOW "⚠️  数据库连接失败，请检查配置"
        fi
    else
        print_message $YELLOW "⚠️  .env 文件不存在，请先配置环境变量"
    fi
}

# 安装依赖
install_dependencies() {
    print_message $BLUE "📦 安装项目依赖..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        if [ $? -eq 0 ]; then
            print_message $GREEN "✅ 依赖安装成功"
        else
            print_message $RED "❌ 依赖安装失败"
            exit 1
        fi
    else
        print_message $GREEN "✅ 依赖已存在，跳过安装"
    fi
}

# 初始化数据库
init_database() {
    print_message $BLUE "🗄️  初始化数据库..."
    
    if [ ! -f .env ]; then
        print_message $RED "❌ .env 文件不存在，请先配置环境变量"
        exit 1
    fi
    
    source .env
    
    # 创建数据库
    print_message $BLUE "创建数据库: ${DB_NAME:-metrics_management}"
    mysql -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -u"${DB_USER:-root}" -p"${DB_PASSWORD}" \
          -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME:-metrics_management}\` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ 数据库创建成功"
    else
        print_message $RED "❌ 数据库创建失败"
        exit 1
    fi
    
    # 初始化表结构
    print_message $BLUE "初始化表结构..."
    mysql -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -u"${DB_USER:-root}" -p"${DB_PASSWORD}" \
          "${DB_NAME:-metrics_management}" < scripts/init-database.sql
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ 表结构初始化成功"
    else
        print_message $RED "❌ 表结构初始化失败"
        exit 1
    fi
}

# 检查环境配置
check_environment() {
    if [ ! -f .env ]; then
        print_message $YELLOW "⚠️  .env 文件不存在，从模板创建..."
        cp .env.example .env
        print_message $BLUE "📝 请编辑 .env 文件配置您的环境信息"
        print_message $BLUE "   特别是数据库、Doris、DolphinScheduler 的连接信息"
    else
        print_message $GREEN "✅ 环境配置文件存在"
    fi
}

# 启动开发服务器
start_dev() {
    print_message $BLUE "🚀 启动开发服务器..."
    npm run dev
}

# 启动生产服务器
start_prod() {
    print_message $BLUE "🚀 启动生产服务器..."
    npm start
}

# 显示帮助信息
show_help() {
    print_message $BLUE "指标管理平台启动脚本"
    echo ""
    echo "使用方法:"
    echo "  ./start.sh init    - 初始化项目（首次使用）"
    echo "  ./start.sh dev     - 启动开发服务器"
    echo "  ./start.sh prod    - 启动生产服务器"
    echo "  ./start.sh help    - 显示帮助信息"
    echo ""
    echo "首次使用步骤:"
    echo "  1. ./start.sh init"
    echo "  2. 编辑 .env 文件配置连接信息"
    echo "  3. ./start.sh dev"
}

# 初始化项目
init_project() {
    print_message $BLUE "🎯 初始化指标管理平台..."
    echo ""
    
    check_node_version
    check_environment
    install_dependencies
    check_mysql
    init_database
    
    echo ""
    print_message $GREEN "🎉 项目初始化完成！"
    print_message $BLUE "📝 请确保已正确配置 .env 文件，然后运行："
    print_message $BLUE "   ./start.sh dev    # 启动开发服务器"
    print_message $BLUE "   ./start.sh prod   # 启动生产服务器"
    echo ""
    print_message $BLUE "📚 更多信息请查看:"
    print_message $BLUE "   docs/QUICK_START.md       # 快速开始指南"
    print_message $BLUE "   docs/API_DOCUMENTATION.md # API文档"
}

# 主函数
main() {
    case "$1" in
        "init")
            init_project
            ;;
        "dev")
            check_node_version
            install_dependencies
            start_dev
            ;;
        "prod")
            check_node_version
            install_dependencies
            start_prod
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            print_message $YELLOW "⚠️  请指定操作类型"
            show_help
            ;;
        *)
            print_message $RED "❌ 未知的操作: $1"
            show_help
            exit 1
            ;;
    esac
}

# 检查脚本权限
if [ ! -x "$0" ]; then
    print_message $YELLOW "⚠️  脚本没有执行权限，正在添加..."
    chmod +x "$0"
fi

# 执行主函数
main "$@"