const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');

// Neo4j 连接配置
const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'metrics123'),
    {
        encrypted: false,
        trust: 'TRUST_ALL_CERTIFICATES'
    }
);

// 健康检查
router.get('/health', async (req, res) => {
    const session = driver.session();
    try {
        await session.run('RETURN 1');
        res.json({ status: 'connected', message: 'Neo4j is healthy' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        await session.close();
    }
});

// 执行 Cypher 查询
router.post('/query', async (req, res) => {
    const { cypher, parameters = {} } = req.body;
    
    if (!cypher) {
        return res.status(400).json({ error: 'Cypher query is required' });
    }

    const session = driver.session();
    try {
        const result = await session.run(cypher, parameters);
        
        // 转换结果为前端友好的格式
        const nodes = [];
        const relationships = [];
        const nodeMap = new Map();

        result.records.forEach(record => {
            record.forEach((value, key) => {
                if (value && value.constructor.name === 'Node') {
                    // 处理节点
                    if (!nodeMap.has(value.identity.toString())) {
                        nodes.push({
                            id: value.identity.toString(),
                            labels: value.labels,
                            properties: value.properties
                        });
                        nodeMap.set(value.identity.toString(), true);
                    }
                } else if (value && value.constructor.name === 'Relationship') {
                    // 处理关系
                    relationships.push({
                        id: value.identity.toString(),
                        type: value.type,
                        startNode: value.start.toString(),
                        endNode: value.end.toString(),
                        properties: value.properties
                    });
                } else if (value && value.constructor.name === 'Path') {
                    // 处理路径
                    value.segments.forEach(segment => {
                        // 添加路径中的节点
                        [segment.start, segment.end].forEach(node => {
                            if (!nodeMap.has(node.identity.toString())) {
                                nodes.push({
                                    id: node.identity.toString(),
                                    labels: node.labels,
                                    properties: node.properties
                                });
                                nodeMap.set(node.identity.toString(), true);
                            }
                        });
                        
                        // 添加路径中的关系
                        relationships.push({
                            id: segment.relationship.identity.toString(),
                            type: segment.relationship.type,
                            startNode: segment.start.identity.toString(),
                            endNode: segment.end.identity.toString(),
                            properties: segment.relationship.properties
                        });
                    });
                }
            });
        });

        res.json({
            nodes,
            relationships,
            summary: {
                nodeCount: nodes.length,
                relationshipCount: relationships.length,
                queryTime: result.summary.resultAvailableAfter.toNumber()
            }
        });

    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// 获取数据库统计信息
router.get('/stats', async (req, res) => {
    const session = driver.session();
    try {
        const nodeCount = await session.run('MATCH (n) RETURN count(n) as count');
        const relCount = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
        const labels = await session.run('CALL db.labels() YIELD label RETURN collect(label) as labels');
        const relTypes = await session.run('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as types');

        res.json({
            nodeCount: nodeCount.records[0].get('count').toNumber(),
            relationshipCount: relCount.records[0].get('count').toNumber(),
            labels: labels.records[0].get('labels'),
            relationshipTypes: relTypes.records[0].get('types')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// 关闭驱动连接
process.on('exit', async () => {
    await driver.close();
});

module.exports = router;