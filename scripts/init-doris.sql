-- 初始化Doris测试数据库和表

-- 创建测试数据库
CREATE DATABASE IF NOT EXISTS test_metrics;
USE test_metrics;

-- 创建用户活动日志表（用于演示DAU指标）
CREATE TABLE IF NOT EXISTS user_activity_log (
    user_id BIGINT NOT NULL COMMENT '用户ID',
    action_type VARCHAR(50) COMMENT '行为类型',
    action_time DATETIME NOT NULL COMMENT '行为时间',
    platform VARCHAR(20) COMMENT '平台',
    country VARCHAR(50) COMMENT '国家',
    create_date DATE NOT NULL COMMENT '日期分区'
) ENGINE = OLAP
DUPLICATE KEY(user_id, action_time)
PARTITION BY RANGE(create_date) (
    PARTITION p20250601 VALUES LESS THAN ("2025-06-02"),
    PARTITION p20250602 VALUES LESS THAN ("2025-06-03"),
    PARTITION p20250603 VALUES LESS THAN ("2025-06-04"),
    PARTITION p20250604 VALUES LESS THAN ("2025-06-05"),
    PARTITION p20250605 VALUES LESS THAN ("2025-06-06"),
    PARTITION p20250606 VALUES LESS THAN ("2025-06-07"),
    PARTITION p20250607 VALUES LESS THAN ("2025-06-08"),
    PARTITION p20250608 VALUES LESS THAN ("2025-06-09"),
    PARTITION p20250609 VALUES LESS THAN ("2025-06-10"),
    PARTITION p20250610 VALUES LESS THAN ("2025-06-11"),
    PARTITION p20250611 VALUES LESS THAN ("2025-06-12"),
    PARTITION p20250612 VALUES LESS THAN ("2025-06-13"),
    PARTITION p20250613 VALUES LESS THAN ("2025-06-14"),
    PARTITION p20250614 VALUES LESS THAN ("2025-06-15"),
    PARTITION p20250615 VALUES LESS THAN ("2025-06-16"),
    PARTITION p20250616 VALUES LESS THAN ("2025-06-17"),
    PARTITION p20250617 VALUES LESS THAN ("2025-06-18"),
    PARTITION p20250618 VALUES LESS THAN ("2025-06-19"),
    PARTITION p20250619 VALUES LESS THAN ("2025-06-20"),
    PARTITION p20250620 VALUES LESS THAN ("2025-06-21"),
    PARTITION p20250621 VALUES LESS THAN ("2025-06-22"),
    PARTITION p20250622 VALUES LESS THAN ("2025-06-23"),
    PARTITION p20250623 VALUES LESS THAN ("2025-06-24"),
    PARTITION p20250624 VALUES LESS THAN ("2025-06-25"),
    PARTITION p20250625 VALUES LESS THAN ("2025-06-26"),
    PARTITION p20250626 VALUES LESS THAN ("2025-06-27"),
    PARTITION p20250627 VALUES LESS THAN ("2025-06-28"),
    PARTITION p20250628 VALUES LESS THAN ("2025-06-29"),
    PARTITION p20250629 VALUES LESS THAN ("2025-06-30"),
    PARTITION p20250630 VALUES LESS THAN ("2025-07-01")
)
DISTRIBUTED BY HASH(user_id) BUCKETS 16
PROPERTIES (
    "replication_num" = "1",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "DAY",
    "dynamic_partition.start" = "-7",
    "dynamic_partition.end" = "3",
    "dynamic_partition.prefix" = "p",
    "dynamic_partition.buckets" = "16"
);

-- 创建订单表（用于演示订单相关指标）
CREATE TABLE IF NOT EXISTS orders (
    order_id BIGINT NOT NULL COMMENT '订单ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    product_id BIGINT COMMENT '产品ID',
    order_amount DECIMAL(10,2) COMMENT '订单金额',
    order_status VARCHAR(20) COMMENT '订单状态',
    order_time DATETIME NOT NULL COMMENT '下单时间',
    pay_time DATETIME COMMENT '支付时间',
    create_date DATE NOT NULL COMMENT '日期分区'
) ENGINE = OLAP
DUPLICATE KEY(order_id, order_time)
PARTITION BY RANGE(create_date) (
    PARTITION p202506 VALUES LESS THAN ("2025-07-01")
)
DISTRIBUTED BY HASH(order_id) BUCKETS 16
PROPERTIES (
    "replication_num" = "1"
);

-- 创建产品信息表
CREATE TABLE IF NOT EXISTS products (
    product_id BIGINT NOT NULL COMMENT '产品ID',
    product_name VARCHAR(255) COMMENT '产品名称',
    category VARCHAR(100) COMMENT '产品类别',
    price DECIMAL(10,2) COMMENT '产品价格',
    status VARCHAR(20) COMMENT '产品状态'
) ENGINE = OLAP
DUPLICATE KEY(product_id)
DISTRIBUTED BY HASH(product_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1"
);

-- 创建用户信息表
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT NOT NULL COMMENT '用户ID',
    username VARCHAR(100) COMMENT '用户名',
    email VARCHAR(255) COMMENT '邮箱',
    register_time DATETIME COMMENT '注册时间',
    last_login_time DATETIME COMMENT '最后登录时间',
    user_status VARCHAR(20) COMMENT '用户状态'
) ENGINE = OLAP
DUPLICATE KEY(user_id)
DISTRIBUTED BY HASH(user_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1"
);

-- 插入测试数据
-- 插入用户数据
INSERT INTO users VALUES
(1001, 'user1', 'user1@example.com', '2025-01-01 10:00:00', '2025-06-24 15:00:00', 'active'),
(1002, 'user2', 'user2@example.com', '2025-01-02 11:00:00', '2025-06-24 14:00:00', 'active'),
(1003, 'user3', 'user3@example.com', '2025-01-03 12:00:00', '2025-06-23 10:00:00', 'active'),
(1004, 'user4', 'user4@example.com', '2025-01-04 13:00:00', '2025-06-22 09:00:00', 'inactive'),
(1005, 'user5', 'user5@example.com', '2025-01-05 14:00:00', '2025-06-24 16:00:00', 'active');

-- 插入产品数据
INSERT INTO products VALUES
(2001, '产品A', '电子产品', 1999.00, 'active'),
(2002, '产品B', '电子产品', 2999.00, 'active'),
(2003, '产品C', '服装', 299.00, 'active'),
(2004, '产品D', '食品', 99.00, 'active'),
(2005, '产品E', '图书', 59.00, 'active');

-- 插入用户活动数据（最近7天）
INSERT INTO user_activity_log VALUES
-- 2025-06-24的数据
(1001, 'login', '2025-06-24 09:00:00', 'web', 'China', '2025-06-24'),
(1001, 'view', '2025-06-24 09:15:00', 'web', 'China', '2025-06-24'),
(1002, 'login', '2025-06-24 10:00:00', 'mobile', 'USA', '2025-06-24'),
(1003, 'login', '2025-06-24 11:00:00', 'web', 'Japan', '2025-06-24'),
(1005, 'login', '2025-06-24 14:00:00', 'mobile', 'UK', '2025-06-24'),
-- 2025-06-23的数据
(1001, 'login', '2025-06-23 09:00:00', 'web', 'China', '2025-06-23'),
(1002, 'login', '2025-06-23 10:00:00', 'mobile', 'USA', '2025-06-23'),
(1003, 'login', '2025-06-23 11:00:00', 'web', 'Japan', '2025-06-23'),
(1004, 'login', '2025-06-23 12:00:00', 'web', 'Germany', '2025-06-23'),
-- 2025-06-22的数据
(1001, 'login', '2025-06-22 09:00:00', 'web', 'China', '2025-06-22'),
(1002, 'login', '2025-06-22 10:00:00', 'mobile', 'USA', '2025-06-22'),
(1005, 'login', '2025-06-22 15:00:00', 'mobile', 'UK', '2025-06-22');

-- 插入订单数据
INSERT INTO orders VALUES
(3001, 1001, 2001, 1999.00, 'completed', '2025-06-24 10:00:00', '2025-06-24 10:05:00', '2025-06-24'),
(3002, 1002, 2002, 2999.00, 'completed', '2025-06-24 11:00:00', '2025-06-24 11:10:00', '2025-06-24'),
(3003, 1003, 2003, 299.00, 'pending', '2025-06-24 12:00:00', NULL, '2025-06-24'),
(3004, 1001, 2004, 99.00, 'completed', '2025-06-23 14:00:00', '2025-06-23 14:05:00', '2025-06-23'),
(3005, 1005, 2005, 59.00, 'completed', '2025-06-23 15:00:00', '2025-06-23 15:10:00', '2025-06-23');

-- 创建一些示例视图（作为指标的数据源）
CREATE VIEW IF NOT EXISTS daily_active_users AS
SELECT 
    create_date as stat_date,
    COUNT(DISTINCT user_id) as dau,
    COUNT(*) as total_actions
FROM user_activity_log
WHERE action_type IN ('login', 'active')
GROUP BY create_date;

CREATE VIEW IF NOT EXISTS daily_order_stats AS
SELECT 
    create_date as stat_date,
    COUNT(DISTINCT order_id) as order_count,
    COUNT(DISTINCT user_id) as order_user_count,
    SUM(order_amount) as total_amount,
    AVG(order_amount) as avg_amount
FROM orders
WHERE order_status = 'completed'
GROUP BY create_date;