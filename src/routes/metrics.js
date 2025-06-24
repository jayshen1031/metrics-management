const express = require('express');
const router = express.Router();
const MetricService = require('../services/MetricService');

// 获取所有指标
router.get('/', async (req, res) => {
  try {
    const { category, status, page = 1, limit = 50 } = req.query;
    
    let metrics = await MetricService.getAllMetrics();
    
    // 过滤条件
    if (category) {
      metrics = metrics.filter(m => m.category === category);
    }
    
    if (status !== undefined) {
      const isActive = status === 'active' || status === '1';
      metrics = metrics.filter(m => m.is_active === isActive);
    }
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMetrics = metrics.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: metrics.length,
        totalPages: Math.ceil(metrics.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 根据ID获取指标
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const metric = await MetricService.getMetricById(id);
    
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

// 创建新指标
router.post('/', async (req, res) => {
  try {
    const metricData = req.body;
    
    // 验证必填字段
    const requiredFields = ['name', 'category', 'calculation_formula'];
    for (const field of requiredFields) {
      if (!metricData[field]) {
        return res.status(400).json({
          success: false,
          error: `缺少必填字段: ${field}`
        });
      }
    }
    
    const metric = await MetricService.createMetric(metricData);
    
    res.status(201).json({
      success: true,
      data: metric,
      message: '指标创建成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新指标
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const metricData = req.body;
    
    const existingMetric = await MetricService.getMetricById(id);
    if (!existingMetric) {
      return res.status(404).json({
        success: false,
        error: '指标不存在'
      });
    }
    
    const updatedMetric = await MetricService.updateMetric(id, metricData);
    
    res.json({
      success: true,
      data: updatedMetric,
      message: '指标更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除指标
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingMetric = await MetricService.getMetricById(id);
    if (!existingMetric) {
      return res.status(404).json({
        success: false,
        error: '指标不存在'
      });
    }
    
    const deleted = await MetricService.deleteMetric(id);
    
    if (deleted) {
      res.json({
        success: true,
        message: '指标删除成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '删除失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取指标分类统计
router.get('/statistics/categories', async (req, res) => {
  try {
    const categories = await MetricService.getMetricsByCategory();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取指标值历史
router.get('/:id/values', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }
    
    const values = await MetricService.getMetricValues(id, startDate, endDate);
    
    // 限制返回数量
    const limitedValues = values.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: limitedValues,
      pagination: {
        total: values.length,
        limit: parseInt(limit),
        hasMore: values.length > parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 添加指标值
router.post('/:id/values', async (req, res) => {
  try {
    const { id } = req.params;
    const { value, calculationDate, dataQualityScore = 100 } = req.body;
    
    if (value === undefined || !calculationDate) {
      return res.status(400).json({
        success: false,
        error: '请提供指标值和计算日期'
      });
    }
    
    const result = await MetricService.addMetricValue(
      id, 
      value, 
      calculationDate, 
      dataQualityScore
    );
    
    res.status(201).json({
      success: true,
      data: result,
      message: '指标值添加成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取指标趋势
router.get('/:id/trend', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    const trend = await MetricService.getMetricTrend(id, parseInt(days));
    
    res.json({
      success: true,
      data: trend,
      period: `${days} days`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量导入指标
router.post('/batch/import', async (req, res) => {
  try {
    const { metrics } = req.body;
    
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的指标数组'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const metricData of metrics) {
      try {
        const metric = await MetricService.createMetric(metricData);
        results.push(metric);
      } catch (error) {
        errors.push({
          metric: metricData.name || 'unknown',
          error: error.message
        });
      }
    }
    
    res.json({
      success: errors.length === 0,
      data: {
        imported: results.length,
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

// 搜索指标
router.get('/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const { category, limit = 20 } = req.query;
    
    let metrics = await MetricService.getAllMetrics();
    
    // 搜索匹配
    const searchResults = metrics.filter(metric => {
      const nameMatch = metric.name.toLowerCase().includes(keyword.toLowerCase());
      const descMatch = metric.description && 
        metric.description.toLowerCase().includes(keyword.toLowerCase());
      const categoryMatch = !category || metric.category === category;
      
      return (nameMatch || descMatch) && categoryMatch;
    });
    
    // 限制结果数量
    const limitedResults = searchResults.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: limitedResults,
      searchInfo: {
        keyword: keyword,
        totalMatches: searchResults.length,
        returned: limitedResults.length
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