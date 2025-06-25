const express = require('express');
const router = express.Router();
const MetadataCollectorService = require('../services/MetadataCollectorService');

// 系统健康检查
router.get('/health', async (req, res) => {
  try {
    const database = require('../../config/database');
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      version: '1.0.0'
    };

    // 检查数据库连接
    try {
      await database.query('SELECT 1');
      healthStatus.services.database = { status: 'healthy', message: '数据库连接正常' };
    } catch (error) {
      healthStatus.services.database = { status: 'unhealthy', message: error.message };
      healthStatus.status = 'unhealthy';
    }

    // 检查DolphinScheduler连接
    try {
      const DolphinSchedulerService = require('../services/DolphinSchedulerService');
      await DolphinSchedulerService.login();
      healthStatus.services.dolphinscheduler = { status: 'healthy', message: 'DolphinScheduler连接正常' };
    } catch (error) {
      healthStatus.services.dolphinscheduler = { status: 'unhealthy', message: error.message };
    }

    // 检查Doris连接
    try {
      const DorisService = require('../services/DorisService');
      await DorisService.connect();
      healthStatus.services.doris = { status: 'healthy', message: 'Doris连接正常' };
    } catch (error) {
      healthStatus.services.doris = { status: 'unhealthy', message: error.message };
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: healthStatus.status === 'healthy',
      data: healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取系统信息
router.get('/info', async (req, res) => {
  try {
    const database = require('../../config/database');
    
    // 获取数据库统计
    const dbStats = await database.query(`
      SELECT 
        (SELECT COUNT(*) FROM doris_tables) as doris_tables,
        (SELECT COUNT(*) FROM doris_databases) as doris_databases,
        (SELECT COUNT(*) FROM ds_workflows) as workflows,
        (SELECT COUNT(*) FROM ds_tasks) as tasks,
        (SELECT COUNT(*) FROM data_lineage) as lineage_relations,
        (SELECT COUNT(*) FROM metrics) as metrics
    `);

    // 获取最后同步时间
    const lastSync = await database.query(`
      SELECT MAX(end_time) as last_sync_time 
      FROM metadata_collection_logs 
      WHERE success = 1
    `);

    // 系统配置信息
    const systemInfo = {
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      lastSyncTime: lastSync[0]?.last_sync_time,
      statistics: dbStats[0]
    };

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取系统配置
router.get('/config', async (req, res) => {
  try {
    const config = {
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        database: process.env.DB_NAME || 'metrics_management'
      },
      dolphinscheduler: {
        url: process.env.DOLPHINSCHEDULER_URL || 'http://localhost:12345',
        projectCode: process.env.DOLPHINSCHEDULER_PROJECT_CODE || ''
      },
      doris: {
        host: process.env.DORIS_FE_HOST || 'localhost',
        queryPort: process.env.DORIS_FE_QUERY_PORT || 9030,
        httpPort: process.env.DORIS_FE_HTTP_PORT || 8030
      },
      collection: {
        interval: process.env.METADATA_COLLECT_INTERVAL || '0 */6 * * *',
        isRunning: MetadataCollectorService.isRunning
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动元数据采集调度
router.post('/collection/start', async (req, res) => {
  try {
    if (MetadataCollectorService.isRunning) {
      return res.status(409).json({
        success: false,
        error: '元数据采集调度已在运行'
      });
    }

    MetadataCollectorService.startScheduledCollection();

    res.json({
      success: true,
      message: '元数据采集调度已启动'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 停止元数据采集调度
router.post('/collection/stop', async (req, res) => {
  try {
    MetadataCollectorService.stopScheduledCollection();

    res.json({
      success: true,
      message: '元数据采集调度已停止'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取采集日志
router.get('/collection/logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const database = require('../../config/database');
    
    let sql = 'SELECT * FROM metadata_collection_logs';
    const params = [];
    
    if (status !== undefined) {
      sql += ' WHERE success = ?';
      params.push(status === 'success' ? 1 : 0);
    }
    
    sql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), offset);
    
    const logs = await database.query(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as count FROM metadata_collection_logs';
    let countParams = [];
    
    if (status !== undefined) {
      countSql += ' WHERE success = ?';
      countParams.push(status === 'success' ? 1 : 0);
    }
    
    const totalResult = await database.query(countSql, countParams);
    const total = totalResult[0].count;

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 清理历史数据
router.post('/cleanup', async (req, res) => {
  try {
    const { type, days = 30 } = req.body;
    const database = require('../../config/database');
    
    let deletedCount = 0;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    switch (type) {
      case 'collection_logs':
        const result = await database.query(`
          DELETE FROM metadata_collection_logs 
          WHERE create_time < ?
        `, [cutoffDate]);
        deletedCount = result.affectedRows;
        break;
        
      case 'old_metric_values':
        const metricResult = await database.query(`
          DELETE FROM metric_values 
          WHERE created_at < ?
        `, [cutoffDate]);
        deletedCount = metricResult.affectedRows;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的清理类型'
        });
    }

    res.json({
      success: true,
      message: `清理完成，删除了 ${deletedCount} 条记录`,
      data: {
        type: type,
        deletedCount: deletedCount,
        cutoffDate: cutoffDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 数据库维护
router.post('/maintenance', async (req, res) => {
  try {
    const { operation } = req.body;
    const database = require('../../config/database');
    
    let result = null;
    
    switch (operation) {
      case 'optimize_tables':
        // 优化表结构
        const tables = [
          'metrics', 'metric_values', 'doris_tables', 'ds_workflows', 
          'data_lineage', 'metadata_collection_logs'
        ];
        
        const optimizeResults = [];
        for (const table of tables) {
          try {
            await database.query(`OPTIMIZE TABLE ${table}`);
            optimizeResults.push({ table, status: 'success' });
          } catch (error) {
            optimizeResults.push({ table, status: 'failed', error: error.message });
          }
        }
        result = optimizeResults;
        break;
        
      case 'update_statistics':
        // 更新表统计信息
        await database.query('ANALYZE TABLE metrics, metric_values, doris_tables, ds_workflows');
        result = { message: '统计信息更新完成' };
        break;
        
      case 'rebuild_indexes':
        // 重建索引
        const indexResults = [];
        try {
          await database.query('ALTER TABLE data_lineage DROP INDEX idx_source_target');
          await database.query(`
            ALTER TABLE data_lineage 
            ADD INDEX idx_source_target (source_id, target_id)
          `);
          indexResults.push({ index: 'idx_source_target', status: 'rebuilt' });
        } catch (error) {
          indexResults.push({ index: 'idx_source_target', status: 'failed', error: error.message });
        }
        result = indexResults;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的维护操作'
        });
    }

    res.json({
      success: true,
      message: '维护操作完成',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 导出配置
router.get('/export/config', async (req, res) => {
  try {
    const database = require('../../config/database');
    
    // 导出指标定义
    const metrics = await database.query('SELECT * FROM metrics WHERE is_active = 1');
    
    // 导出数据源配置
    const dataSources = await database.query('SELECT * FROM data_sources WHERE is_active = 1');
    
    const exportData = {
      exportTime: new Date().toISOString(),
      version: '1.0.0',
      metrics: metrics,
      dataSources: dataSources
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=metrics-config-export.json');
    res.json(exportData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 导入配置
router.post('/import/config', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.metrics) {
      return res.status(400).json({
        success: false,
        error: '无效的导入数据'
      });
    }

    const database = require('../../config/database');
    const results = {
      imported: 0,
      failed: 0,
      errors: []
    };

    // 导入指标
    for (const metric of data.metrics) {
      try {
        await database.query(`
          INSERT INTO metrics (
            name, description, category, unit, 
            calculation_formula, data_source, update_frequency
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            category = VALUES(category),
            unit = VALUES(unit),
            calculation_formula = VALUES(calculation_formula),
            data_source = VALUES(data_source),
            update_frequency = VALUES(update_frequency)
        `, [
          metric.name, metric.description, metric.category, metric.unit,
          metric.calculation_formula, metric.data_source, metric.update_frequency
        ]);
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          metric: metric.name,
          error: error.message
        });
      }
    }

    res.json({
      success: results.failed === 0,
      message: `导入完成: ${results.imported} 成功, ${results.failed} 失败`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 测试连接
router.post('/test-connection', async (req, res) => {
  try {
    const { service } = req.body;
    const testResults = {};

    switch (service) {
      case 'dolphinscheduler':
        try {
          const DolphinSchedulerService = require('../services/DolphinSchedulerService');
          await DolphinSchedulerService.login();
          const projects = await DolphinSchedulerService.getProjects();
          testResults.dolphinscheduler = {
            status: 'success',
            message: `连接成功，发现 ${projects.length} 个项目`
          };
        } catch (error) {
          testResults.dolphinscheduler = {
            status: 'failed',
            message: error.message
          };
        }
        break;

      case 'doris':
        try {
          const DorisService = require('../services/DorisService');
          await DorisService.connect();
          const databases = await DorisService.getDatabases();
          testResults.doris = {
            status: 'success',
            message: `连接成功，发现 ${databases.length} 个数据库`
          };
        } catch (error) {
          testResults.doris = {
            status: 'failed',
            message: error.message
          };
        }
        break;

      case 'all':
        // 测试所有连接
        const services = ['dolphinscheduler', 'doris'];
        for (const svc of services) {
          req.body = { service: svc };
          // 递归调用测试各个服务
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: '不支持的服务类型'
        });
    }

    const allSuccess = Object.values(testResults).every(result => result.status === 'success');

    res.json({
      success: allSuccess,
      data: testResults
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;