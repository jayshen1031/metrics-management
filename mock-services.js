const express = require('express');

// Mock DolphinScheduler API
const mockDolphinScheduler = express();
mockDolphinScheduler.use(express.json());

// DolphinScheduler健康检查
mockDolphinScheduler.get('/dolphinscheduler/actuator/health', (req, res) => {
  res.json({ status: 'UP' });
});

// 登录接口
mockDolphinScheduler.post('/dolphinscheduler/login', (req, res) => {
  res.json({
    success: true,
    code: 0,
    msg: 'success',
    data: {
      token: 'mock-token-' + Date.now()
    }
  });
});

// 项目列表
mockDolphinScheduler.get('/dolphinscheduler/projects', (req, res) => {
  res.json({
    success: true,
    code: 0,
    msg: 'success',
    data: [
      { id: 1, name: 'demo_project', description: '演示项目' },
      { id: 2, name: 'metrics_project', description: '指标计算项目' }
    ]
  });
});

// Mock Doris FE
const mockDoris = express();

// Doris健康检查
mockDoris.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 启动Mock服务
const dolphinPort = 12345;
const dorisPort = 8030;

mockDolphinScheduler.listen(dolphinPort, () => {
  console.log(`🐬 Mock DolphinScheduler API running on port ${dolphinPort}`);
});

mockDoris.listen(dorisPort, () => {
  console.log(`🗄️ Mock Doris FE running on port ${dorisPort}`);
});

console.log('Mock services started successfully!');
console.log(`DolphinScheduler: http://localhost:${dolphinPort}/dolphinscheduler`);
console.log(`Doris: http://localhost:${dorisPort}/api/health`);