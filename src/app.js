const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量 - 在导入database之前
dotenv.config();

const database = require('../config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static('public'));

// 导入路由
const routes = require('./routes');

// 使用路由
app.use('/', routes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '指标管理系统API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      api: '/api/v1',
      health: '/health',
      docs: '/api/v1'
    }
  });
});

// 健康检查
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    await database.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await database.connect();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

startServer();

module.exports = app;