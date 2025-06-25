#!/usr/bin/env node

/**
 * 测试增强版血缘分析功能
 * 验证SQLLineage集成效果
 */

const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const PYTHON_SERVICE_URL = 'http://localhost:5001';

// 测试SQL样例
const TEST_SQLS = {
  simple: `
    SELECT customer_id, COUNT(*) as order_count
    FROM orders
    WHERE order_date >= '2024-01-01'
    GROUP BY customer_id
  `,
  
  medium: `
    INSERT INTO customer_summary
    SELECT 
      c.customer_id,
      c.customer_name,
      COUNT(o.order_id) as total_orders,
      SUM(o.amount) as total_amount
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    WHERE c.status = 'active'
    GROUP BY c.customer_id, c.customer_name
  `,
  
  complex: `
    -- 你提供的复杂ETL SQL (截取部分)
    INSERT INTO dwm.dwm_weekly_report 
    WITH hh AS (
      SELECT main_order_no,
        group_concat(distinct concat(source_system,'-',order_type_name)) as oms_ie_flag
      FROM dwd.dwd_business_order_report
      WHERE order_product_name='委托' and main_order_no <> ''
      GROUP BY main_order_no
    ),
    flag AS( 
      SELECT main_order_no,
        CASE WHEN oms_ie_flag LIKE '%海运%' THEN 'oms-海运' 
             WHEN oms_ie_flag LIKE '%空运%' THEN 'oms-空运'
             WHEN oms_ie_flag LIKE '%铁运%' THEN 'oms-铁运'
             ELSE 'oms-其他'
        END as oms_ie_flag_type
      FROM hh 
    )
    SELECT 
      d.customer_no,
      d.customer_name,
      f.oms_ie_flag_type,
      COUNT(*) as order_count
    FROM dwd.dwd_business_order_report d
    LEFT JOIN flag f ON d.reference_no = f.main_order_no
    GROUP BY d.customer_no, d.customer_name, f.oms_ie_flag_type
  `
};

class LineageTestSuite {
  constructor() {
    this.results = {
      python_service: null,
      simple_sql: null,
      medium_sql: null,
      complex_sql: null,
      batch_analysis: null,
      complexity_analysis: null
    };
  }

  async runAllTests() {
    console.log('🧪 开始增强版血缘分析测试套件\n');

    try {
      // 1. 测试Python服务
      await this.testPythonService();
      
      // 2. 测试不同复杂度SQL
      await this.testSimpleSQL();
      await this.testMediumSQL();
      await this.testComplexSQL();
      
      // 3. 测试批量分析
      await this.testBatchAnalysis();
      
      // 4. 测试复杂度分析
      await this.testComplexityAnalysis();
      
      // 5. 生成报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 测试套件执行失败:', error.message);
    }
  }

  async testPythonService() {
    console.log('📡 测试1: Python血缘服务连通性');
    
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('✅ Python服务连接成功');
        this.results.python_service = {
          success: true,
          status: response.data.status,
          version: response.data.version
        };
      }
    } catch (error) {
      console.log('❌ Python服务连接失败:', error.message);
      this.results.python_service = {
        success: false,
        error: error.message
      };
    }
    console.log('');
  }

  async testSimpleSQL() {
    console.log('📊 测试2: 简单SQL血缘分析');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/lineage/analyze-sql`, {
        sql: TEST_SQLS.simple
      }, { timeout: 10000 });
      
      const result = response.data;
      console.log(`✅ 简单SQL解析成功 (解析器: ${result.data?.parser || 'Unknown'})`);
      console.log(`   - 源表数: ${result.data?.statistics?.source_count || 0}`);
      console.log(`   - 目标表数: ${result.data?.statistics?.target_count || 0}`);
      
      this.results.simple_sql = {
        success: result.success,
        parser: result.data?.parser,
        statistics: result.data?.statistics
      };
      
    } catch (error) {
      console.log('❌ 简单SQL解析失败:', error.message);
      this.results.simple_sql = { success: false, error: error.message };
    }
    console.log('');
  }

  async testMediumSQL() {
    console.log('📈 测试3: 中等复杂度SQL血缘分析');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/lineage/analyze-sql`, {
        sql: TEST_SQLS.medium
      }, { timeout: 15000 });
      
      const result = response.data;
      console.log(`✅ 中等SQL解析成功 (解析器: ${result.data?.parser || 'Unknown'})`);
      console.log(`   - 源表数: ${result.data?.statistics?.source_count || 0}`);
      console.log(`   - 目标表数: ${result.data?.statistics?.target_count || 0}`);
      console.log(`   - 复杂度: ${result.data?.complexity || 'N/A'}`);
      
      this.results.medium_sql = {
        success: result.success,
        parser: result.data?.parser,
        statistics: result.data?.statistics,
        complexity: result.data?.complexity
      };
      
    } catch (error) {
      console.log('❌ 中等SQL解析失败:', error.message);
      this.results.medium_sql = { success: false, error: error.message };
    }
    console.log('');
  }

  async testComplexSQL() {
    console.log('🔥 测试4: 复杂CTE SQL血缘分析');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/lineage/analyze-sql`, {
        sql: TEST_SQLS.complex
      }, { timeout: 30000 });
      
      const result = response.data;
      console.log(`✅ 复杂SQL解析成功 (解析器: ${result.data?.parser || 'Unknown'})`);
      console.log(`   - 源表数: ${result.data?.statistics?.source_count || 0}`);
      console.log(`   - 目标表数: ${result.data?.statistics?.target_count || 0}`);
      console.log(`   - CTE数量: ${result.data?.statistics?.cte_count || 0}`);
      console.log(`   - 复杂度: ${result.data?.complexity || 'N/A'}`);
      
      if (result.data?.lineage?.cteReferences) {
        console.log(`   - CTE表: ${result.data.lineage.cteReferences.join(', ')}`);
      }
      
      this.results.complex_sql = {
        success: result.success,
        parser: result.data?.parser,
        statistics: result.data?.statistics,
        complexity: result.data?.complexity,
        cte_count: result.data?.statistics?.cte_count
      };
      
    } catch (error) {
      console.log('❌ 复杂SQL解析失败:', error.message);
      this.results.complex_sql = { success: false, error: error.message };
    }
    console.log('');
  }

  async testBatchAnalysis() {
    console.log('📦 测试5: 批量SQL血缘分析');
    
    try {
      const sqls = [TEST_SQLS.simple, TEST_SQLS.medium];
      
      const response = await axios.post(`${BASE_URL}/api/v1/lineage/batch-analyze`, {
        sqls: sqls
      }, { timeout: 30000 });
      
      const result = response.data;
      console.log(`✅ 批量分析成功`);
      console.log(`   - 总数: ${result.total || 0}`);
      console.log(`   - 成功数: ${result.success_count || 0}`);
      
      this.results.batch_analysis = {
        success: result.success,
        total: result.total,
        success_count: result.success_count
      };
      
    } catch (error) {
      console.log('❌ 批量分析失败:', error.message);
      this.results.batch_analysis = { success: false, error: error.message };
    }
    console.log('');
  }

  async testComplexityAnalysis() {
    console.log('🎯 测试6: SQL复杂度分析');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/lineage/complexity`, {
        sql: TEST_SQLS.complex
      }, { timeout: 10000 });
      
      const result = response.data;
      console.log(`✅ 复杂度分析成功`);
      console.log(`   - 复杂度评分: ${result.data?.complexity_score || 0}`);
      console.log(`   - 复杂度等级: ${result.data?.complexity_level || 'Unknown'}`);
      console.log(`   - SQL类型: ${result.data?.sql_type || 'Unknown'}`);
      console.log(`   - 推荐解析器: ${result.data?.recommendation || 'Unknown'}`);
      
      this.results.complexity_analysis = {
        success: result.success,
        data: result.data
      };
      
    } catch (error) {
      console.log('❌ 复杂度分析失败:', error.message);
      this.results.complexity_analysis = { success: false, error: error.message };
    }
    console.log('');
  }

  generateReport() {
    console.log('📋 测试报告');
    console.log('=' .repeat(50));
    
    const tests = [
      { name: 'Python服务连通性', result: this.results.python_service },
      { name: '简单SQL解析', result: this.results.simple_sql },
      { name: '中等SQL解析', result: this.results.medium_sql },
      { name: '复杂SQL解析', result: this.results.complex_sql },
      { name: '批量分析', result: this.results.batch_analysis },
      { name: '复杂度分析', result: this.results.complexity_analysis }
    ];
    
    let passCount = 0;
    tests.forEach(test => {
      const status = test.result?.success ? '✅ 通过' : '❌ 失败';
      console.log(`${test.name}: ${status}`);
      if (test.result?.success) passCount++;
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log(`总体结果: ${passCount}/${tests.length} 项测试通过`);
    
    if (passCount === tests.length) {
      console.log('🎉 所有测试通过！SQLLineage集成成功！');
    } else {
      console.log('⚠️  部分测试失败，请检查服务状态');
    }
    
    // 解析器使用统计
    console.log('\n📊 解析器使用统计:');
    const sqllineageCount = [this.results.simple_sql, this.results.medium_sql, this.results.complex_sql]
      .filter(r => r?.parser === 'SQLLineage').length;
    const regexpCount = [this.results.simple_sql, this.results.medium_sql, this.results.complex_sql]
      .filter(r => r?.parser === 'RegExp').length;
    
    console.log(`   - SQLLineage: ${sqllineageCount} 次`);
    console.log(`   - 正则表达式: ${regexpCount} 次`);
    
    console.log('\n💡 建议:');
    if (this.results.python_service?.success) {
      console.log('   ✅ Python服务运行正常，可以处理复杂SQL');
    } else {
      console.log('   ⚠️  Python服务不可用，请检查服务状态');
    }
    
    if (this.results.complex_sql?.success && this.results.complex_sql?.parser === 'SQLLineage') {
      console.log('   ✅ 复杂CTE SQL解析正常，满足企业级需求');
    } else {
      console.log('   ⚠️  复杂SQL解析可能有问题，建议检查SQLLineage服务');
    }
  }
}

// 主函数
async function main() {
  const testSuite = new LineageTestSuite();
  await testSuite.runAllTests();
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = LineageTestSuite;