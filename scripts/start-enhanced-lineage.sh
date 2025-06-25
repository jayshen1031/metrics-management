#!/bin/bash

# 启动增强版血缘分析系统
# 包含Python SQLLineage服务和Node.js主应用

echo "🚀 启动增强版血缘分析系统..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请启动Docker Desktop"
    exit 1
fi

# 构建Python血缘服务
echo "📦 构建Python血缘服务..."
cd python-lineage-service

# 创建Python虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "🐍 创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📥 安装Python依赖..."
pip install -r requirements.txt

# 启动Python服务
echo "🔥 启动Python血缘分析服务..."
export FLASK_ENV=development
export PYTHONPATH=/app
nohup python app.py > python-lineage.log 2>&1 &
PYTHON_PID=$!

echo "✅ Python血缘服务已启动 (PID: $PYTHON_PID, Port: 5000)"

# 返回主目录
cd ..

# 设置环境变量
export PYTHON_LINEAGE_SERVICE_URL=http://localhost:5000

# 等待Python服务启动
echo "⏳ 等待Python服务启动..."
for i in {1..30}; do
    if curl -s http://localhost:5000/health > /dev/null; then
        echo "✅ Python服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Python服务启动超时"
        exit 1
    fi
    sleep 1
done

# 启动主应用
echo "🚀 启动Node.js主应用..."
npm run dev &
NODE_PID=$!

echo "✅ Node.js应用已启动 (PID: $NODE_PID, Port: 3000)"

echo ""
echo "🎉 增强版血缘分析系统启动完成！"
echo ""
echo "📊 服务地址："
echo "   - 主应用: http://localhost:3000"
echo "   - 导航中心: http://localhost:3000/navigation-v2.html"
echo "   - SQL分析工具: http://localhost:3000/sql-analyzer.html"
echo "   - Python血缘服务: http://localhost:5000"
echo ""
echo "🛠️ 功能特性："
echo "   ✅ 智能SQL复杂度检测"
echo "   ✅ SQLLineage企业级解析"
echo "   ✅ 正则表达式快速解析"
echo "   ✅ 自动回退机制"
echo "   ✅ 批量血缘分析"
echo ""
echo "🔧 停止服务："
echo "   kill $PYTHON_PID $NODE_PID"
echo ""

# 保存PID到文件
echo "$PYTHON_PID" > python-lineage.pid
echo "$NODE_PID" > node-app.pid

# 等待用户停止
echo "按 Ctrl+C 停止所有服务..."
trap "echo ''; echo '🛑 停止服务...'; kill $PYTHON_PID $NODE_PID 2>/dev/null; exit 0" INT

# 保持脚本运行
wait