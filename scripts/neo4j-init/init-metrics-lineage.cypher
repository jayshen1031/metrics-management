// 清空已有数据（可选）
MATCH (n) DETACH DELETE n;

// 创建索引以提高查询性能
CREATE INDEX metric_name IF NOT EXISTS FOR (m:Metric) ON (m.name);
CREATE INDEX table_name IF NOT EXISTS FOR (t:Table) ON (t.name);
CREATE INDEX field_name IF NOT EXISTS FOR (f:Field) ON (f.name);
CREATE INDEX report_name IF NOT EXISTS FOR (r:Report) ON (r.name);
CREATE INDEX dashboard_name IF NOT EXISTS FOR (d:Dashboard) ON (d.name);
CREATE INDEX api_name IF NOT EXISTS FOR (a:API) ON (a.name);

// ========================================
// 创建指标节点
// ========================================
CREATE (dau:Metric {
    name: 'DAU',
    display_name: '日活跃用户数',
    description: '每日访问平台的独立用户数量',
    category: 'user',
    calculation_formula: 'COUNT(DISTINCT user_id)',
    unit: '人',
    update_frequency: 'daily',
    data_quality_score: 95,
    created_at: datetime('2024-01-01T00:00:00'),
    updated_at: datetime()
})

CREATE (revenue:Metric {
    name: 'Revenue',
    display_name: '总收入',
    description: '平台的总收入金额',
    category: 'business',
    calculation_formula: 'SUM(order_amount)',
    unit: '元',
    update_frequency: 'daily',
    data_quality_score: 98,
    created_at: datetime('2024-01-01T00:00:00'),
    updated_at: datetime()
})

CREATE (conversion_rate:Metric {
    name: 'ConversionRate',
    display_name: '转化率',
    description: '用户转化为付费用户的比率',
    category: 'business',
    calculation_formula: 'COUNT(paid_users) / COUNT(total_users) * 100',
    unit: '%',
    update_frequency: 'daily',
    data_quality_score: 92,
    created_at: datetime('2024-01-01T00:00:00'),
    updated_at: datetime()
})

CREATE (retention_rate:Metric {
    name: 'RetentionRate',
    display_name: '留存率',
    description: '用户次日留存率',
    category: 'user',
    calculation_formula: 'COUNT(retained_users) / COUNT(yesterday_users) * 100',
    unit: '%',
    update_frequency: 'daily',
    data_quality_score: 90,
    created_at: datetime('2024-01-01T00:00:00'),
    updated_at: datetime()
})

CREATE (arpu:Metric {
    name: 'ARPU',
    display_name: '用户平均收入',
    description: '每用户平均收入',
    category: 'business',
    calculation_formula: 'SUM(revenue) / COUNT(DISTINCT user_id)',
    unit: '元/人',
    update_frequency: 'daily',
    data_quality_score: 88,
    created_at: datetime('2024-01-01T00:00:00'),
    updated_at: datetime()
});

// ========================================
// 创建数据表节点
// ========================================
CREATE (user_activity:Table {
    name: 'user_activity',
    display_name: '用户活动表',
    description: '记录用户的所有活动行为',
    database: 'metrics_db',
    schema: 'ods',
    table_type: 'fact',
    row_count: 10000000,
    size_mb: 2048,
    created_at: datetime('2023-06-01T00:00:00'),
    updated_at: datetime()
})

CREATE (user_info:Table {
    name: 'user_info',
    display_name: '用户信息表',
    description: '用户基础信息维度表',
    database: 'metrics_db',
    schema: 'dim',
    table_type: 'dimension',
    row_count: 500000,
    size_mb: 512,
    created_at: datetime('2023-01-01T00:00:00'),
    updated_at: datetime()
})

CREATE (orders:Table {
    name: 'orders',
    display_name: '订单表',
    description: '所有订单交易记录',
    database: 'metrics_db',
    schema: 'ods',
    table_type: 'fact',
    row_count: 5000000,
    size_mb: 1024,
    created_at: datetime('2023-01-01T00:00:00'),
    updated_at: datetime()
})

CREATE (products:Table {
    name: 'products',
    display_name: '产品表',
    description: '产品信息维度表',
    database: 'metrics_db',
    schema: 'dim',
    table_type: 'dimension',
    row_count: 10000,
    size_mb: 64,
    created_at: datetime('2023-01-01T00:00:00'),
    updated_at: datetime()
})

CREATE (daily_summary:Table {
    name: 'daily_summary',
    display_name: '每日汇总表',
    description: '按日期汇总的指标数据',
    database: 'metrics_db',
    schema: 'dws',
    table_type: 'aggregate',
    row_count: 1000,
    size_mb: 128,
    created_at: datetime('2023-06-01T00:00:00'),
    updated_at: datetime()
});

// ========================================
// 创建字段节点
// ========================================
CREATE (user_id:Field {
    name: 'user_id',
    display_name: '用户ID',
    description: '用户唯一标识符',
    data_type: 'BIGINT',
    is_nullable: false,
    is_primary_key: true
})

CREATE (activity_date:Field {
    name: 'activity_date',
    display_name: '活动日期',
    description: '用户活动发生的日期',
    data_type: 'DATE',
    is_nullable: false,
    is_partition_key: true
})

CREATE (order_id:Field {
    name: 'order_id',
    display_name: '订单ID',
    description: '订单唯一标识符',
    data_type: 'VARCHAR(64)',
    is_nullable: false,
    is_primary_key: true
})

CREATE (order_amount:Field {
    name: 'order_amount',
    display_name: '订单金额',
    description: '订单交易金额',
    data_type: 'DECIMAL(10,2)',
    is_nullable: false
})

CREATE (product_id:Field {
    name: 'product_id',
    display_name: '产品ID',
    description: '产品唯一标识符',
    data_type: 'INT',
    is_nullable: false
})

CREATE (user_status:Field {
    name: 'user_status',
    display_name: '用户状态',
    description: '用户当前状态',
    data_type: 'VARCHAR(20)',
    is_nullable: true
});

// ========================================
// 创建报表节点
// ========================================
CREATE (daily_report:Report {
    name: 'DailyBusinessReport',
    display_name: '每日业务报表',
    description: '展示每日核心业务指标',
    report_type: 'operational',
    refresh_frequency: 'daily',
    owner: 'business_team',
    created_at: datetime('2024-01-15T00:00:00')
})

CREATE (user_analysis:Report {
    name: 'UserAnalysisReport',
    display_name: '用户分析报表',
    description: '用户行为和特征分析',
    report_type: 'analytical',
    refresh_frequency: 'weekly',
    owner: 'data_team',
    created_at: datetime('2024-02-01T00:00:00')
})

CREATE (revenue_report:Report {
    name: 'RevenueReport',
    display_name: '收入分析报表',
    description: '收入趋势和构成分析',
    report_type: 'financial',
    refresh_frequency: 'daily',
    owner: 'finance_team',
    created_at: datetime('2024-01-10T00:00:00')
});

// ========================================
// 创建仪表板节点
// ========================================
CREATE (exec_dashboard:Dashboard {
    name: 'ExecutiveDashboard',
    display_name: '高管仪表板',
    description: '为高层管理提供的综合业务视图',
    dashboard_type: 'executive',
    refresh_frequency: 'real-time',
    owner: 'executive_team',
    created_at: datetime('2024-01-01T00:00:00')
})

CREATE (operation_dashboard:Dashboard {
    name: 'OperationDashboard',
    display_name: '运营仪表板',
    description: '日常运营监控和分析',
    dashboard_type: 'operational',
    refresh_frequency: 'hourly',
    owner: 'operation_team',
    created_at: datetime('2024-01-05T00:00:00')
});

// ========================================
// 创建API节点
// ========================================
CREATE (metrics_api:API {
    name: 'MetricsAPI',
    display_name: '指标服务API',
    description: '提供指标数据查询服务',
    endpoint: '/api/v1/metrics',
    method: 'GET',
    version: 'v1',
    created_at: datetime('2024-01-01T00:00:00')
})

CREATE (lineage_api:API {
    name: 'LineageAPI',
    display_name: '血缘分析API',
    description: '提供数据血缘查询服务',
    endpoint: '/api/v1/lineage',
    method: 'GET/POST',
    version: 'v1',
    created_at: datetime('2024-02-01T00:00:00')
});

// ========================================
// 创建关系
// ========================================

// 表与字段的关系
MATCH (ua:Table {name: 'user_activity'}), (uid:Field {name: 'user_id'})
CREATE (ua)-[:HAS_FIELD {ordinal_position: 1}]->(uid);

MATCH (ua:Table {name: 'user_activity'}), (ad:Field {name: 'activity_date'})
CREATE (ua)-[:HAS_FIELD {ordinal_position: 2}]->(ad);

MATCH (o:Table {name: 'orders'}), (oid:Field {name: 'order_id'})
CREATE (o)-[:HAS_FIELD {ordinal_position: 1}]->(oid);

MATCH (o:Table {name: 'orders'}), (oa:Field {name: 'order_amount'})
CREATE (o)-[:HAS_FIELD {ordinal_position: 2}]->(oa);

MATCH (o:Table {name: 'orders'}), (uid:Field {name: 'user_id'})
CREATE (o)-[:HAS_FIELD {ordinal_position: 3}]->(uid);

MATCH (ui:Table {name: 'user_info'}), (uid:Field {name: 'user_id'})
CREATE (ui)-[:HAS_FIELD {ordinal_position: 1}]->(uid);

MATCH (ui:Table {name: 'user_info'}), (us:Field {name: 'user_status'})
CREATE (ui)-[:HAS_FIELD {ordinal_position: 2}]->(us);

// 数据流向关系
MATCH (ua:Table {name: 'user_activity'}), (dau:Metric {name: 'DAU'})
CREATE (ua)-[:FEEDS_INTO {contribution: 'primary'}]->(dau);

MATCH (uid:Field {name: 'user_id'}), (dau:Metric {name: 'DAU'})
CREATE (uid)-[:USED_BY {usage: 'distinct_count'}]->(dau);

MATCH (ad:Field {name: 'activity_date'}), (dau:Metric {name: 'DAU'})
CREATE (ad)-[:USED_BY {usage: 'filter'}]->(dau);

MATCH (o:Table {name: 'orders'}), (rev:Metric {name: 'Revenue'})
CREATE (o)-[:FEEDS_INTO {contribution: 'primary'}]->(rev);

MATCH (oa:Field {name: 'order_amount'}), (rev:Metric {name: 'Revenue'})
CREATE (oa)-[:USED_BY {usage: 'sum'}]->(rev);

MATCH (ui:Table {name: 'user_info'}), (dau:Metric {name: 'DAU'})
CREATE (ui)-[:ENRICHES {type: 'dimension'}]->(dau);

// 指标间的依赖关系
MATCH (dau:Metric {name: 'DAU'}), (arpu:Metric {name: 'ARPU'})
CREATE (dau)-[:DEPENDS_ON {dependency_type: 'denominator'}]->(arpu);

MATCH (rev:Metric {name: 'Revenue'}), (arpu:Metric {name: 'ARPU'})
CREATE (rev)-[:DEPENDS_ON {dependency_type: 'numerator'}]->(arpu);

MATCH (dau:Metric {name: 'DAU'}), (cr:Metric {name: 'ConversionRate'})
CREATE (dau)-[:DEPENDS_ON {dependency_type: 'base'}]->(cr);

// 指标与报表的关系
MATCH (dau:Metric {name: 'DAU'}), (dr:Report {name: 'DailyBusinessReport'})
CREATE (dau)-[:DISPLAYED_IN {position: 'top'}]->(dr);

MATCH (rev:Metric {name: 'Revenue'}), (dr:Report {name: 'DailyBusinessReport'})
CREATE (rev)-[:DISPLAYED_IN {position: 'top'}]->(dr);

MATCH (cr:Metric {name: 'ConversionRate'}), (dr:Report {name: 'DailyBusinessReport'})
CREATE (cr)-[:DISPLAYED_IN {position: 'middle'}]->(dr);

MATCH (dau:Metric {name: 'DAU'}), (uar:Report {name: 'UserAnalysisReport'})
CREATE (dau)-[:DISPLAYED_IN {position: 'main'}]->(uar);

MATCH (rr:Metric {name: 'RetentionRate'}), (uar:Report {name: 'UserAnalysisReport'})
CREATE (rr)-[:DISPLAYED_IN {position: 'secondary'}]->(uar);

// 指标与仪表板的关系
MATCH (dau:Metric {name: 'DAU'}), (ed:Dashboard {name: 'ExecutiveDashboard'})
CREATE (dau)-[:DISPLAYED_IN {widget_type: 'card'}]->(ed);

MATCH (rev:Metric {name: 'Revenue'}), (ed:Dashboard {name: 'ExecutiveDashboard'})
CREATE (rev)-[:DISPLAYED_IN {widget_type: 'chart'}]->(ed);

MATCH (arpu:Metric {name: 'ARPU'}), (ed:Dashboard {name: 'ExecutiveDashboard'})
CREATE (arpu)-[:DISPLAYED_IN {widget_type: 'gauge'}]->(ed);

// 指标与API的关系
MATCH (dau:Metric {name: 'DAU'}), (ma:API {name: 'MetricsAPI'})
CREATE (dau)-[:SERVED_BY {endpoint: '/metrics/dau'}]->(ma);

MATCH (rev:Metric {name: 'Revenue'}), (ma:API {name: 'MetricsAPI'})
CREATE (rev)-[:SERVED_BY {endpoint: '/metrics/revenue'}]->(ma);

MATCH (arpu:Metric {name: 'ARPU'}), (ma:API {name: 'MetricsAPI'})
CREATE (arpu)-[:SERVED_BY {endpoint: '/metrics/arpu'}]->(ma);

// 表之间的关系
MATCH (o:Table {name: 'orders'}), (p:Table {name: 'products'})
CREATE (o)-[:JOINS_WITH {join_key: 'product_id'}]->(p);

MATCH (ua:Table {name: 'user_activity'}), (ui:Table {name: 'user_info'})
CREATE (ua)-[:JOINS_WITH {join_key: 'user_id'}]->(ui);

MATCH (ua:Table {name: 'user_activity'}), (ds:Table {name: 'daily_summary'})
CREATE (ua)-[:AGGREGATED_TO {aggregation_level: 'daily'}]->(ds);

MATCH (o:Table {name: 'orders'}), (ds:Table {name: 'daily_summary'})
CREATE (o)-[:AGGREGATED_TO {aggregation_level: 'daily'}]->(ds);

// 返回节点统计
MATCH (n) 
RETURN labels(n)[0] as NodeType, COUNT(n) as Count 
ORDER BY Count DESC;