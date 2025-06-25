const express = require('express');
const router = express.Router();
const MetricGovernanceService = require('../services/MetricGovernanceService');

// 获取指标分类树
router.get('/categories', async (req, res) => {
  try {
    const tree = await MetricGovernanceService.getMetricCategoryTree();
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 搜索指标
router.get('/search', async (req, res) => {
  try {
    const { keyword, ...filters } = req.query;
    const metrics = await MetricGovernanceService.searchMetrics(keyword, filters);
    
    res.json({
      success: true,
      data: metrics,
      total: metrics.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取指标详情
router.get('/detail/:metricCode', async (req, res) => {
  try {
    const { metricCode } = req.params;
    const metric = await MetricGovernanceService.getMetricInfo(metricCode);
    
    if (!metric) {
      return res.status(404).json({
        success: false,
        error: '指标不存在'
      });
    }
    
    res.json({
      success: true,
      data: metric
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 创建或更新指标元数据
router.post('/metadata', async (req, res) => {
  try {
    const result = await MetricGovernanceService.upsertMetricMetadata(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 保存指标快照
router.post('/snapshot', async (req, res) => {
  try {
    const result = await MetricGovernanceService.saveMetricSnapshot(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量保存指标快照
router.post('/snapshots/batch', async (req, res) => {
  try {
    const { snapshots } = req.body;
    if (!Array.isArray(snapshots)) {
      return res.status(400).json({
        success: false,
        error: '请提供快照数组'
      });
    }
    
    const results = await MetricGovernanceService.batchSaveSnapshots(snapshots);
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      data: {
        total: snapshots.length,
        success: successCount,
        failed: snapshots.length - successCount,
        results: results
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 查询指标历史趋势
router.get('/trend/:metricCode', async (req, res) => {
  try {
    const { metricCode } = req.params;
    const { startDate, endDate, ...dimensions } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始和结束日期'
      });
    }
    
    const trend = await MetricGovernanceService.getMetricTrend(
      metricCode,
      startDate,
      endDate,
      dimensions
    );
    
    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 添加指标血缘关系
router.post('/lineage', async (req, res) => {
  try {
    const result = await MetricGovernanceService.addMetricLineage(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取指标血缘图
router.get('/lineage/:metricCode', async (req, res) => {
  try {
    const { metricCode } = req.params;
    const { direction = 'both', depth = 3 } = req.query;
    
    const graph = await MetricGovernanceService.getMetricLineageGraph(
      metricCode,
      direction,
      parseInt(depth)
    );
    
    res.json({
      success: true,
      data: graph
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 指标影响分析
router.get('/impact/:metricCode', async (req, res) => {
  try {
    const { metricCode } = req.params;
    const { changeType = 'value' } = req.query;
    
    const impact = await MetricGovernanceService.analyzeMetricImpact(
      metricCode,
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

// 记录指标使用
router.post('/usage', async (req, res) => {
  try {
    const result = await MetricGovernanceService.logMetricUsage(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取指标使用统计
router.get('/usage/:metricCode/stats', async (req, res) => {
  try {
    const { metricCode } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始和结束日期'
      });
    }
    
    const stats = await MetricGovernanceService.getMetricUsageStats(
      metricCode,
      startDate,
      endDate
    );
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 指标质量检查
router.post('/quality/check/:metricCode', async (req, res) => {
  try {
    const { metricCode } = req.params;
    const { checkDate } = req.body;
    
    const quality = await MetricGovernanceService.checkMetricQuality(
      metricCode,
      checkDate || new Date()
    );
    
    res.json({
      success: true,
      data: quality
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量导入指标元数据
router.post('/import', async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!Array.isArray(metrics)) {
      return res.status(400).json({
        success: false,
        error: '请提供指标数组'
      });
    }
    
    const results = [];
    for (const metric of metrics) {
      try {
        const result = await MetricGovernanceService.upsertMetricMetadata(metric);
        results.push({
          metric_code: metric.metric_code,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          metric_code: metric.metric_code,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      data: {
        total: metrics.length,
        success: successCount,
        failed: metrics.length - successCount,
        results: results
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 导出指标元数据
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', ...filters } = req.query;
    const metrics = await MetricGovernanceService.searchMetrics('', filters);
    
    if (format === 'csv') {
      // CSV格式导出
      const csv = convertToCSV(metrics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics.csv');
      res.send(csv);
    } else {
      // JSON格式导出
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics.json');
      res.json(metrics);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 辅助函数：转换为CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value || '';
    }).join(',');
  });
  
  return csvHeaders + '\n' + csvRows.join('\n');
}

module.exports = router;