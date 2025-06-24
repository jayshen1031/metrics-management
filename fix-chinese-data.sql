-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 清理现有指标数据
DELETE FROM metrics WHERE id IN (1, 2, 3, 4);

-- 重新插入正确的中文指标数据
INSERT INTO metrics (id, name, description, category, unit, calculation_formula, data_source, update_frequency, is_active) VALUES
(1, '日活跃用户数', '每日活跃用户数量统计', '用户指标', '人', 'COUNT(DISTINCT user_id)', 'user_activity_log', 'daily', 1),
(2, '订单转化率', '订单转化率统计', '业务指标', '%', '(订单数/访问数)*100', 'analytics_db', 'daily', 1),
(3, '客户满意度', '客户满意度评分', '服务指标', '分', 'AVG(satisfaction_score)', 'feedback_db', 'weekly', 1),
(4, '页面访问量', '网站页面访问量统计', '流量指标', 'PV', 'COUNT(page_view)', 'web_analytics', 'hourly', 1);