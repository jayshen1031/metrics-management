-- 插入测试血缘关系数据
INSERT INTO data_lineage (
  source_type, source_id, source_name,
  target_type, target_id, target_name,
  relation_type, sql_statement, metadata
) VALUES 
('table', 'test_sales_raw', 'test_sales_raw', 
 'table', 'test_sales_summary', 'test_sales_summary',
 'data_flow', 'INSERT INTO test_sales_summary SELECT ... FROM test_sales_raw',
 '{"workflow": "销售数据处理", "task": "数据汇总"}'),

('table', 'test_dim_product', 'test_dim_product',
 'table', 'test_sales_summary', 'test_sales_summary', 
 'data_flow', 'INSERT INTO test_sales_summary SELECT ... FROM test_sales_raw JOIN test_dim_product',
 '{"workflow": "销售数据处理", "task": "数据汇总"}'),
 
('table', 'test_sales_summary', 'test_sales_summary',
 'table', 'test_sales_metrics', 'test_sales_metrics',
 'data_flow', 'INSERT INTO test_sales_metrics SELECT ... FROM test_sales_summary',
 '{"workflow": "销售数据处理", "task": "指标计算"}'),
 
('table', 'test_sales_raw', 'test_sales_raw',
 'table', 'test_customer_value_analysis', 'test_customer_value_analysis',
 'data_flow', 'INSERT INTO test_customer_value_analysis SELECT ... FROM test_sales_raw',
 '{"workflow": "销售数据处理", "task": "客户分析"}'),
 
('table', 'test_dim_customer', 'test_dim_customer',
 'table', 'test_customer_value_analysis', 'test_customer_value_analysis',
 'data_flow', 'INSERT INTO test_customer_value_analysis SELECT ... FROM test_sales_raw JOIN test_dim_customer',
 '{"workflow": "销售数据处理", "task": "客户分析"}');