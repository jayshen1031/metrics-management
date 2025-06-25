const axios = require('axios');

// API基础配置
const API_BASE = 'http://localhost:3000/api/v1';

// 验证血缘关系展示
async function verifyLineage() {
  try {
    console.log('=== 验证血缘关系展示 ===\n');
    
    // 1. 查询test_sales_summary的上游依赖
    console.log('1. test_sales_summary 的血缘关系');
    console.log('-'.repeat(50));
    
    try {
      const upstream = await axios.get(`${API_BASE}/lineage/upstream/test_sales_summary`);
      const upstreamData = upstream.data.data;
      
      console.log(`上游表数量: ${upstreamData.length}`);
      if (upstreamData.length > 0) {
        console.log('上游依赖:');
        upstreamData.forEach(dep => {
          console.log(`  - ${dep.source_name} (${dep.relation_type})`);
          console.log(`    SQL: ${dep.sql_statement?.substring(0, 50)}...`);
        });
      }
    } catch (error) {
      console.log('错误:', error.response?.data?.error || error.message);
    }
    
    // 2. 查询test_sales_raw的下游影响
    console.log('\n2. test_sales_raw 的下游影响');
    console.log('-'.repeat(50));
    
    try {
      const downstream = await axios.get(`${API_BASE}/lineage/downstream/test_sales_raw`);
      const downstreamData = downstream.data.data;
      
      console.log(`下游表数量: ${downstreamData.length}`);
      if (downstreamData.length > 0) {
        console.log('下游影响:');
        downstreamData.forEach(dep => {
          console.log(`  - ${dep.target_name} (${dep.relation_type})`);
          const metadata = JSON.parse(dep.metadata || '{}');
          console.log(`    工作流: ${metadata.workflow || '未知'}, 任务: ${metadata.task || '未知'}`);
        });
      }
    } catch (error) {
      console.log('错误:', error.response?.data?.error || error.message);
    }
    
    // 3. 获取影响分析
    console.log('\n3. 影响分析 - 如果修改 test_sales_raw 表');
    console.log('-'.repeat(50));
    
    try {
      const impact = await axios.get(`${API_BASE}/lineage/impact/test_sales_raw`);
      const impactData = impact.data.data;
      
      console.log(`直接影响表数: ${impactData.directImpact?.length || 0}`);
      console.log(`全部影响表数: ${impactData.allImpact?.length || 0}`);
      
      if (impactData.directImpact && impactData.directImpact.length > 0) {
        console.log('\n直接影响的表:');
        impactData.directImpact.forEach(table => {
          console.log(`  - ${table.target_name}`);
        });
      }
      
      if (impactData.allImpact && impactData.allImpact.length > 0) {
        console.log('\n全部影响的表（包括间接）:');
        impactData.allImpact.forEach(table => {
          console.log(`  - ${table}`);
        });
      }
    } catch (error) {
      console.log('错误:', error.response?.data?.error || error.message);
    }
    
    // 4. 生成血缘报告
    console.log('\n4. test_sales_metrics 血缘报告');
    console.log('-'.repeat(50));
    
    try {
      const report = await axios.get(`${API_BASE}/lineage/report/test_sales_metrics`);
      const reportData = report.data.data;
      
      console.log(`表名: ${reportData.tableName}`);
      console.log(`直接上游表数: ${reportData.directUpstream?.length || 0}`);
      console.log(`直接下游表数: ${reportData.directDownstream?.length || 0}`);
      console.log(`全部上游表数: ${reportData.allUpstream?.length || 0}`);
      console.log(`全部下游表数: ${reportData.allDownstream?.length || 0}`);
      
      if (reportData.lineagePath && reportData.lineagePath.length > 0) {
        console.log('\n血缘路径:');
        reportData.lineagePath.forEach((path, index) => {
          console.log(`  路径${index + 1}: ${path.join(' → ')}`);
        });
      }
    } catch (error) {
      console.log('错误:', error.response?.data?.error || error.message);
    }
    
    // 5. 数据资产概览
    console.log('\n5. 数据资产概览');
    console.log('-'.repeat(50));
    
    try {
      const overview = await axios.get(`${API_BASE}/metadata/overview`);
      const overviewData = overview.data.data;
      
      console.log('数据资产统计:');
      console.log(`  - DolphinScheduler项目: ${overviewData.dolphinscheduler?.projects || 0}`);
      console.log(`  - DolphinScheduler工作流: ${overviewData.dolphinscheduler?.workflows || 0}`);
      console.log(`  - DolphinScheduler任务: ${overviewData.dolphinscheduler?.tasks || 0}`);
      console.log(`  - Doris数据库: ${overviewData.doris?.databases || 0}`);
      console.log(`  - Doris表: ${overviewData.doris?.tables || 0}`);
      console.log(`  - 血缘关系: ${overviewData.lineage?.relations || 0}`);
    } catch (error) {
      console.log('错误:', error.response?.data?.error || error.message);
    }
    
    console.log('\n\n✅ 血缘关系验证完成！');
    console.log('\n测试案例总结:');
    console.log('1. 创建了6个测试表（2个维度表、2个事实表、2个汇总表）');
    console.log('2. 建立了5个血缘关系');
    console.log('3. 展示了完整的数据流向:');
    console.log('   - test_sales_raw + test_dim_product → test_sales_summary');
    console.log('   - test_sales_summary → test_sales_metrics');
    console.log('   - test_sales_raw + test_dim_customer → test_customer_value_analysis');
    console.log('\n访问 http://localhost:3000 查看可视化血缘图！');
    
  } catch (error) {
    console.error('验证失败:', error.message);
  }
}

// 执行验证
verifyLineage();