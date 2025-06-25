#!/bin/bash

echo "🚀 启动 Neo4j 图数据库..."
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

# 停止并删除旧容器（如果存在）
echo "🧹 清理旧容器..."
docker-compose -f docker-compose-neo4j.yml down 2>/dev/null

# 启动 Neo4j
echo "🔄 启动 Neo4j 容器..."
docker-compose -f docker-compose-neo4j.yml up -d

# 等待 Neo4j 启动
echo "⏳ 等待 Neo4j 启动..."
sleep 5

# 检查健康状态
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec metrics-neo4j cypher-shell -u neo4j -p metrics123 "RETURN 1" > /dev/null 2>&1; then
        echo "✅ Neo4j 已成功启动！"
        break
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo ""
    echo "❌ Neo4j 启动超时"
    exit 1
fi

echo ""
echo "📊 Neo4j 访问信息："
echo "   - Browser UI: http://localhost:7474"
echo "   - Bolt URL: bolt://localhost:7687"
echo "   - 用户名: neo4j"
echo "   - 密码: metrics123"
echo ""
echo "💡 提示："
echo "   1. 打开 http://localhost:7474 访问 Neo4j Browser"
echo "   2. 使用上述凭据登录"
echo "   3. 运行 'MATCH (n) RETURN n LIMIT 50' 查看数据"
echo "   4. 访问 http://localhost:3000/neovis-lineage-real.html 查看血缘图"
echo ""
echo "🛑 停止 Neo4j: docker-compose -f docker-compose-neo4j.yml down"
echo ""