#!/bin/bash

# 设置Docker代理并启动环境

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 设置代理环境变量
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
export NO_PROXY=localhost,127.0.0.1,docker.internal,host.docker.internal

print_message $BLUE "🔧 配置Docker代理..."
print_message $YELLOW "HTTP_PROXY=$HTTP_PROXY"
print_message $YELLOW "HTTPS_PROXY=$HTTPS_PROXY"

# 配置Docker daemon代理（如果需要）
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_message $BLUE "📝 提示：如果下载仍然失败，请在Docker Desktop中配置代理："
    echo "Docker Desktop → Settings → Resources → Proxies"
    echo "HTTP proxy: http://127.0.0.1:7890"
    echo "HTTPS proxy: http://127.0.0.1:7890"
    echo ""
fi

# 启动docker-compose with proxy
print_message $BLUE "🚀 使用代理启动Docker容器..."

# 先尝试拉取镜像
docker-compose pull

# 启动容器
./scripts/docker-startup.sh