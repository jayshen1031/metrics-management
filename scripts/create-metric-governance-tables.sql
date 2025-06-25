-- ========================================
-- 指标治理体系数据库设计
-- 创建时间：2025-01-25
-- 功能：指标元数据、快照、血缘依赖管理
-- ========================================

-- 1. 指标元数据表
CREATE TABLE IF NOT EXISTS metric_metadata (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    metric_code VARCHAR(100) NOT NULL UNIQUE COMMENT '指标编码，如：DAU、GMV_DAILY',
    metric_name VARCHAR(200) NOT NULL COMMENT '指标中文名称',
    metric_alias VARCHAR(200) COMMENT '指标英文别名',
    metric_type VARCHAR(50) NOT NULL COMMENT '指标类型：原子指标/派生指标/复合指标',
    category_id INT COMMENT '指标分类ID',
    category_path VARCHAR(500) COMMENT '分类路径，如：/业务指标/用户指标/活跃度',
    
    -- 指标定义
    business_definition TEXT COMMENT '业务定义说明',
    technical_definition TEXT COMMENT '技术口径说明',
    calculation_formula TEXT COMMENT '计算公式',
    unit VARCHAR(50) COMMENT '单位：个/元/百分比/%',
    precision_digits INT DEFAULT 2 COMMENT '精度位数',
    
    -- 数据源信息
    source_table VARCHAR(200) COMMENT '主要来源表',
    source_database VARCHAR(100) COMMENT '来源数据库',
    source_fields TEXT COMMENT 'JSON格式，涉及的源字段列表',
    filter_condition TEXT COMMENT '过滤条件',
    
    -- 分区策略
    partition_type VARCHAR(50) COMMENT '分区类型：日期分区/小时分区/月份分区',
    partition_field VARCHAR(100) COMMENT '分区字段',
    partition_format VARCHAR(50) COMMENT '分区格式：yyyyMMdd/yyyy-MM-dd',
    data_retention_days INT DEFAULT 365 COMMENT '数据保留天数',
    
    -- 更新策略
    update_frequency VARCHAR(50) COMMENT '更新频率：实时/小时/日/周/月',
    update_time VARCHAR(50) COMMENT '更新时间：如 02:00',
    update_method VARCHAR(50) COMMENT '更新方式：全量/增量',
    sla_hours DECIMAL(5,2) COMMENT 'SLA保障时间（小时）',
    
    -- 治理字段
    sensitivity_level VARCHAR(20) COMMENT '敏感等级：公开/内部/敏感/机密',
    status VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft/reviewing/approved/online/offline/deprecated',
    quality_score INT DEFAULT 100 COMMENT '质量评分：0-100',
    importance_level VARCHAR(20) COMMENT '重要等级：P0/P1/P2/P3',
    
    -- 负责人信息
    business_owner VARCHAR(100) COMMENT '业务负责人',
    business_owner_email VARCHAR(200) COMMENT '业务负责人邮箱',
    technical_owner VARCHAR(100) COMMENT '技术负责人',
    technical_owner_email VARCHAR(200) COMMENT '技术负责人邮箱',
    
    -- 使用说明
    usage_scenario TEXT COMMENT '使用场景说明',
    calculation_example TEXT COMMENT '计算示例',
    notes TEXT COMMENT '注意事项',
    
    -- 审计字段
    created_by VARCHAR(100) COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by VARCHAR(100) COMMENT '更新人',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    approved_by VARCHAR(100) COMMENT '审批人',
    approved_at TIMESTAMP NULL COMMENT '审批时间',
    
    -- 索引
    INDEX idx_metric_code (metric_code),
    INDEX idx_metric_type (metric_type),
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_sensitivity (sensitivity_level),
    INDEX idx_owner (business_owner, technical_owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标元数据表';

-- 2. 指标快照表（支持历史查询）
CREATE TABLE IF NOT EXISTS metric_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    metric_id BIGINT NOT NULL COMMENT '指标ID',
    metric_code VARCHAR(100) NOT NULL COMMENT '指标编码',
    snapshot_date DATE NOT NULL COMMENT '快照日期',
    
    -- 指标值
    metric_value DECIMAL(30,6) COMMENT '指标值',
    metric_value_str VARCHAR(500) COMMENT '字符串类型指标值',
    
    -- 维度信息（支持多维度）
    dimension_values JSON COMMENT '维度值，如：{"region":"华东","channel":"APP"}',
    
    -- 对比值
    value_yoy DECIMAL(30,6) COMMENT '同比值',
    value_mom DECIMAL(30,6) COMMENT '环比值',
    rate_yoy DECIMAL(10,4) COMMENT '同比增长率',
    rate_mom DECIMAL(10,4) COMMENT '环比增长率',
    
    -- 数据质量
    data_quality_score INT DEFAULT 100 COMMENT '数据质量分：0-100',
    is_abnormal BOOLEAN DEFAULT FALSE COMMENT '是否异常',
    abnormal_reason VARCHAR(500) COMMENT '异常原因',
    
    -- 统计信息
    calculation_time TIMESTAMP COMMENT '计算时间',
    calculation_duration INT COMMENT '计算耗时（秒）',
    source_data_time TIMESTAMP COMMENT '源数据时间',
    
    -- 审计信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 唯一约束和索引
    UNIQUE KEY uk_metric_date_dim (metric_code, snapshot_date, dimension_values),
    INDEX idx_metric_code (metric_code),
    INDEX idx_snapshot_date (snapshot_date),
    INDEX idx_metric_date (metric_id, snapshot_date),
    INDEX idx_quality (data_quality_score),
    INDEX idx_abnormal (is_abnormal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标快照表'
PARTITION BY RANGE (YEAR(snapshot_date) * 100 + MONTH(snapshot_date)) (
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    PARTITION p202503 VALUES LESS THAN (202504),
    PARTITION p202504 VALUES LESS THAN (202505),
    PARTITION p202505 VALUES LESS THAN (202506),
    PARTITION p202506 VALUES LESS THAN (202507),
    PARTITION p202507 VALUES LESS THAN (202508),
    PARTITION p202508 VALUES LESS THAN (202509),
    PARTITION p202509 VALUES LESS THAN (202510),
    PARTITION p202510 VALUES LESS THAN (202511),
    PARTITION p202511 VALUES LESS THAN (202512),
    PARTITION p202512 VALUES LESS THAN (202601)
);

-- 3. 指标血缘依赖表
CREATE TABLE IF NOT EXISTS metric_lineage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    
    -- 上游信息
    upstream_type VARCHAR(50) NOT NULL COMMENT '上游类型：table/field/metric',
    upstream_id VARCHAR(500) NOT NULL COMMENT '上游ID：表名/字段名/指标编码',
    upstream_name VARCHAR(500) COMMENT '上游名称',
    upstream_database VARCHAR(100) COMMENT '上游数据库（仅表/字段）',
    
    -- 下游信息
    downstream_type VARCHAR(50) NOT NULL COMMENT '下游类型：metric/report/dashboard/api',
    downstream_id VARCHAR(500) NOT NULL COMMENT '下游ID：指标编码/报表ID等',
    downstream_name VARCHAR(500) COMMENT '下游名称',
    
    -- 依赖关系
    relation_type VARCHAR(50) COMMENT '关系类型：direct/indirect/transform',
    dependency_level INT DEFAULT 1 COMMENT '依赖层级：1-直接依赖，2-二级依赖...',
    dependency_formula TEXT COMMENT '依赖公式或转换逻辑',
    
    -- 字段级血缘（仅当涉及字段时）
    field_mappings JSON COMMENT '字段映射关系：[{"source":"t1.f1","target":"metric1","transform":"sum"}]',
    
    -- 影响分析
    impact_score INT DEFAULT 50 COMMENT '影响程度：0-100',
    is_critical_path BOOLEAN DEFAULT FALSE COMMENT '是否关键路径',
    
    -- 元数据
    source_system VARCHAR(100) COMMENT '来源系统：DolphinScheduler/Spark/Flink',
    job_id VARCHAR(200) COMMENT '作业ID',
    task_id VARCHAR(200) COMMENT '任务ID',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态：active/inactive/deprecated',
    verified BOOLEAN DEFAULT FALSE COMMENT '是否已验证',
    verified_by VARCHAR(100) COMMENT '验证人',
    verified_at TIMESTAMP NULL COMMENT '验证时间',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    UNIQUE KEY uk_lineage (upstream_type, upstream_id, downstream_type, downstream_id),
    INDEX idx_upstream (upstream_type, upstream_id),
    INDEX idx_downstream (downstream_type, downstream_id),
    INDEX idx_relation_type (relation_type),
    INDEX idx_critical (is_critical_path),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标血缘依赖表';

-- 4. 指标分类表
CREATE TABLE IF NOT EXISTS metric_categories (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
    parent_id INT COMMENT '父分类ID',
    category_name VARCHAR(100) NOT NULL COMMENT '分类名称',
    category_code VARCHAR(50) UNIQUE COMMENT '分类编码',
    category_path VARCHAR(500) COMMENT '分类路径',
    level INT DEFAULT 1 COMMENT '层级',
    sort_order INT DEFAULT 0 COMMENT '排序',
    description TEXT COMMENT '分类说明',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_id),
    INDEX idx_path (category_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标分类表';

-- 5. 指标使用记录表（追踪指标被谁调用）
CREATE TABLE IF NOT EXISTS metric_usage_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    metric_code VARCHAR(100) NOT NULL COMMENT '指标编码',
    
    -- 调用方信息
    caller_type VARCHAR(50) COMMENT '调用方类型：report/dashboard/api/export',
    caller_id VARCHAR(200) COMMENT '调用方ID',
    caller_name VARCHAR(500) COMMENT '调用方名称',
    caller_system VARCHAR(100) COMMENT '调用系统',
    
    -- 使用信息
    usage_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '使用时间',
    user_id VARCHAR(100) COMMENT '使用人ID',
    user_name VARCHAR(200) COMMENT '使用人姓名',
    department VARCHAR(200) COMMENT '部门',
    
    -- 查询信息
    query_params JSON COMMENT '查询参数',
    query_dimensions JSON COMMENT '查询维度',
    date_range_start DATE COMMENT '查询开始日期',
    date_range_end DATE COMMENT '查询结束日期',
    
    -- 性能信息
    response_time_ms INT COMMENT '响应时间（毫秒）',
    data_rows INT COMMENT '返回数据行数',
    
    -- 索引
    INDEX idx_metric_code (metric_code),
    INDEX idx_usage_time (usage_time),
    INDEX idx_caller (caller_type, caller_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标使用记录表'
PARTITION BY RANGE (TO_DAYS(usage_time)) (
    PARTITION p0 VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p1 VALUES LESS THAN (TO_DAYS('2025-03-01')),
    PARTITION p2 VALUES LESS THAN (TO_DAYS('2025-04-01')),
    PARTITION p3 VALUES LESS THAN (TO_DAYS('2025-05-01')),
    PARTITION p4 VALUES LESS THAN (TO_DAYS('2025-06-01')),
    PARTITION p5 VALUES LESS THAN (TO_DAYS('2025-07-01')),
    PARTITION p6 VALUES LESS THAN MAXVALUE
);

-- 6. 指标质量监控表
CREATE TABLE IF NOT EXISTS metric_quality_monitoring (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    metric_code VARCHAR(100) NOT NULL,
    check_date DATE NOT NULL,
    
    -- 质量检查项
    completeness_score INT COMMENT '完整性得分：0-100',
    accuracy_score INT COMMENT '准确性得分：0-100',
    timeliness_score INT COMMENT '及时性得分：0-100',
    consistency_score INT COMMENT '一致性得分：0-100',
    overall_score INT COMMENT '综合得分：0-100',
    
    -- 异常检测
    has_null_values BOOLEAN DEFAULT FALSE COMMENT '是否有空值',
    null_value_ratio DECIMAL(5,2) COMMENT '空值比例',
    has_outliers BOOLEAN DEFAULT FALSE COMMENT '是否有异常值',
    outlier_count INT COMMENT '异常值数量',
    
    -- 规则检查
    failed_rules JSON COMMENT '失败的质量规则列表',
    warning_messages JSON COMMENT '警告信息',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_metric_date (metric_code, check_date),
    INDEX idx_check_date (check_date),
    INDEX idx_overall_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标质量监控表';

-- ========================================
-- 初始化数据
-- ========================================

-- 插入指标分类
INSERT INTO metric_categories (parent_id, category_name, category_code, category_path, level) VALUES
(NULL, '业务指标', 'business', '/业务指标', 1),
(1, '用户指标', 'user', '/业务指标/用户指标', 2),
(1, '交易指标', 'trade', '/业务指标/交易指标', 2),
(1, '财务指标', 'finance', '/业务指标/财务指标', 2),
(NULL, '技术指标', 'tech', '/技术指标', 1),
(5, '性能指标', 'performance', '/技术指标/性能指标', 2),
(5, '稳定性指标', 'stability', '/技术指标/稳定性指标', 2);

-- 插入示例指标元数据
INSERT INTO metric_metadata (
    metric_code, metric_name, metric_type, category_id, 
    business_definition, calculation_formula, unit,
    source_table, source_database, partition_type,
    update_frequency, sensitivity_level, status, importance_level,
    business_owner, technical_owner
) VALUES
('DAU', '日活跃用户数', '原子指标', 2,
 '每日访问产品的去重用户数', 'COUNT(DISTINCT user_id)', '人',
 'user_activity_log', 'dw', '日期分区',
 '日', '内部', 'online', 'P0',
 '张三', '李四'),
 
('GMV_DAILY', '日交易总额', '原子指标', 3,
 '每日所有订单的交易金额总和', 'SUM(order_amount)', '元',
 'order_detail', 'dw', '日期分区',
 '日', '敏感', 'online', 'P0',
 '王五', '赵六'),
 
('ARPU', '用户平均收入', '派生指标', 3,
 '平均每个活跃用户贡献的收入', 'GMV_DAILY / DAU', '元/人',
 NULL, NULL, NULL,
 '日', '敏感', 'online', 'P1',
 '王五', '赵六');

-- 插入指标血缘关系示例
INSERT INTO metric_lineage (
    upstream_type, upstream_id, upstream_name,
    downstream_type, downstream_id, downstream_name,
    relation_type, dependency_level
) VALUES
-- 表到指标的血缘
('table', 'dw.user_activity_log', '用户活动日志表',
 'metric', 'DAU', '日活跃用户数',
 'direct', 1),
 
('table', 'dw.order_detail', '订单明细表',
 'metric', 'GMV_DAILY', '日交易总额',
 'direct', 1),
 
-- 指标到指标的血缘
('metric', 'DAU', '日活跃用户数',
 'metric', 'ARPU', '用户平均收入',
 'direct', 1),
 
('metric', 'GMV_DAILY', '日交易总额',
 'metric', 'ARPU', '用户平均收入',
 'direct', 1),
 
-- 指标到报表的血缘
('metric', 'DAU', '日活跃用户数',
 'report', 'daily_operation_report', '每日运营报表',
 'direct', 1),
 
('metric', 'ARPU', '用户平均收入',
 'dashboard', 'executive_dashboard', '高管看板',
 'direct', 1);