const axios = require('axios');

// API基础配置
const API_BASE = 'http://localhost:3000/api/v1';

// 测试工作流定义
const testWorkflow = {
  projectName: '销售数据分析项目',
  workflowName: '销售指标计算工作流',
  description: '从原始销售数据计算各类销售指标和客户价值分析',
  tasks: [
    {
      taskName: '销售数据汇总',
      taskType: 'SQL',
      description: '将原始销售数据按产品、区域进行汇总',
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
      inputTables: ['test_sales_raw', 'test_dim_product'],
      outputTables: ['test_sales_summary']
    },
    {
      taskName: '销售指标计算',
      taskType: 'SQL', 
      description: '基于汇总数据计算各类销售指标',
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
      inputTables: ['test_sales_summary'],
      outputTables: ['test_sales_metrics'],
      dependencies: ['销售数据汇总']
    },
    {
      taskName: '客户价值分析',
      taskType: 'SQL',
      description: '基于销售数据分析客户价值',
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
      inputTables: ['test_sales_raw', 'test_dim_customer'],
      outputTables: ['test_customer_value_analysis']
    }
  ]
};

// 创建工作流和任务
async function createTestWorkflow() {
  try {
    console.log('开始创建测试工作流...\n');
    
    // 1. 创建项目（如果不存在）
    console.log('1. 创建DolphinScheduler项目...');
    const projectData = {
      project_code: 'SALES_ANALYSIS_001',
      project_name: testWorkflow.projectName,
      description: '销售数据分析和指标计算项目',
      status: 'active'
    };
    
    // 插入到ds_projects表
    await axios.post(`${API_BASE}/metadata/dolphinscheduler/projects`, projectData);
    console.log('   ✓ 项目创建成功\n');
    
    // 2. 创建工作流
    console.log('2. 创建工作流定义...');
    const workflowData = {
      workflow_code: 'WF_SALES_METRICS_001',
      workflow_name: testWorkflow.workflowName,
      project_code: 'SALES_ANALYSIS_001',
      description: testWorkflow.description,
      schedule_cron: '0 0 2 * * ?', // 每天凌晨2点执行
      status: 'active'
    };
    
    await axios.post(`${API_BASE}/metadata/dolphinscheduler/workflows`, workflowData);
    console.log('   ✓ 工作流创建成功\n');
    
    // 3. 创建任务并记录血缘关系
    console.log('3. 创建SQL任务并分析血缘...');
    
    for (let i = 0; i < testWorkflow.tasks.length; i++) {
      const task = testWorkflow.tasks[i];
      console.log(`   - 创建任务: ${task.taskName}`);
      
      // 创建任务
      const taskData = {
        task_code: `TASK_${i + 1}`,
        task_name: task.taskName,
        task_type: task.taskType,
        workflow_code: 'WF_SALES_METRICS_001',
        description: task.description,
        sql_content: task.sql,
        status: 'active',
        execution_order: i + 1
      };
      
      await axios.post(`${API_BASE}/metadata/dolphinscheduler/tasks`, taskData);
      
      // 分析SQL血缘
      console.log(`     分析SQL血缘关系...`);
      const lineageData = {
        sql: task.sql,
        source: 'DolphinScheduler',
        metadata: {
          project: testWorkflow.projectName,
          workflow: testWorkflow.workflowName,
          task: task.taskName
        }
      };
      
      const lineageResponse = await axios.post(`${API_BASE}/lineage/analyze-sql`, lineageData);
      console.log(`     ✓ 发现 ${lineageResponse.data.data.lineageCount} 个血缘关系`);
    }
    
    console.log('\n4. 工作流创建完成！\n');
    
    // 4. 触发元数据采集
    console.log('5. 触发元数据采集...');
    await axios.post(`${API_BASE}/metadata/collect`);
    console.log('   ✓ 元数据采集已触发\n');
    
    // 5. 查询并展示血缘关系
    console.log('6. 查询血缘关系...\n');
    
    // 查询各个表的血缘
    const tables = [
      'test_sales_summary',
      'test_sales_metrics', 
      'test_customer_value_analysis'
    ];
    
    for (const table of tables) {
      console.log(`   表 ${table} 的血缘关系:`);
      const lineageGraph = await axios.get(`${API_BASE}/lineage/table/${table}`);
      const lineageData = lineageGraph.data.data;
      
      if (lineageData.nodes && lineageData.nodes.length > 0) {
        console.log(`     - 涉及 ${lineageData.nodes.length} 个表`);
        console.log(`     - 包含 ${lineageData.edges.length} 个血缘关系`);
        
        // 显示上游表
        const upstream = await axios.get(`${API_BASE}/lineage/upstream/${table}`);
        if (upstream.data.data.length > 0) {
          console.log(`     - 上游依赖表: ${upstream.data.data.map(t => t.source_table).join(', ')}`);
        }
      }
      console.log('');
    }
    
    // 获取血缘统计
    const stats = await axios.get(`${API_BASE}/lineage/statistics`);
    console.log('7. 血缘统计信息:');
    console.log(`   - 总表数量: ${stats.data.data.totalTables}`);
    console.log(`   - 血缘关系数: ${stats.data.data.totalRelations}`);
    console.log(`   - 有上游的表: ${stats.data.data.tablesWithUpstream}`);
    console.log(`   - 有下游的表: ${stats.data.data.tablesWithDownstream}`);
    
    console.log('\n✅ 测试工作流创建成功！');
    console.log('\n您现在可以：');
    console.log('1. 访问 http://localhost:3000 查看可视化界面');
    console.log('2. 在界面中查看数据资产和血缘关系图');
    console.log('3. 使用API查询具体表的血缘信息');
    
  } catch (error) {
    console.error('创建工作流失败:', error.response?.data || error.message);
  }
}

// 执行创建
createTestWorkflow();