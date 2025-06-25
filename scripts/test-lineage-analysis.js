const axios = require('axios');

// API基础配置
const API_BASE = 'http://localhost:3000/api/v1';

// 测试SQL列表
const testSQLs = [
  {
    name: '销售数据汇总',
    sql: `INSERT INTO test_sales_summary (
      summary_date, product_id, product_name, category, region,
      total_quantity, total_amount, total_cost, gross_profit,
      order_count, customer_count
    )
    SELECT 
      DATE(sr.order_date) as summary_date,
      sr.product_id,
      sr.product_name,
      dp.category,
      sr.region,
      SUM(sr.quantity) as total_quantity,
      SUM(sr.total_amount) as total_amount,
      SUM(sr.quantity * dp.cost) as total_cost,
      SUM(sr.total_amount) - SUM(sr.quantity * dp.cost) as gross_profit,
      COUNT(DISTINCT sr.order_id) as order_count,
      COUNT(DISTINCT sr.customer_id) as customer_count
    FROM test_sales_raw sr
    LEFT JOIN test_dim_product dp ON sr.product_id = dp.product_id
    WHERE sr.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(sr.order_date), sr.product_id, sr.product_name, dp.category, sr.region`,
    source: 'DolphinScheduler',
    metadata: {
      project: '销售数据分析项目',
      workflow: '销售指标计算工作流',
      task: '销售数据汇总'
    }
  },
  {
    name: '销售指标计算',
    sql: `INSERT INTO test_sales_metrics (
      metric_date, metric_type, metric_name, dimension_type, dimension_value, metric_value
    )
    SELECT 
      summary_date as metric_date,
      '销售额' as metric_type,
      '产品类别销售额' as metric_name,
      '产品类别' as dimension_type,
      category as dimension_value,
      SUM(total_amount) as metric_value
    FROM test_sales_summary
    GROUP BY summary_date, category`,
    source: 'DolphinScheduler',
    metadata: {
      project: '销售数据分析项目',
      workflow: '销售指标计算工作流',
      task: '销售指标计算'
    }
  },
  {
    name: '客户价值分析',
    sql: `INSERT INTO test_customer_value_analysis (
      analysis_date, customer_id, customer_name, customer_type,
      total_purchase_amount, total_order_count, avg_order_amount,
      purchase_frequency, last_purchase_date, customer_lifetime_value,
      customer_segment
    )
    SELECT 
      CURDATE() as analysis_date,
      sr.customer_id,
      sr.customer_name,
      dc.customer_type,
      SUM(sr.total_amount) as total_purchase_amount,
      COUNT(DISTINCT sr.order_id) as total_order_count,
      AVG(sr.total_amount) as avg_order_amount,
      COUNT(DISTINCT sr.order_id) / DATEDIFF(MAX(sr.order_date), MIN(sr.order_date) + 1) * 30 as purchase_frequency,
      MAX(sr.order_date) as last_purchase_date,
      SUM(sr.total_amount) * 2 as customer_lifetime_value,
      CASE 
        WHEN SUM(sr.total_amount) > 100000 THEN 'VIP'
        WHEN SUM(sr.total_amount) > 50000 THEN '高价值'
        WHEN SUM(sr.total_amount) > 20000 THEN '中价值'
        ELSE '普通'
      END as customer_segment
    FROM test_sales_raw sr
    LEFT JOIN test_dim_customer dc ON sr.customer_id = dc.customer_id
    GROUP BY sr.customer_id, sr.customer_name, dc.customer_type`,
    source: 'DolphinScheduler',
    metadata: {
      project: '销售数据分析项目',
      workflow: '销售指标计算工作流',
      task: '客户价值分析'
    }
  }
];

// 分析血缘关系
async function analyzeLineage() {
  try {
    console.log('开始分析测试案例血缘关系...\n');
    
    // 1. 分析每个SQL的血缘关系
    for (const testSQL of testSQLs) {
      console.log(`\n分析任务: ${testSQL.name}`);
      console.log('=' .repeat(50));
      
      const response = await axios.post(`${API_BASE}/lineage/analyze-sql`, {
        sql: testSQL.sql,
        source: testSQL.source,
        metadata: testSQL.metadata
      });
      
      const result = response.data.data;
      console.log(`✓ 发现 ${result.lineageCount} 个血缘关系`);
      
      if (result.lineageRelations && result.lineageRelations.length > 0) {
        console.log('\n血缘关系详情:');
        result.lineageRelations.forEach(relation => {
          console.log(`  - ${relation.source_table} → ${relation.target_table}`);
          console.log(`    关系类型: ${relation.relation_type}`);
          console.log(`    影响字段: ${relation.target_columns || '全部字段'}`);
        });
      }
    }
    
    // 2. 查询整体血缘统计
    console.log('\n\n整体血缘统计');
    console.log('=' .repeat(50));
    
    const stats = await axios.get(`${API_BASE}/lineage/statistics`);
    const statsData = stats.data.data;
    console.log(`总表数量: ${statsData.totalTables}`);
    console.log(`血缘关系数: ${statsData.totalRelations}`);
    console.log(`有上游的表: ${statsData.tablesWithUpstream}`);
    console.log(`有下游的表: ${statsData.tablesWithDownstream}`);
    
    // 3. 展示关键表的血缘图
    console.log('\n\n关键表血缘分析');
    console.log('=' .repeat(50));
    
    const keyTables = ['test_sales_summary', 'test_sales_metrics', 'test_customer_value_analysis'];
    
    for (const table of keyTables) {
      console.log(`\n表: ${table}`);
      
      // 获取上游依赖
      const upstream = await axios.get(`${API_BASE}/lineage/upstream/${table}`);
      if (upstream.data.data && upstream.data.data.length > 0) {
        console.log('  上游依赖:');
        upstream.data.data.forEach(dep => {
          console.log(`    - ${dep.source_table} (${dep.relation_type})`);
        });
      }
      
      // 获取下游影响
      const downstream = await axios.get(`${API_BASE}/lineage/downstream/${table}`);
      if (downstream.data.data && downstream.data.data.length > 0) {
        console.log('  下游影响:');
        downstream.data.data.forEach(dep => {
          console.log(`    - ${dep.target_table} (${dep.relation_type})`);
        });
      }
      
      // 获取血缘图数据
      const graph = await axios.get(`${API_BASE}/lineage/table/${table}`);
      const graphData = graph.data.data;
      console.log(`  血缘图: ${graphData.nodes.length} 个节点, ${graphData.edges.length} 条边`);
    }
    
    // 4. 生成血缘报告
    console.log('\n\n生成血缘报告');
    console.log('=' .repeat(50));
    
    const reportTable = 'test_sales_metrics';
    const report = await axios.get(`${API_BASE}/lineage/report/${reportTable}`);
    const reportData = report.data.data;
    
    console.log(`\n${reportTable} 血缘报告:`);
    console.log(`表名: ${reportData.tableName}`);
    console.log(`创建时间: ${reportData.createdAt || '未知'}`);
    console.log(`\n直接上游 (${reportData.directUpstream.length} 个):`);
    reportData.directUpstream.forEach(t => console.log(`  - ${t.source_table}`));
    
    console.log(`\n直接下游 (${reportData.directDownstream.length} 个):`);
    reportData.directDownstream.forEach(t => console.log(`  - ${t.target_table}`));
    
    console.log(`\n全部上游 (${reportData.allUpstream.length} 个):`);
    reportData.allUpstream.forEach(t => console.log(`  - ${t}`));
    
    console.log(`\n全部下游 (${reportData.allDownstream.length} 个):`);
    reportData.allDownstream.forEach(t => console.log(`  - ${t}`));
    
    console.log('\n\n✅ 血缘分析完成！');
    console.log('\n访问 http://localhost:3000 查看可视化血缘图');
    
  } catch (error) {
    console.error('血缘分析失败:', error.response?.data || error.message);
  }
}

// 执行分析
analyzeLineage();