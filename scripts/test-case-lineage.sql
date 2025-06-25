-- 测试案例：数据血缘分析演示
-- 创建时间：2025-06-25
-- 说明：包含源表、目标表、中间表的完整数据处理流程

-- ========================================
-- 1. 创建测试表结构
-- ========================================

-- 1.1 销售原始数据表（源表）
CREATE TABLE IF NOT EXISTS test_sales_raw (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(50) NOT NULL COMMENT '订单ID',
    product_id VARCHAR(50) NOT NULL COMMENT '产品ID',
    product_name VARCHAR(100) COMMENT '产品名称',
    customer_id VARCHAR(50) NOT NULL COMMENT '客户ID',
    customer_name VARCHAR(100) COMMENT '客户名称',
    order_date DATE NOT NULL COMMENT '订单日期',
    quantity INT NOT NULL COMMENT '数量',
    unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    region VARCHAR(50) COMMENT '销售区域',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售原始数据表';

-- 1.2 产品维度表（源表）
CREATE TABLE IF NOT EXISTS test_dim_product (
    product_id VARCHAR(50) PRIMARY KEY COMMENT '产品ID',
    product_name VARCHAR(100) NOT NULL COMMENT '产品名称',
    category VARCHAR(50) COMMENT '产品类别',
    brand VARCHAR(50) COMMENT '品牌',
    supplier VARCHAR(100) COMMENT '供应商',
    cost DECIMAL(10,2) COMMENT '成本',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品维度表';

-- 1.3 客户维度表（源表）
CREATE TABLE IF NOT EXISTS test_dim_customer (
    customer_id VARCHAR(50) PRIMARY KEY COMMENT '客户ID',
    customer_name VARCHAR(100) NOT NULL COMMENT '客户名称',
    customer_type VARCHAR(20) COMMENT '客户类型',
    industry VARCHAR(50) COMMENT '行业',
    region VARCHAR(50) COMMENT '区域',
    credit_level VARCHAR(10) COMMENT '信用等级',
    register_date DATE COMMENT '注册日期',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户维度表';

-- 1.4 销售汇总中间表
CREATE TABLE IF NOT EXISTS test_sales_summary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    summary_date DATE NOT NULL COMMENT '汇总日期',
    product_id VARCHAR(50) NOT NULL COMMENT '产品ID',
    product_name VARCHAR(100) COMMENT '产品名称',
    category VARCHAR(50) COMMENT '产品类别',
    region VARCHAR(50) COMMENT '销售区域',
    total_quantity INT COMMENT '总销量',
    total_amount DECIMAL(15,2) COMMENT '总销售额',
    total_cost DECIMAL(15,2) COMMENT '总成本',
    gross_profit DECIMAL(15,2) COMMENT '毛利润',
    order_count INT COMMENT '订单数',
    customer_count INT COMMENT '客户数',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售汇总中间表';

-- 1.5 销售指标报表（目标表）
CREATE TABLE IF NOT EXISTS test_sales_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_date DATE NOT NULL COMMENT '指标日期',
    metric_type VARCHAR(50) NOT NULL COMMENT '指标类型',
    metric_name VARCHAR(100) NOT NULL COMMENT '指标名称',
    dimension_type VARCHAR(50) COMMENT '维度类型',
    dimension_value VARCHAR(100) COMMENT '维度值',
    metric_value DECIMAL(20,2) COMMENT '指标值',
    year_on_year_rate DECIMAL(10,2) COMMENT '同比增长率',
    month_on_month_rate DECIMAL(10,2) COMMENT '环比增长率',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY idx_date_type (metric_date, metric_type),
    KEY idx_dimension (dimension_type, dimension_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售指标报表';

-- 1.6 客户价值分析表（目标表）
CREATE TABLE IF NOT EXISTS test_customer_value_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    analysis_date DATE NOT NULL COMMENT '分析日期',
    customer_id VARCHAR(50) NOT NULL COMMENT '客户ID',
    customer_name VARCHAR(100) COMMENT '客户名称',
    customer_type VARCHAR(20) COMMENT '客户类型',
    total_purchase_amount DECIMAL(15,2) COMMENT '累计购买金额',
    total_order_count INT COMMENT '累计订单数',
    avg_order_amount DECIMAL(10,2) COMMENT '平均订单金额',
    purchase_frequency DECIMAL(10,2) COMMENT '购买频率',
    last_purchase_date DATE COMMENT '最后购买日期',
    customer_lifetime_value DECIMAL(15,2) COMMENT '客户生命周期价值',
    customer_segment VARCHAR(20) COMMENT '客户分层',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY idx_customer (customer_id),
    KEY idx_segment (customer_segment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户价值分析表';

-- ========================================
-- 2. 插入测试数据
-- ========================================

-- 2.1 插入产品维度数据
INSERT INTO test_dim_product (product_id, product_name, category, brand, supplier, cost) VALUES
('P001', '智能手机X1', '电子产品', 'TechBrand', '深圳科技有限公司', 2000.00),
('P002', '笔记本电脑Pro', '电子产品', 'TechBrand', '深圳科技有限公司', 5000.00),
('P003', '无线耳机Air', '配件', 'TechBrand', '东莞配件厂', 300.00),
('P004', '平板电脑Tab', '电子产品', 'TechBrand', '深圳科技有限公司', 3000.00),
('P005', '智能手表Watch', '配件', 'TechBrand', '东莞配件厂', 1000.00);

-- 2.2 插入客户维度数据
INSERT INTO test_dim_customer (customer_id, customer_name, customer_type, industry, region, credit_level, register_date) VALUES
('C001', '北京科技公司', '企业', '科技', '华北', 'A', '2023-01-15'),
('C002', '上海贸易公司', '企业', '贸易', '华东', 'B', '2023-02-20'),
('C003', '张三', '个人', NULL, '华南', 'A', '2023-03-10'),
('C004', '深圳创新公司', '企业', '科技', '华南', 'A', '2023-04-05'),
('C005', '成都服务公司', '企业', '服务', '西南', 'B', '2023-05-12');

-- 2.3 插入销售原始数据（最近30天的数据）
INSERT INTO test_sales_raw (order_id, product_id, product_name, customer_id, customer_name, order_date, quantity, unit_price, total_amount, region) VALUES
-- 2025年5月数据
('ORD202505001', 'P001', '智能手机X1', 'C001', '北京科技公司', '2025-05-26', 10, 3000.00, 30000.00, '华北'),
('ORD202505002', 'P002', '笔记本电脑Pro', 'C001', '北京科技公司', '2025-05-27', 5, 8000.00, 40000.00, '华北'),
('ORD202505003', 'P003', '无线耳机Air', 'C002', '上海贸易公司', '2025-05-28', 20, 500.00, 10000.00, '华东'),
('ORD202505004', 'P001', '智能手机X1', 'C003', '张三', '2025-05-29', 1, 3000.00, 3000.00, '华南'),
('ORD202505005', 'P004', '平板电脑Tab', 'C004', '深圳创新公司', '2025-05-30', 8, 4500.00, 36000.00, '华南'),
('ORD202505006', 'P005', '智能手表Watch', 'C005', '成都服务公司', '2025-05-30', 15, 1500.00, 22500.00, '西南'),

-- 2025年6月数据
('ORD202506001', 'P001', '智能手机X1', 'C002', '上海贸易公司', '2025-06-01', 12, 3000.00, 36000.00, '华东'),
('ORD202506002', 'P002', '笔记本电脑Pro', 'C004', '深圳创新公司', '2025-06-05', 6, 8000.00, 48000.00, '华南'),
('ORD202506003', 'P003', '无线耳机Air', 'C001', '北京科技公司', '2025-06-10', 30, 500.00, 15000.00, '华北'),
('ORD202506004', 'P004', '平板电脑Tab', 'C003', '张三', '2025-06-15', 2, 4500.00, 9000.00, '华南'),
('ORD202506005', 'P005', '智能手表Watch', 'C002', '上海贸易公司', '2025-06-20', 10, 1500.00, 15000.00, '华东'),
('ORD202506006', 'P001', '智能手机X1', 'C005', '成都服务公司', '2025-06-22', 8, 3000.00, 24000.00, '西南'),
('ORD202506007', 'P002', '笔记本电脑Pro', 'C001', '北京科技公司', '2025-06-23', 4, 8000.00, 32000.00, '华北'),
('ORD202506008', 'P003', '无线耳机Air', 'C004', '深圳创新公司', '2025-06-24', 25, 500.00, 12500.00, '华南'),
('ORD202506009', 'P004', '平板电脑Tab', 'C005', '成都服务公司', '2025-06-25', 5, 4500.00, 22500.00, '西南');

-- ========================================
-- 3. ETL处理SQL（模拟DolphinScheduler任务）
-- ========================================

-- 3.1 销售汇总任务
-- 将原始销售数据按产品、区域进行汇总
INSERT INTO test_sales_summary (
    summary_date,
    product_id,
    product_name,
    category,
    region,
    total_quantity,
    total_amount,
    total_cost,
    gross_profit,
    order_count,
    customer_count
)
SELECT 
    DATE(sr.order_date) as summary_date,
    sr.product_id,
    sr.product_name,
    dp.category,
    sr.region,
    SUM(sr.quantity) as total_quantity,
    SUM(sr.total_amount) as total_amount,
    SUM(sr.quantity * dp.cost) as total_cost,
    SUM(sr.total_amount) - SUM(sr.quantity * dp.cost) as gross_profit,
    COUNT(DISTINCT sr.order_id) as order_count,
    COUNT(DISTINCT sr.customer_id) as customer_count
FROM test_sales_raw sr
LEFT JOIN test_dim_product dp ON sr.product_id = dp.product_id
WHERE sr.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(sr.order_date), sr.product_id, sr.product_name, dp.category, sr.region;

-- 3.2 销售指标计算任务
-- 基于汇总数据计算各类销售指标
INSERT INTO test_sales_metrics (
    metric_date,
    metric_type,
    metric_name,
    dimension_type,
    dimension_value,
    metric_value
)
-- 按产品类别的销售额指标
SELECT 
    summary_date as metric_date,
    '销售额' as metric_type,
    '产品类别销售额' as metric_name,
    '产品类别' as dimension_type,
    category as dimension_value,
    SUM(total_amount) as metric_value
FROM test_sales_summary
GROUP BY summary_date, category

UNION ALL

-- 按区域的销售额指标
SELECT 
    summary_date as metric_date,
    '销售额' as metric_type,
    '区域销售额' as metric_name,
    '销售区域' as dimension_type,
    region as dimension_value,
    SUM(total_amount) as metric_value
FROM test_sales_summary
GROUP BY summary_date, region

UNION ALL

-- 毛利率指标
SELECT 
    summary_date as metric_date,
    '利润率' as metric_type,
    '产品毛利率' as metric_name,
    '产品' as dimension_type,
    product_name as dimension_value,
    ROUND(SUM(gross_profit) / SUM(total_amount) * 100, 2) as metric_value
FROM test_sales_summary
WHERE total_amount > 0
GROUP BY summary_date, product_name;

-- 3.3 客户价值分析任务
-- 基于销售数据分析客户价值
INSERT INTO test_customer_value_analysis (
    analysis_date,
    customer_id,
    customer_name,
    customer_type,
    total_purchase_amount,
    total_order_count,
    avg_order_amount,
    purchase_frequency,
    last_purchase_date,
    customer_lifetime_value,
    customer_segment
)
SELECT 
    CURDATE() as analysis_date,
    sr.customer_id,
    sr.customer_name,
    dc.customer_type,
    SUM(sr.total_amount) as total_purchase_amount,
    COUNT(DISTINCT sr.order_id) as total_order_count,
    AVG(sr.total_amount) as avg_order_amount,
    COUNT(DISTINCT sr.order_id) / DATEDIFF(MAX(sr.order_date), MIN(sr.order_date) + 1) * 30 as purchase_frequency,
    MAX(sr.order_date) as last_purchase_date,
    SUM(sr.total_amount) * 2 as customer_lifetime_value, -- 简化的CLV计算
    CASE 
        WHEN SUM(sr.total_amount) > 100000 THEN 'VIP'
        WHEN SUM(sr.total_amount) > 50000 THEN '高价值'
        WHEN SUM(sr.total_amount) > 20000 THEN '中价值'
        ELSE '普通'
    END as customer_segment
FROM test_sales_raw sr
LEFT JOIN test_dim_customer dc ON sr.customer_id = dc.customer_id
GROUP BY sr.customer_id, sr.customer_name, dc.customer_type;

-- ========================================
-- 4. 查看数据血缘关系
-- ========================================
-- 通过上述ETL过程，形成了以下血缘关系：
-- test_sales_raw + test_dim_product -> test_sales_summary
-- test_sales_summary -> test_sales_metrics
-- test_sales_raw + test_dim_customer -> test_customer_value_analysis