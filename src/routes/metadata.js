const express = require('express');
const router = express.Router();
const MetadataCollectorService = require('../services/MetadataCollectorService');
const DolphinSchedulerService = require('../services/DolphinSchedulerService');
const DorisService = require('../services/DorisService');

// 获取数据资产概览
router.get('/overview', async (req, res) => {
  try {
    const overview = await MetadataCollectorService.getDataAssetOverview();
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 触发元数据采集
router.post('/collect', async (req, res) => {
  try {
    const { force = false } = req.body;
    
    // 检查是否有正在进行的采集任务
    if (!force && MetadataCollectorService.isRunning) {
      return res.status(409).json({
        success: false,
        error: '元数据采集任务正在进行中'
      });
    }
    
    // 异步执行采集任务
    const collectionPromise = MetadataCollectorService.collectAllMetadata();
    
    res.json({
      success: true,
      message: '元数据采集任务已启动',
      taskId: Date.now().toString()
    });
    
    // 等待采集完成（可选）
    if (req.query.wait === 'true') {
      try {
        const result = await collectionPromise;
        res.json({
          success: true,
          data: result,
          message: '元数据采集完成'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取采集历史
router.get('/collection-logs', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const logs = await database.query(`
      SELECT * FROM metadata_collection_logs 
      ORDER BY create_time DESC 
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);
    
    const totalCount = await database.query(`
      SELECT COUNT(*) as count FROM metadata_collection_logs
    `);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DolphinScheduler相关接口

// 获取DolphinScheduler项目列表
router.get('/dolphinscheduler/projects', async (req, res) => {
  try {
    const projects = await DolphinSchedulerService.getProjects();
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取工作流列表
router.get('/dolphinscheduler/workflows', async (req, res) => {
  try {
    const { projectCode } = req.query;
    
    if (!projectCode) {
      return res.status(400).json({
        success: false,
        error: '请提供项目代码'
      });
    }
    
    const workflows = await DolphinSchedulerService.getProcessDefinitions(projectCode);
    
    res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取工作流详情
router.get('/dolphinscheduler/workflows/:projectCode/:workflowCode', async (req, res) => {
  try {
    const { projectCode, workflowCode } = req.params;
    
    const detail = await DolphinSchedulerService.getProcessDefinitionDetail(
      projectCode, 
      workflowCode
    );
    
    if (!detail) {
      return res.status(404).json({
        success: false,
        error: '工作流不存在'
      });
    }
    
    res.json({
      success: true,
      data: detail
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取工作流执行统计
router.get('/dolphinscheduler/execution-stats', async (req, res) => {
  try {
    const { projectCode, days = 7 } = req.query;
    
    const stats = await DolphinSchedulerService.getWorkflowExecutionStats(
      projectCode, 
      parseInt(days)
    );
    
    res.json({
      success: true,
      data: stats,
      period: `${days} days`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Doris相关接口

// 获取Doris数据库列表
router.get('/doris/databases', async (req, res) => {
  try {
    const databases = await DorisService.getDatabases();
    
    res.json({
      success: true,
      data: databases
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取数据库表列表
router.get('/doris/tables', async (req, res) => {
  try {
    const { database } = req.query;
    
    if (!database) {
      return res.status(400).json({
        success: false,
        error: '请提供数据库名称'
      });
    }
    
    const tables = await DorisService.getTables(database);
    
    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取表详情
router.get('/doris/tables/:database/:table', async (req, res) => {
  try {
    const { database, table } = req.params;
    
    const [columns, detail, stats, partitions] = await Promise.all([
      DorisService.getTableColumns(database, table),
      DorisService.getTableDetail(database, table),
      DorisService.getTableStats(database, table),
      DorisService.getTablePartitions(database, table)
    ]);
    
    res.json({
      success: true,
      data: {
        database: database,
        table: table,
        columns: columns,
        createSql: detail,
        statistics: stats,
        partitions: partitions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取Doris集群信息
router.get('/doris/cluster', async (req, res) => {
  try {
    const clusterInfo = await DorisService.getClusterInfo();
    
    res.json({
      success: true,
      data: clusterInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 执行数据质量检查
router.post('/doris/quality-check', async (req, res) => {
  try {
    const { database, table, rules } = req.body;
    
    if (!database || !table || !rules || !Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的数据库、表名和检查规则'
      });
    }
    
    const results = await DorisService.executeDataQualityCheck(database, table, rules);
    
    res.json({
      success: true,
      data: {
        database: database,
        table: table,
        checkResults: results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 搜索数据资产
router.get('/search', async (req, res) => {
  try {
    const { keyword, type, limit = 50 } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }
    
    const results = await MetadataCollectorService.searchDataAssets(
      keyword, 
      type, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: results,
      searchInfo: {
        keyword: keyword,
        type: type,
        resultCount: results.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 同步特定平台元数据
router.post('/sync/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    
    let result;
    switch (platform.toLowerCase()) {
      case 'dolphinscheduler':
        result = await MetadataCollectorService.collectDolphinSchedulerMetadata();
        break;
      case 'doris':
        result = await MetadataCollectorService.collectDorisMetadata();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的平台类型'
        });
    }
    
    res.json({
      success: true,
      data: result,
      message: `${platform}元数据同步完成`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;