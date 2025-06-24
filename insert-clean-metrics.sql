-- 设置正确的字符集
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 插入干净的中文数据
INSERT INTO metrics (name, description, category, unit, calculation_formula, data_source, update_frequency, is_active) VALUES
('日活跃用户数', '每日活跃用户数量统计', '用户指标', '人', 'COUNT(DISTINCT user_id)', 'user_activity_log', 'daily', 1),
('订单转化率', '订单转化率统计', '业务指标', '%', '(订单数/访问数)*100', 'analytics_db', 'daily', 1),
('客户满意度', '客户满意度评分', '服务指标', '分', 'AVG(satisfaction_score)', 'feedback_db', 'weekly', 1),
('页面访问量', '网站页面访问量统计', '流量指标', 'PV', 'COUNT(page_view)', 'web_analytics', 'hourly', 1),
('系统可用性', '系统正常运行时间比例', '技术指标', '%', '(正常时间/总时间)*100', 'monitoring_system', 'hourly', 1);