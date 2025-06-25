-- 插入DolphinScheduler项目和工作流数据

-- 1. 插入项目
INSERT INTO ds_projects (project_code, project_name, description, user_id, flag, create_time, update_time) VALUES
(1001, '销售数据分析项目', '销售数据分析和指标计算项目', 1, 1, NOW(), NOW());

-- 2. 插入工作流
INSERT INTO ds_workflows (project_code, workflow_code, workflow_name, description, user_id, flag, create_time, update_time) VALUES
(1001, 2001, '销售指标计算工作流', '从原始销售数据计算各类销售指标和客户价值分析', 1, 1, NOW(), NOW());

-- 3. 插入SQL任务
INSERT INTO ds_tasks (project_code, workflow_code, task_code, task_name, task_type, description, flag, create_time, update_time) VALUES
(1001, 2001, 3001, '销售数据汇总', 'SQL', '将原始销售数据按产品、区域进行汇总', 1, NOW(), NOW()),
(1001, 2001, 3002, '销售指标计算', 'SQL', '基于汇总数据计算各类销售指标', 1, NOW(), NOW()),
(1001, 2001, 3003, '客户价值分析', 'SQL', '基于销售数据分析客户价值', 1, NOW(), NOW());

-- 4. 插入SQL任务详情
INSERT INTO ds_sql_tasks (task_code, sql_content, input_tables, output_tables, create_time) VALUES
(3001, 
'INSERT INTO test_sales_summary SELECT DATE(sr.order_date), sr.product_id, sr.product_name, dp.category, sr.region, SUM(sr.quantity), SUM(sr.total_amount), SUM(sr.quantity * dp.cost), SUM(sr.total_amount) - SUM(sr.quantity * dp.cost), COUNT(DISTINCT sr.order_id), COUNT(DISTINCT sr.customer_id) FROM test_sales_raw sr LEFT JOIN test_dim_product dp ON sr.product_id = dp.product_id GROUP BY DATE(sr.order_date), sr.product_id, sr.product_name, dp.category, sr.region',
'test_sales_raw,test_dim_product',
'test_sales_summary',
NOW()),

(3002,
'INSERT INTO test_sales_metrics SELECT summary_date, ''销售额'', ''产品类别销售额'', ''产品类别'', category, SUM(total_amount) FROM test_sales_summary GROUP BY summary_date, category',
'test_sales_summary',
'test_sales_metrics',
NOW()),

(3003,
'INSERT INTO test_customer_value_analysis SELECT CURDATE(), sr.customer_id, sr.customer_name, dc.customer_type, SUM(sr.total_amount), COUNT(DISTINCT sr.order_id), AVG(sr.total_amount), COUNT(DISTINCT sr.order_id) / DATEDIFF(MAX(sr.order_date), MIN(sr.order_date) + 1) * 30, MAX(sr.order_date), SUM(sr.total_amount) * 2, CASE WHEN SUM(sr.total_amount) > 100000 THEN ''VIP'' WHEN SUM(sr.total_amount) > 50000 THEN ''高价值'' WHEN SUM(sr.total_amount) > 20000 THEN ''中价值'' ELSE ''普通'' END FROM test_sales_raw sr LEFT JOIN test_dim_customer dc ON sr.customer_id = dc.customer_id GROUP BY sr.customer_id, sr.customer_name, dc.customer_type',
'test_sales_raw,test_dim_customer',
'test_customer_value_analysis',
NOW());