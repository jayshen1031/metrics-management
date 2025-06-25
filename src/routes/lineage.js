const express = require('express');
const router = express.Router();
const LineageAnalysisService = require('../services/LineageAnalysisService');
const EnhancedLineageAnalysisService = require('../services/EnhancedLineageAnalysisService');
const MetadataCollectorService = require('../services/MetadataCollectorService');

// 分析SQL血缘关系 (增强版)
router.post('/analyze-sql', async (req, res) => {
  try {
    const { sql, context = {} } = req.body;
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: '请提供SQL语句'
      });
    }
    
    // 使用增强版血缘分析服务
    const result = await EnhancedLineageAnalysisService.analyzeSQLLineage(sql, context);
    
    res.json({
      success: result.success,
      data: {
        lineage: result.lineage,
        tables: result.tables,
        columns: result.columns,
        parser: result.parser,
        statistics: result.statistics,
        complexity: result.complexity
      },
      error: result.error
    });
  } catch (error) {
    console.error('SQL血缘分析API错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取表级血缘图
router.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { direction = 'both', depth = 3 } = req.query;
    
    if (!tableName || !tableName.includes('.')) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的表名 (格式: database.table)'
      });
    }
    
    const lineageGraph = await LineageAnalysisService.buildTableLineageGraph(
      tableName,
      direction,
      parseInt(depth)
    );
    
    res.json({
      success: true,
      data: lineageGraph
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取通用数据血缘图
router.get('/graph/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { direction = 'both', depth = 3 } = req.query;
    
    const lineageGraph = await MetadataCollectorService.getDataLineageGraph(
      assetId,
      direction,
      parseInt(depth)
    );
    
    res.json({
      success: true,
      data: lineageGraph
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 分析血缘影响范围
router.get('/impact/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { changeType = 'schema' } = req.query;
    
    if (!tableName || !tableName.includes('.')) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的表名 (格式: database.table)'
      });
    }
    
    const impact = await LineageAnalysisService.analyzeLineageImpact(
      tableName,
      changeType
    );
    
    res.json({
      success: true,
      data: impact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 生成血缘报告
router.get('/report/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    if (!tableName || !tableName.includes('.')) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的表名 (格式: database.table)'
      });
    }
    
    const report = await LineageAnalysisService.generateLineageReport(tableName);
    
    res.json({
      success: !report.error,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取上游依赖
router.get('/upstream/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { depth = 1 } = req.query;
    
    const lineageGraph = await LineageAnalysisService.buildTableLineageGraph(
      tableName,
      'upstream',
      parseInt(depth)
    );
    
    res.json({
      success: true,
      data: {
        table: tableName,
        upstreamTables: lineageGraph.nodes.filter(n => n.id !== tableName),
        dependencies: lineageGraph.edges,
        statistics: lineageGraph.statistics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取下游依赖
router.get('/downstream/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { depth = 1 } = req.query;
    
    const lineageGraph = await LineageAnalysisService.buildTableLineageGraph(
      tableName,
      'downstream',
      parseInt(depth)
    );
    
    res.json({
      success: true,
      data: {
        table: tableName,
        downstreamTables: lineageGraph.nodes.filter(n => n.id !== tableName),
        dependents: lineageGraph.edges,
        statistics: lineageGraph.statistics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 血缘关系搜索
router.get('/search', async (req, res) => {
  try {
    const { sourceTable, targetTable, relationType } = req.query;
    
    let sql = 'SELECT * FROM data_lineage WHERE 1=1';
    const params = [];
    
    if (sourceTable) {
      sql += ' AND source_id LIKE ?';
      params.push(`%${sourceTable}%`);
    }
    
    if (targetTable) {
      sql += ' AND target_id LIKE ?';
      params.push(`%${targetTable}%`);
    }
    
    if (relationType) {
      sql += ' AND relation_type = ?';
      params.push(relationType);
    }
    
    sql += ' ORDER BY create_time DESC LIMIT 100';
    
    const database = require('../../config/database');
    const results = await database.query(sql, params);
    
    res.json({
      success: true,
      data: results,
      searchCriteria: {
        sourceTable,
        targetTable,
        relationType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量分析工作流血缘
router.post('/batch-analyze-workflows', async (req, res) => {
  try {
    const { projectCode, workflowCodes } = req.body;
    
    if (!projectCode || !Array.isArray(workflowCodes)) {
      return res.status(400).json({
        success: false,
        error: '请提供项目代码和工作流代码列表'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const workflowCode of workflowCodes) {
      try {
        const DolphinSchedulerService = require('../services/DolphinSchedulerService');
        const sqlTasks = await DolphinSchedulerService.extractSQLFromWorkflow(
          projectCode, 
          workflowCode
        );
        
        for (const sqlTask of sqlTasks) {
          const lineageResult = await LineageAnalysisService.analyzeSQLLineage(
            sqlTask.sql,
            { defaultDatabase: sqlTask.datasource }
          );
          
          results.push({
            projectCode,
            workflowCode,
            taskCode: sqlTask.taskCode,
            taskName: sqlTask.taskName,
            lineage: lineageResult
          });
        }
      } catch (error) {
        errors.push({
          workflowCode,
          error: error.message
        });
      }
    }
    
    res.json({
      success: errors.length === 0,
      data: {
        analyzed: results.length,
        failed: errors.length,
        results: results,
        errors: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取血缘统计信息
router.get('/statistics', async (req, res) => {
  try {
    const database = require('../../config/database');
    
    const stats = await database.query(`
      SELECT 
        COUNT(*) as total_relations,
        COUNT(DISTINCT source_id) as unique_sources,
        COUNT(DISTINCT target_id) as unique_targets,
        COUNT(DISTINCT relation_type) as relation_types,
        COUNT(DISTINCT project_code) as projects,
        COUNT(DISTINCT workflow_code) as workflows
      FROM data_lineage
    `);
    
    const relationTypes = await database.query(`
      SELECT 
        relation_type,
        COUNT(*) as count
      FROM data_lineage
      GROUP BY relation_type
      ORDER BY count DESC
    `);
    
    const topSources = await database.query(`
      SELECT 
        source_id,
        COUNT(*) as outgoing_count
      FROM data_lineage
      GROUP BY source_id
      ORDER BY outgoing_count DESC
      LIMIT 10
    `);
    
    const topTargets = await database.query(`
      SELECT 
        target_id,
        COUNT(*) as incoming_count
      FROM data_lineage
      GROUP BY target_id
      ORDER BY incoming_count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        overview: stats[0],
        relationTypes: relationTypes,
        topSources: topSources,
        topTargets: topTargets
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 验证血缘关系
router.post('/validate', async (req, res) => {
  try {
    const { sourceId, targetId } = req.body;
    
    if (!sourceId || !targetId) {
      return res.status(400).json({
        success: false,
        error: '请提供源ID和目标ID'
      });
    }
    
    const database = require('../../config/database');
    
    // 检查直接关系
    const directRelation = await database.query(`
      SELECT * FROM data_lineage 
      WHERE source_id = ? AND target_id = ?
    `, [sourceId, targetId]);
    
    // 检查间接关系（通过中间节点）
    const indirectRelation = await database.query(`
      SELECT 
        l1.source_id,
        l1.target_id as intermediate,
        l2.target_id,
        l1.relation_type as first_relation,
        l2.relation_type as second_relation
      FROM data_lineage l1
      JOIN data_lineage l2 ON l1.target_id = l2.source_id
      WHERE l1.source_id = ? AND l2.target_id = ?
    `, [sourceId, targetId]);
    
    res.json({
      success: true,
      data: {
        hasDirectRelation: directRelation.length > 0,
        directRelations: directRelation,
        hasIndirectRelation: indirectRelation.length > 0,
        indirectRelations: indirectRelation,
        validated: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量分析SQL血缘 (新增)
router.post('/batch-analyze', async (req, res) => {
  try {
    const { sqls, context = {} } = req.body;
    
    if (!sqls || !Array.isArray(sqls)) {
      return res.status(400).json({
        success: false,
        error: '请提供SQL数组'
      });
    }
    
    const result = await EnhancedLineageAnalysisService.batchAnalyzeSQL(sqls, context);
    
    res.json(result);
  } catch (error) {
    console.error('批量SQL血缘分析API错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 分析SQL复杂度 (新增)
router.post('/complexity', async (req, res) => {
  try {
    const { sql } = req.body;
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: '请提供SQL语句'
      });
    }
    
    const complexity = await EnhancedLineageAnalysisService.analyzeSQLComplexity(sql);
    
    res.json({
      success: true,
      data: complexity
    });
  } catch (error) {
    console.error('SQL复杂度分析API错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 检查Python血缘服务状态 (新增)
router.get('/service-status', async (req, res) => {
  try {
    const isAvailable = await EnhancedLineageAnalysisService.checkPythonService();
    
    res.json({
      success: true,
      data: {
        python_service_available: isAvailable,
        service_url: process.env.PYTHON_LINEAGE_SERVICE_URL || 'http://localhost:5000',
        fallback_enabled: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;