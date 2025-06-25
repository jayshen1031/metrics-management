const axios = require('axios');

// API基础配置
const API_BASE = 'http://localhost:3000/api/v1';

// 简化的血缘分析测试
async function testLineageAnalysis() {
  try {
    console.log('=== 血缘分析测试案例 ===\n');
    
    // 1. 分析第一个SQL - 销售数据汇总
    console.log('1. 分析销售数据汇总SQL');
    console.log('-'.repeat(40));
    
    const sql1 = `
      INSERT INTO test_sales_summary 
      SELECT 
        DATE(sr.order_date) as summary_date,
        sr.product_id,
        sr.product_name,
        dp.category,
        sr.region,
        SUM(sr.quantity) as total_quantity,
        SUM(sr.total_amount) as total_amount
      FROM test_sales_raw sr
      LEFT JOIN test_dim_product dp ON sr.product_id = dp.product_id
      GROUP BY DATE(sr.order_date), sr.product_id, sr.product_name, dp.category, sr.region
    `;
    
    try {
      const response1 = await axios.post(`${API_BASE}/lineage/analyze-sql`, {
        sql: sql1,
        source: 'test_workflow'
      });
      
      console.log('分析结果:', response1.data);
      console.log();
    } catch (error) {
      console.log('错误:', error.response?.data?.error || error.message);
    }
    
    // 2. 查询表的血缘关系
    console.log('\n2. 查询test_sales_summary表的血缘');
    console.log('-'.repeat(40));
    
    try {
      const lineageGraph = await axios.get(`${API_BASE}/lineage/table/test_sales_summary`);
      const data = lineageGraph.data.data;
      
      console.log(`节点数: ${data.nodes?.length || 0}`);
      console.log(`关系数: ${data.edges?.length || 0}`);
      
      if (data.nodes && data.nodes.length > 0) {
        console.log('\n涉及的表:');
        data.nodes.forEach(node => {
          console.log(`- ${node.label} (类型: ${node.group})`);
        });
      }
      
      if (data.edges && data.edges.length > 0) {
        console.log('\n血缘关系:');
        data.edges.forEach(edge => {
          console.log(`- ${edge.from} → ${edge.to}`);
        });
      }
    } catch (error) {
      console.log('错误:', error.response?.data?.error || error.message);
    }
    
    // 3. 手动插入一些血缘关系数据进行测试
    console.log('\n3. 手动创建测试血缘关系');
    console.log('-'.repeat(40));
    
    // 直接插入到数据库
    const insertSQL = `
      INSERT INTO data_lineage (
        source_type, source_id, source_name,
        target_type, target_id, target_name,
        relation_type, sql_statement, metadata
      ) VALUES 
      ('table', 'test_sales_raw', 'test_sales_raw', 
       'table', 'test_sales_summary', 'test_sales_summary',
       'data_flow', 'INSERT INTO test_sales_summary SELECT ... FROM test_sales_raw',
       '{"workflow": "销售数据处理", "task": "数据汇总"}'),
      
      ('table', 'test_dim_product', 'test_dim_product',
       'table', 'test_sales_summary', 'test_sales_summary', 
       'data_flow', 'INSERT INTO test_sales_summary SELECT ... FROM test_sales_raw JOIN test_dim_product',
       '{"workflow": "销售数据处理", "task": "数据汇总"}'),
       
      ('table', 'test_sales_summary', 'test_sales_summary',
       'table', 'test_sales_metrics', 'test_sales_metrics',
       'data_flow', 'INSERT INTO test_sales_metrics SELECT ... FROM test_sales_summary',
       '{"workflow": "销售数据处理", "task": "指标计算"}'),
       
      ('table', 'test_sales_raw', 'test_sales_raw',
       'table', 'test_customer_value_analysis', 'test_customer_value_analysis',
       'data_flow', 'INSERT INTO test_customer_value_analysis SELECT ... FROM test_sales_raw',
       '{"workflow": "销售数据处理", "task": "客户分析"}'),
       
      ('table', 'test_dim_customer', 'test_dim_customer',
       'table', 'test_customer_value_analysis', 'test_customer_value_analysis',
       'data_flow', 'INSERT INTO test_customer_value_analysis SELECT ... FROM test_sales_raw JOIN test_dim_customer',
       '{"workflow": "销售数据处理", "task": "客户分析"}')
    `;
    
    console.log('已创建测试血缘关系数据');
    console.log('请执行以下SQL插入数据:');
    console.log(insertSQL);
    
    // 4. 查询影响分析
    console.log('\n4. 影响分析示例');
    console.log('-'.repeat(40));
    console.log('如果修改 test_sales_raw 表，会影响:');
    console.log('- test_sales_summary (直接依赖)');
    console.log('- test_sales_metrics (间接依赖，通过test_sales_summary)');
    console.log('- test_customer_value_analysis (直接依赖)');
    
    console.log('\n\n✅ 测试完成！');
    console.log('\n下一步操作:');
    console.log('1. 执行上面的SQL插入血缘关系数据');
    console.log('2. 访问 http://localhost:3000 查看可视化界面');
    console.log('3. 在界面中查看数据血缘图');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 执行测试
testLineageAnalysis();