const express = require('express');
const router = express.Router();

// 导入各模块路由
const metricsRoutes = require('./metrics');
const metadataRoutes = require('./metadata');
const lineageRoutes = require('./lineage');
const assetsRoutes = require('./assets');
const systemRoutes = require('./system');

// API版本前缀
const API_VERSION = '/api/v1';

// 注册路由
router.use(`${API_VERSION}/metrics`, metricsRoutes);
router.use(`${API_VERSION}/metadata`, metadataRoutes);
router.use(`${API_VERSION}/lineage`, lineageRoutes);
router.use(`${API_VERSION}/assets`, assetsRoutes);
router.use(`${API_VERSION}/system`, systemRoutes);

// API根路径
router.get(API_VERSION, (req, res) => {
  res.json({
    message: '指标管理平台API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      metrics: `${API_VERSION}/metrics`,
      metadata: `${API_VERSION}/metadata`,
      lineage: `${API_VERSION}/lineage`,
      assets: `${API_VERSION}/assets`,
      system: `${API_VERSION}/system`
    }
  });
});

module.exports = router;