# 指标血缘关系图谱设计方案

## 一、Neo4j 数据模型设计

### 1. 节点类型定义

```cypher
// 1. 表节点
(:Table {
  id: "dw.user_activity_log",
  name: "用户活动日志表",
  database: "dw",
  tableName: "user_activity_log",
  type: "fact",  // fact/dimension
  updateFrequency: "daily",
  owner: "数据平台组"
})

// 2. 字段节点
(:Field {
  id: "dw.user_activity_log.user_id",
  name: "用户ID",
  table: "dw.user_activity_log",
  fieldName: "user_id",
  dataType: "bigint",
  isPrimaryKey: false,
  isPartitionKey: false,
  description: "用户唯一标识"
})

// 3. 指标节点
(:Metric {
  id: "DAU",
  code: "DAU",
  name: "日活跃用户数",
  type: "atomic",  // atomic/derived/composite
  category: "用户指标",
  formula: "COUNT(DISTINCT user_id)",
  unit: "人",
  updateFrequency: "daily",
  sensitivity: "internal",  // public/internal/sensitive/confidential
  status: "online",  // draft/online/offline/deprecated
  importance: "P0",
  owner: "产品分析组"
})

// 4. 报表节点
(:Report {
  id: "daily_operation_report",
  name: "每日运营报表",
  type: "scheduled",  // scheduled/adhoc
  frequency: "daily",
  department: "运营部",
  owner: "张三",
  subscribers: 150
})

// 5. 看板节点
(:Dashboard {
  id: "executive_dashboard",
  name: "高管看板",
  type: "realtime",  // realtime/daily
  department: "管理层",
  owner: "李四",
  viewers: 50
})

// 6. API节点
(:API {
  id: "metric_query_api",
  name: "指标查询API",
  endpoint: "/api/v1/metrics/query",
  system: "数据服务平台",
  qps: 1000
})
```

### 2. 关系类型定义

```cypher
// 1. 表包含字段
(:Table)-[:HAS_FIELD]->(:Field)

// 2. 指标读取字段
(:Metric)-[:READS_FIELD {
  operation: "COUNT_DISTINCT",  // SUM/COUNT/AVG/MAX/MIN等
  filter: "status='active'"
}]->(:Field)

// 3. 指标依赖表
(:Metric)-[:DEPENDS_ON_TABLE {
  joinType: "direct",  // direct/join
  confidence: 1.0
}]->(:Table)

// 4. 指标依赖指标
(:Metric)-[:DEPENDS_ON_METRIC {
  formula: "GMV_DAILY / DAU",
  weight: 0.5,  // 在复合指标中的权重
  lag: 0  // 延迟天数
}]->(:Metric)

// 5. 报表使用指标
(:Report)-[:USES_METRIC {
  position: "主要指标",  // 主要指标/次要指标/参考指标
  displayName: "日活",
  updateTime: "02:00"
}]->(:Metric)

// 6. 看板展示指标
(:Dashboard)-[:DISPLAYS_METRIC {
  widgetType: "line_chart",  // line_chart/bar_chart/number_card
  position: "top_left",
  refreshInterval: 300  // 秒
}]->(:Metric)

// 7. API调用指标
(:API)-[:CALLS_METRIC {
  avgQPS: 100,
  peakQPS: 500,
  avgLatency: 50  // 毫秒
}]->(:Metric)
```

## 二、Cypher 查询模板

### 1. 查询指标的完整血缘（上游依赖）

```cypher
// 查询DAU指标的所有上游依赖
MATCH path = (m:Metric {code: 'DAU'})-[:DEPENDS_ON_TABLE|READS_FIELD|DEPENDS_ON_METRIC*1..5]->(upstream)
RETURN path

// 更详细的查询，包含节点和关系属性
MATCH (m:Metric {code: 'DAU'})
OPTIONAL MATCH (m)-[r1:DEPENDS_ON_TABLE]->(t:Table)
OPTIONAL MATCH (m)-[r2:READS_FIELD]->(f:Field)
OPTIONAL MATCH (m)-[r3:DEPENDS_ON_METRIC]->(m2:Metric)
RETURN m, 
       collect(DISTINCT {type: 'table', node: t, relation: r1}) as tables,
       collect(DISTINCT {type: 'field', node: f, relation: r2}) as fields,
       collect(DISTINCT {type: 'metric', node: m2, relation: r3}) as metrics
```

### 2. 查询指标的下游影响

```cypher
// 查询哪些报表/看板/API使用了DAU指标
MATCH (m:Metric {code: 'DAU'})<-[:USES_METRIC|DISPLAYS_METRIC|CALLS_METRIC|DEPENDS_ON_METRIC]-(downstream)
RETURN downstream, labels(downstream) as nodeType
ORDER BY nodeType

// 递归查询所有受影响的下游
MATCH path = (m:Metric {code: 'DAU'})<-[:USES_METRIC|DISPLAYS_METRIC|CALLS_METRIC|DEPENDS_ON_METRIC*1..3]-(downstream)
WHERE NOT (downstream)-[:USES_METRIC|DISPLAYS_METRIC|CALLS_METRIC|DEPENDS_ON_METRIC]->()
RETURN path
```

### 3. 查询指标的关键路径

```cypher
// 查找从源表到最终报表的关键路径
MATCH path = (t:Table)-[:HAS_FIELD]->(:Field)<-[:READS_FIELD]-(m:Metric {code: 'DAU'})<-[:USES_METRIC]-(r:Report)
RETURN path
ORDER BY length(path) DESC
LIMIT 10
```

### 4. 影响分析查询

```cypher
// 如果某个表发生变更，影响哪些指标和报表
MATCH (t:Table {id: 'dw.user_activity_log'})<-[:DEPENDS_ON_TABLE]-(m:Metric)
OPTIONAL MATCH (m)<-[:USES_METRIC|DISPLAYS_METRIC|CALLS_METRIC]-(downstream)
RETURN t.name as table,
       collect(DISTINCT m.name) as affectedMetrics,
       collect(DISTINCT downstream.name) as affectedDownstream,
       count(DISTINCT m) as metricCount,
       count(DISTINCT downstream) as downstreamCount
```

### 5. 指标热度分析

```cypher
// 查询最受欢迎的指标（被引用最多）
MATCH (m:Metric)<-[r:USES_METRIC|DISPLAYS_METRIC|CALLS_METRIC|DEPENDS_ON_METRIC]-(downstream)
RETURN m.code as metricCode,
       m.name as metricName,
       count(DISTINCT downstream) as usageCount,
       collect(DISTINCT labels(downstream)[0]) as usageTypes
ORDER BY usageCount DESC
LIMIT 20
```

## 三、D3.js 前端渲染设计

### 1. 布局建议

```javascript
// 使用力导向图布局，但添加分层约束
const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).distance(100))
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("layer", forceLayer()) // 自定义分层力
  .force("collision", d3.forceCollide().radius(30));

// 自定义分层力函数
function forceLayer() {
  const layers = {
    'Table': 0,
    'Field': 1,
    'Metric': 2,
    'Report': 3,
    'Dashboard': 3,
    'API': 3
  };
  
  return function(alpha) {
    nodes.forEach(d => {
      const targetY = (layers[d.type] || 0) * 150 + 100;
      d.vy += (targetY - d.y) * alpha * 0.1;
    });
  };
}
```

### 2. 节点样式设计

```javascript
// 节点形状和颜色映射
const nodeStyles = {
  'Table': {
    shape: 'rect',
    width: 120,
    height: 40,
    color: '#1890ff',
    icon: '📊'
  },
  'Field': {
    shape: 'circle',
    radius: 20,
    color: '#52c41a',
    icon: '🔤'
  },
  'Metric': {
    shape: 'hexagon',
    size: 35,
    color: '#fa8c16',
    icon: '📈'
  },
  'Report': {
    shape: 'rect',
    width: 100,
    height: 40,
    color: '#722ed1',
    icon: '📑'
  },
  'Dashboard': {
    shape: 'rect',
    width: 100,
    height: 40,
    color: '#eb2f96',
    icon: '📊'
  },
  'API': {
    shape: 'circle',
    radius: 25,
    color: '#13c2c2',
    icon: '🔌'
  }
};

// 节点重要性映射到大小
function getNodeSize(node) {
  const baseSizes = {
    'P0': 1.5,
    'P1': 1.2,
    'P2': 1.0,
    'P3': 0.8
  };
  return (baseSizes[node.importance] || 1.0) * nodeStyles[node.type].size;
}
```

### 3. 交互功能实现

```javascript
// 1. 节点点击展示详情
node.on('click', function(event, d) {
  showNodeDetails(d);
  highlightConnections(d);
});

// 2. 节点悬停高亮关联
node.on('mouseover', function(event, d) {
  // 降低所有节点和连线的透明度
  node.style('opacity', 0.3);
  link.style('opacity', 0.1);
  
  // 高亮相关节点和连线
  const connectedNodes = getConnectedNodes(d);
  node.filter(n => connectedNodes.includes(n.id))
    .style('opacity', 1);
  link.filter(l => l.source.id === d.id || l.target.id === d.id)
    .style('opacity', 1)
    .style('stroke-width', 3);
});

// 3. 缩放功能
const zoom = d3.zoom()
  .scaleExtent([0.1, 10])
  .on('zoom', (event) => {
    g.attr('transform', event.transform);
  });

svg.call(zoom);

// 4. 搜索功能
function searchNode(keyword) {
  const foundNodes = nodes.filter(n => 
    n.name.includes(keyword) || n.code?.includes(keyword)
  );
  
  if (foundNodes.length > 0) {
    // 缩放并居中到找到的节点
    const node = foundNodes[0];
    const transform = d3.zoomIdentity
      .translate(width / 2 - node.x, height / 2 - node.y)
      .scale(2);
    
    svg.transition()
      .duration(750)
      .call(zoom.transform, transform);
  }
}

// 5. 导出功能
function exportGraph() {
  // 导出为SVG
  const svgData = new XMLSerializer().serializeToString(svg.node());
  downloadFile('metric-lineage.svg', svgData);
  
  // 导出为PNG
  svgToPng(svg.node(), 'metric-lineage.png');
  
  // 导出为JSON（图数据）
  const graphData = {
    nodes: nodes,
    links: links
  };
  downloadFile('metric-lineage.json', JSON.stringify(graphData, null, 2));
}
```

### 4. 高级功能

```javascript
// 1. 路径分析
function findPath(sourceId, targetId) {
  // 使用广度优先搜索找到最短路径
  const path = bfs(nodes, links, sourceId, targetId);
  highlightPath(path);
}

// 2. 影响范围可视化
function showImpactRadius(nodeId, depth = 2) {
  const impactedNodes = new Set();
  const visited = new Set();
  
  function traverse(currentId, currentDepth) {
    if (currentDepth > depth || visited.has(currentId)) return;
    visited.add(currentId);
    impactedNodes.add(currentId);
    
    // 获取所有下游节点
    const downstream = links
      .filter(l => l.source.id === currentId)
      .map(l => l.target.id);
    
    downstream.forEach(id => traverse(id, currentDepth + 1));
  }
  
  traverse(nodeId, 0);
  
  // 高亮影响范围
  node.classed('impacted', d => impactedNodes.has(d.id));
}

// 3. 过滤器
const filters = {
  nodeType: new Set(['Table', 'Field', 'Metric', 'Report', 'Dashboard', 'API']),
  sensitivity: new Set(['public', 'internal', 'sensitive', 'confidential']),
  status: new Set(['online', 'offline', 'deprecated']),
  importance: new Set(['P0', 'P1', 'P2', 'P3'])
};

function applyFilters() {
  node.style('display', d => {
    return filters.nodeType.has(d.type) &&
           filters.sensitivity.has(d.sensitivity || 'public') &&
           filters.status.has(d.status || 'online') &&
           filters.importance.has(d.importance || 'P2') ? 'block' : 'none';
  });
  
  link.style('display', l => {
    const sourceVisible = filters.nodeType.has(l.source.type);
    const targetVisible = filters.nodeType.has(l.target.type);
    return sourceVisible && targetVisible ? 'block' : 'none';
  });
}
```

## 四、性能优化建议

1. **数据分页加载**：对于大规模图谱，实现按需加载
2. **节点聚合**：相似节点自动聚合，点击展开
3. **WebGL渲染**：使用 Three.js 或 Pixi.js 进行大规模图渲染
4. **缓存策略**：客户端缓存常用查询结果
5. **增量更新**：WebSocket 实时推送图谱变更

## 五、部署架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│   Node.js    │────▶│   Neo4j     │
│   (D3.js)   │◀────│   API层      │◀────│  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │    Redis     │
                    │   (Cache)    │
                    └──────────────┘
```

这套方案提供了完整的指标血缘管理能力，支持复杂的血缘关系查询和可视化展示。