#!/bin/bash

# Git推送脚本（使用HTTPS）

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

print_message $BLUE "🔄 切换到HTTPS remote..."

# 获取当前remote URL
current_url=$(git remote get-url origin)
print_message $YELLOW "当前URL: $current_url"

# 转换为HTTPS URL
https_url="https://github.com/jayshen1031/metrics-management.git"
print_message $YELLOW "HTTPS URL: $https_url"

# 更新remote
git remote set-url origin $https_url

print_message $GREEN "✅ Remote已更新为HTTPS"

# 推送代码
print_message $BLUE "🚀 推送代码到GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    print_message $GREEN "✅ 代码推送成功!"
    
    # 可选：切换回SSH
    print_message $BLUE "是否切换回SSH URL? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        git remote set-url origin git@github.com:jayshen1031/metrics-management.git
        print_message $GREEN "✅ 已切换回SSH URL"
    fi
else
    print_message $RED "❌ 推送失败，请检查："
    echo "1. GitHub用户名和密码/token"
    echo "2. 仓库是否存在"
    echo "3. 网络连接是否正常"
    echo ""
    print_message $YELLOW "💡 提示：GitHub现在需要使用Personal Access Token替代密码"
    echo "创建token: https://github.com/settings/tokens"
fi