-- 创建指标管理数据库
CREATE DATABASE IF NOT EXISTS metrics_management DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE metrics_management;

-- 指标定义表
CREATE TABLE IF NOT EXISTS metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '指标名称',
  description TEXT COMMENT '指标描述',
  category VARCHAR(100) NOT NULL COMMENT '指标分类',
  unit VARCHAR(50) COMMENT '计量单位',
  calculation_formula TEXT COMMENT '计算公式',
  data_source VARCHAR(255) COMMENT '数据源',
  update_frequency ENUM('real-time', 'hourly', 'daily', 'weekly', 'monthly') DEFAULT 'daily' COMMENT '更新频率',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category (category),
  INDEX idx_is_active (is_active),
  UNIQUE KEY uk_name (name)
) COMMENT '指标定义表';

-- 指标值表
CREATE TABLE IF NOT EXISTS metric_values (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  metric_id INT NOT NULL COMMENT '指标ID',
  value DECIMAL(20,4) NOT NULL COMMENT '指标值',
  calculation_date DATE NOT NULL COMMENT '计算日期',
  data_quality_score TINYINT DEFAULT 100 COMMENT '数据质量评分(0-100)',
  source_data_count INT DEFAULT 0 COMMENT '源数据条数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE,
  INDEX idx_metric_date (metric_id, calculation_date),
  INDEX idx_calculation_date (calculation_date),
  UNIQUE KEY uk_metric_date (metric_id, calculation_date)
) COMMENT '指标值表';

-- 指标目标表
CREATE TABLE IF NOT EXISTS metric_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_id INT NOT NULL COMMENT '指标ID',
  target_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly') NOT NULL COMMENT '目标类型',
  target_value DECIMAL(20,4) NOT NULL COMMENT '目标值',
  target_period VARCHAR(20) NOT NULL COMMENT '目标周期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE,
  INDEX idx_metric_period (metric_id, target_period),
  UNIQUE KEY uk_metric_target (metric_id, target_type, target_period)
) COMMENT '指标目标表';

-- 数据源配置表
CREATE TABLE IF NOT EXISTS data_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '数据源名称',
  type ENUM('database', 'api', 'file', 'manual') NOT NULL COMMENT '数据源类型',
  connection_config JSON COMMENT '连接配置',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_name (name)
) COMMENT '数据源配置表';

-- 指标计算日志表
CREATE TABLE IF NOT EXISTS metric_calculation_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  metric_id INT NOT NULL COMMENT '指标ID',
  calculation_date DATE NOT NULL COMMENT '计算日期',
  status ENUM('success', 'failed', 'pending') NOT NULL COMMENT '计算状态',
  execution_time DECIMAL(10,3) COMMENT '执行时间(秒)',
  error_message TEXT COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE,
  INDEX idx_metric_date_status (metric_id, calculation_date, status),
  INDEX idx_status_date (status, calculation_date)
) COMMENT '指标计算日志表';

-- 插入示例数据
INSERT INTO metrics (name, description, category, unit, calculation_formula, data_source, update_frequency) VALUES
('日活跃用户数', '每日活跃用户数量统计', '用户指标', '人', 'COUNT(DISTINCT user_id)', 'user_activity_db', 'daily'),
('营收总额', '每日营收总额', '财务指标', '元', 'SUM(order_amount)', 'order_db', 'daily'),
('订单转化率', '订单转化率', '业务指标', '%', '(订单数/访问数)*100', 'analytics_db', 'daily'),
('客户满意度', '客户满意度评分', '服务指标', '分', 'AVG(satisfaction_score)', 'feedback_db', 'weekly'),
('系统可用性', '系统正常运行时间比例', '技术指标', '%', '(正常时间/总时间)*100', 'monitoring_system', 'hourly');

INSERT INTO data_sources (name, type, connection_config) VALUES
('用户行为数据库', 'database', '{"host": "localhost", "database": "user_analytics"}'),
('订单管理系统', 'database', '{"host": "localhost", "database": "order_system"}'),
('客户反馈API', 'api', '{"endpoint": "https://api.feedback.com/v1", "auth_type": "bearer"}'),
('监控系统', 'api', '{"endpoint": "https://monitoring.internal/api", "auth_type": "api_key"}');

-- 插入示例指标值
INSERT INTO metric_values (metric_id, value, calculation_date) VALUES
(1, 15420, '2025-06-20'),
(1, 16280, '2025-06-21'),
(1, 14950, '2025-06-22'),
(2, 285600.50, '2025-06-20'),
(2, 320100.75, '2025-06-21'),
(2, 298450.25, '2025-06-22'),
(3, 12.5, '2025-06-20'),
(3, 13.8, '2025-06-21'),
(3, 11.9, '2025-06-22');

-- 插入示例目标
INSERT INTO metric_targets (metric_id, target_type, target_value, target_period) VALUES
(1, 'daily', 20000, '2025-06'),
(2, 'monthly', 10000000, '2025-06'),
(3, 'monthly', 15.0, '2025-06'),
(4, 'weekly', 4.5, '2025-W25'),
(5, 'daily', 99.9, '2025-06-24');

-- DolphinScheduler相关表
CREATE TABLE IF NOT EXISTS ds_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_code BIGINT NOT NULL COMMENT '项目代码',
  project_name VARCHAR(255) NOT NULL COMMENT '项目名称',
  description TEXT COMMENT '项目描述',
  user_id INT COMMENT '用户ID',
  flag TINYINT DEFAULT 1 COMMENT '标识',
  create_time DATETIME COMMENT '创建时间',
  update_time DATETIME COMMENT '更新时间',
  sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '同步时间',
  UNIQUE KEY uk_project_code (project_code),
  INDEX idx_project_name (project_name)
) COMMENT 'DolphinScheduler项目表';

CREATE TABLE IF NOT EXISTS ds_workflows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_code BIGINT NOT NULL COMMENT '项目代码',
  workflow_code BIGINT NOT NULL COMMENT '工作流代码',
  workflow_name VARCHAR(255) NOT NULL COMMENT '工作流名称',
  description TEXT COMMENT '工作流描述',
  user_id INT COMMENT '用户ID',
  flag TINYINT DEFAULT 1 COMMENT '标识',
  create_time DATETIME COMMENT '创建时间',
  update_time DATETIME COMMENT '更新时间',
  version INT COMMENT '版本号',
  sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '同步时间',
  UNIQUE KEY uk_workflow_code (workflow_code),
  INDEX idx_project_code (project_code),
  INDEX idx_workflow_name (workflow_name)
) COMMENT 'DolphinScheduler工作流表';

CREATE TABLE IF NOT EXISTS ds_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_code BIGINT NOT NULL COMMENT '项目代码',
  task_code BIGINT NOT NULL COMMENT '任务代码',
  task_name VARCHAR(255) NOT NULL COMMENT '任务名称',
  description TEXT COMMENT '任务描述',
  task_type VARCHAR(50) COMMENT '任务类型',
  user_id INT COMMENT '用户ID',
  flag TINYINT DEFAULT 1 COMMENT '标识',
  create_time DATETIME COMMENT '创建时间',
  update_time DATETIME COMMENT '更新时间',
  version INT COMMENT '版本号',
  sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '同步时间',
  UNIQUE KEY uk_task_code (task_code),
  INDEX idx_project_code (project_code),
  INDEX idx_task_type (task_type)
) COMMENT 'DolphinScheduler任务表';

CREATE TABLE IF NOT EXISTS ds_sql_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_code BIGINT NOT NULL COMMENT '项目代码',
  workflow_code BIGINT NOT NULL COMMENT '工作流代码',
  task_code BIGINT NOT NULL COMMENT '任务代码',
  task_name VARCHAR(255) NOT NULL COMMENT '任务名称',
  sql_content LONGTEXT COMMENT 'SQL内容',
  datasource VARCHAR(255) COMMENT '数据源',
  task_type VARCHAR(50) COMMENT '任务类型',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_task_code (task_code),
  INDEX idx_workflow_code (workflow_code),
  INDEX idx_datasource (datasource)
) COMMENT 'DolphinScheduler SQL任务表';

-- Doris相关表
CREATE TABLE IF NOT EXISTS doris_databases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  database_name VARCHAR(255) NOT NULL COMMENT '数据库名称',
  catalog_name VARCHAR(255) DEFAULT 'internal' COMMENT '目录名称',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_database_name (database_name, catalog_name)
) COMMENT 'Doris数据库表';

CREATE TABLE IF NOT EXISTS doris_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  database_name VARCHAR(255) NOT NULL COMMENT '数据库名称',
  table_name VARCHAR(255) NOT NULL COMMENT '表名称',
  table_type VARCHAR(50) COMMENT '表类型',
  engine VARCHAR(50) COMMENT '存储引擎',
  table_comment TEXT COMMENT '表注释',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_table_name (database_name, table_name),
  INDEX idx_database_name (database_name),
  INDEX idx_table_type (table_type)
) COMMENT 'Doris表信息表';

CREATE TABLE IF NOT EXISTS doris_columns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  database_name VARCHAR(255) NOT NULL COMMENT '数据库名称',
  table_name VARCHAR(255) NOT NULL COMMENT '表名称',
  column_name VARCHAR(255) NOT NULL COMMENT '列名称',
  data_type VARCHAR(100) COMMENT '数据类型',
  is_nullable VARCHAR(10) COMMENT '是否可空',
  column_default TEXT COMMENT '默认值',
  column_comment TEXT COMMENT '列注释',
  ordinal_position INT COMMENT '列位置',
  column_size BIGINT COMMENT '列大小',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_column_name (database_name, table_name, column_name),
  INDEX idx_table_name (database_name, table_name)
) COMMENT 'Doris列信息表';

CREATE TABLE IF NOT EXISTS doris_table_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  database_name VARCHAR(255) NOT NULL COMMENT '数据库名称',
  table_name VARCHAR(255) NOT NULL COMMENT '表名称',
  row_count BIGINT DEFAULT 0 COMMENT '行数',
  last_updated DATETIME COMMENT '最后更新时间',
  sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '同步时间',
  UNIQUE KEY uk_table_stats (database_name, table_name)
) COMMENT 'Doris表统计信息表';

CREATE TABLE IF NOT EXISTS doris_table_partitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  database_name VARCHAR(255) NOT NULL COMMENT '数据库名称',
  table_name VARCHAR(255) NOT NULL COMMENT '表名称',
  partition_name VARCHAR(255) COMMENT '分区名称',
  partition_desc TEXT COMMENT '分区描述',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_table_partition (database_name, table_name)
) COMMENT 'Doris表分区信息表';

-- 数据血缘表
CREATE TABLE IF NOT EXISTS data_lineage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL COMMENT '源类型',
  source_id VARCHAR(500) NOT NULL COMMENT '源ID',
  target_type VARCHAR(50) NOT NULL COMMENT '目标类型',
  target_id VARCHAR(500) NOT NULL COMMENT '目标ID',
  relation_type VARCHAR(50) COMMENT '关系类型',
  sql_content LONGTEXT COMMENT 'SQL内容',
  project_code BIGINT COMMENT '项目代码',
  workflow_code BIGINT COMMENT '工作流代码',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_lineage (source_id, target_id, relation_type),
  INDEX idx_source (source_type, source_id),
  INDEX idx_target (target_type, target_id),
  INDEX idx_project_workflow (project_code, workflow_code)
) COMMENT '数据血缘关系表';

-- 元数据采集日志表
CREATE TABLE IF NOT EXISTS metadata_collection_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  start_time DATETIME COMMENT '开始时间',
  end_time DATETIME COMMENT '结束时间',
  duration BIGINT COMMENT '耗时(毫秒)',
  success BOOLEAN DEFAULT FALSE COMMENT '是否成功',
  errors JSON COMMENT '错误信息',
  statistics JSON COMMENT '统计信息',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_success_time (success, create_time),
  INDEX idx_create_time (create_time)
) COMMENT '元数据采集日志表';

-- 资产标签表
CREATE TABLE IF NOT EXISTS asset_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id VARCHAR(500) NOT NULL COMMENT '资产ID',
  tag_name VARCHAR(100) NOT NULL COMMENT '标签名称',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_asset_tag (asset_id, tag_name),
  INDEX idx_tag_name (tag_name),
  INDEX idx_asset_id (asset_id)
) COMMENT '资产标签表';