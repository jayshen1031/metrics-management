CREATE TABLE IF NOT EXISTS `data_lineage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source_type` varchar(50) NOT NULL COMMENT '源类型',
  `source_id` varchar(255) NOT NULL COMMENT '源ID',
  `source_name` varchar(255) NOT NULL COMMENT '源名称',
  `target_type` varchar(50) NOT NULL COMMENT '目标类型',
  `target_id` varchar(255) NOT NULL COMMENT '目标ID',
  `target_name` varchar(255) NOT NULL COMMENT '目标名称',
  `relation_type` varchar(50) DEFAULT 'table_dependency' COMMENT '关系类型',
  `sql_statement` text COMMENT '相关SQL语句',
  `confidence_score` decimal(3,2) DEFAULT '1.00' COMMENT '置信度分数',
  `metadata` json DEFAULT NULL COMMENT '额外元数据',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_source` (`source_type`,`source_id`),
  KEY `idx_target` (`target_type`,`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据血缘关系表';

CREATE TABLE IF NOT EXISTS `metadata_collection_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `collection_type` varchar(50) NOT NULL COMMENT '采集类型',
  `status` varchar(20) NOT NULL COMMENT '状态',
  `message` text COMMENT '消息内容',
  `collected_count` int DEFAULT '0' COMMENT '采集数量',
  `error_count` int DEFAULT '0' COMMENT '错误数量',
  `execution_time` int DEFAULT '0' COMMENT '执行时间(毫秒)',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type_status` (`collection_type`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='元数据采集日志表';

CREATE TABLE IF NOT EXISTS `asset_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_type` varchar(50) NOT NULL COMMENT '资产类型',
  `asset_id` varchar(255) NOT NULL COMMENT '资产ID',
  `tag_name` varchar(100) NOT NULL COMMENT '标签名称',
  `tag_value` varchar(255) DEFAULT NULL COMMENT '标签值',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建者',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asset_tag` (`asset_type`,`asset_id`,`tag_name`),
  KEY `idx_tag` (`tag_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产标签表';