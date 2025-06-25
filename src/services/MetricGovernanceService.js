const database = require('../../config/database');

/**
 * 指标治理服务
 * 提供指标元数据管理、血缘分析、质量监控等功能
 */
class MetricGovernanceService {
  /**
   * 创建或更新指标元数据
   */
  async upsertMetricMetadata(metricData) {
    try {
      const {
        metric_code,
        metric_name,
        metric_type,
        category_id,
        business_definition,
        technical_definition,
        calculation_formula,
        source_table,
        source_database,
        source_fields,
        sensitivity_level,
        status,
        importance_level,
        business_owner,
        technical_owner,
        ...otherFields
      } = metricData;

      // 检查指标是否存在
      const existing = await database.query(
        'SELECT id FROM metric_metadata WHERE metric_code = ?',
        [metric_code]
      );

      if (existing.length > 0) {
        // 更新现有指标
        const updateSql = `
          UPDATE metric_metadata 
          SET metric_name = ?, metric_type = ?, category_id = ?,
              business_definition = ?, technical_definition = ?, 
              calculation_formula = ?, source_table = ?, source_database = ?,
              source_fields = ?, sensitivity_level = ?, status = ?,
              importance_level = ?, business_owner = ?, technical_owner = ?,
              updated_at = NOW(), updated_by = ?
          WHERE metric_code = ?
        `;
        
        await database.query(updateSql, [
          metric_name, metric_type, category_id,
          business_definition, technical_definition,
          calculation_formula, source_table, source_database,
          JSON.stringify(source_fields), sensitivity_level, status,
          importance_level, business_owner, technical_owner,
          metricData.updated_by || 'system',
          metric_code
        ]);
        
        return { success: true, action: 'updated', metric_id: existing[0].id };
      } else {
        // 创建新指标
        const insertSql = `
          INSERT INTO metric_metadata (
            metric_code, metric_name, metric_type, category_id,
            business_definition, technical_definition, calculation_formula,
            source_table, source_database, source_fields,
            sensitivity_level, status, importance_level,
            business_owner, technical_owner, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await database.query(insertSql, [
          metric_code, metric_name, metric_type, category_id,
          business_definition, technical_definition, calculation_formula,
          source_table, source_database, JSON.stringify(source_fields),
          sensitivity_level, status, importance_level,
          business_owner, technical_owner,
          metricData.created_by || 'system'
        ]);
        
        return { success: true, action: 'created', metric_id: result.insertId };
      }
    } catch (error) {
      console.error('创建/更新指标元数据失败:', error);
      throw error;
    }
  }

  /**
   * 保存指标快照
   */
  async saveMetricSnapshot(snapshotData) {
    try {
      const {
        metric_code,
        snapshot_date,
        metric_value,
        metric_value_str,
        dimension_values,
        value_yoy,
        value_mom,
        rate_yoy,
        rate_mom,
        data_quality_score = 100,
        calculation_time = new Date()
      } = snapshotData;

      // 获取指标ID
      const metricResult = await database.query(
        'SELECT id FROM metric_metadata WHERE metric_code = ?',
        [metric_code]
      );

      if (metricResult.length === 0) {
        throw new Error(`指标 ${metric_code} 不存在`);
      }

      const metric_id = metricResult[0].id;

      // 插入快照数据
      const sql = `
        INSERT INTO metric_snapshots (
          metric_id, metric_code, snapshot_date,
          metric_value, metric_value_str, dimension_values,
          value_yoy, value_mom, rate_yoy, rate_mom,
          data_quality_score, calculation_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          metric_value = VALUES(metric_value),
          metric_value_str = VALUES(metric_value_str),
          value_yoy = VALUES(value_yoy),
          value_mom = VALUES(value_mom),
          rate_yoy = VALUES(rate_yoy),
          rate_mom = VALUES(rate_mom),
          data_quality_score = VALUES(data_quality_score),
          calculation_time = VALUES(calculation_time),
          updated_at = NOW()
      `;

      await database.query(sql, [
        metric_id, metric_code, snapshot_date,
        metric_value, metric_value_str, JSON.stringify(dimension_values || {}),
        value_yoy, value_mom, rate_yoy, rate_mom,
        data_quality_score, calculation_time
      ]);

      return { success: true, metric_code, snapshot_date };
    } catch (error) {
      console.error('保存指标快照失败:', error);
      throw error;
    }
  }

  /**
   * 批量保存指标快照
   */
  async batchSaveSnapshots(snapshots) {
    const results = [];
    
    for (const snapshot of snapshots) {
      try {
        const result = await this.saveMetricSnapshot(snapshot);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          metric_code: snapshot.metric_code,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 查询指标历史趋势
   */
  async getMetricTrend(metric_code, startDate, endDate, dimensions = {}) {
    try {
      let sql = `
        SELECT 
          snapshot_date,
          metric_value,
          metric_value_str,
          dimension_values,
          value_yoy,
          value_mom,
          rate_yoy,
          rate_mom,
          data_quality_score
        FROM metric_snapshots
        WHERE metric_code = ?
          AND snapshot_date BETWEEN ? AND ?
      `;
      
      const params = [metric_code, startDate, endDate];
      
      // 如果指定了维度筛选
      if (Object.keys(dimensions).length > 0) {
        Object.entries(dimensions).forEach(([key, value]) => {
          sql += ` AND JSON_EXTRACT(dimension_values, '$.${key}') = ?`;
          params.push(value);
        });
      }
      
      sql += ' ORDER BY snapshot_date';
      
      const results = await database.query(sql, params);
      
      // 解析JSON字段
      return results.map(row => ({
        ...row,
        dimension_values: JSON.parse(row.dimension_values || '{}')
      }));
    } catch (error) {
      console.error('查询指标趋势失败:', error);
      throw error;
    }
  }

  /**
   * 添加指标血缘关系
   */
  async addMetricLineage(lineageData) {
    try {
      const {
        upstream_type,
        upstream_id,
        upstream_name,
        downstream_type,
        downstream_id,
        downstream_name,
        relation_type = 'direct',
        dependency_formula,
        field_mappings,
        impact_score = 50,
        source_system
      } = lineageData;

      const sql = `
        INSERT INTO metric_lineage (
          upstream_type, upstream_id, upstream_name,
          downstream_type, downstream_id, downstream_name,
          relation_type, dependency_formula, field_mappings,
          impact_score, source_system, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ON DUPLICATE KEY UPDATE
          upstream_name = VALUES(upstream_name),
          downstream_name = VALUES(downstream_name),
          dependency_formula = VALUES(dependency_formula),
          field_mappings = VALUES(field_mappings),
          impact_score = VALUES(impact_score),
          updated_at = NOW()
      `;

      await database.query(sql, [
        upstream_type, upstream_id, upstream_name,
        downstream_type, downstream_id, downstream_name,
        relation_type, dependency_formula,
        JSON.stringify(field_mappings || []),
        impact_score, source_system
      ]);

      return { success: true };
    } catch (error) {
      console.error('添加指标血缘关系失败:', error);
      throw error;
    }
  }

  /**
   * 获取指标的完整血缘图
   */
  async getMetricLineageGraph(metric_code, direction = 'both', depth = 3) {
    try {
      const nodes = new Map();
      const edges = [];
      const visited = new Set();

      // 添加中心节点（指标）
      const metricInfo = await this.getMetricInfo(metric_code);
      if (!metricInfo) {
        throw new Error(`指标 ${metric_code} 不存在`);
      }

      nodes.set(metric_code, {
        id: metric_code,
        name: metricInfo.metric_name,
        type: 'Metric',
        importance: metricInfo.importance_level,
        sensitivity: metricInfo.sensitivity_level,
        formula: metricInfo.calculation_formula
      });

      // 递归查询血缘
      await this.traverseLineage(
        metric_code, 'metric', direction, depth, 0, 
        visited, nodes, edges
      );

      return {
        nodes: Array.from(nodes.values()),
        edges: edges
      };
    } catch (error) {
      console.error('获取指标血缘图失败:', error);
      throw error;
    }
  }

  /**
   * 递归遍历血缘关系
   */
  async traverseLineage(nodeId, nodeType, direction, maxDepth, currentDepth, visited, nodes, edges) {
    if (currentDepth >= maxDepth || visited.has(`${nodeType}:${nodeId}`)) {
      return;
    }

    visited.add(`${nodeType}:${nodeId}`);

    // 查询上游
    if (direction === 'upstream' || direction === 'both') {
      const upstreamSql = `
        SELECT * FROM metric_lineage
        WHERE downstream_type = ? AND downstream_id = ?
          AND status = 'active'
      `;
      
      const upstreams = await database.query(upstreamSql, [nodeType, nodeId]);
      
      for (const upstream of upstreams) {
        // 添加上游节点
        if (!nodes.has(upstream.upstream_id)) {
          const nodeInfo = await this.getNodeInfo(
            upstream.upstream_type,
            upstream.upstream_id
          );
          
          nodes.set(upstream.upstream_id, {
            id: upstream.upstream_id,
            name: upstream.upstream_name,
            type: upstream.upstream_type,
            ...nodeInfo
          });
        }
        
        // 添加边
        edges.push({
          source: upstream.upstream_id,
          target: nodeId,
          type: upstream.relation_type,
          impact: upstream.impact_score
        });
        
        // 递归
        await this.traverseLineage(
          upstream.upstream_id,
          upstream.upstream_type,
          'upstream',
          maxDepth,
          currentDepth + 1,
          visited,
          nodes,
          edges
        );
      }
    }

    // 查询下游
    if (direction === 'downstream' || direction === 'both') {
      const downstreamSql = `
        SELECT * FROM metric_lineage
        WHERE upstream_type = ? AND upstream_id = ?
          AND status = 'active'
      `;
      
      const downstreams = await database.query(downstreamSql, [nodeType, nodeId]);
      
      for (const downstream of downstreams) {
        // 添加下游节点
        if (!nodes.has(downstream.downstream_id)) {
          const nodeInfo = await this.getNodeInfo(
            downstream.downstream_type,
            downstream.downstream_id
          );
          
          nodes.set(downstream.downstream_id, {
            id: downstream.downstream_id,
            name: downstream.downstream_name,
            type: downstream.downstream_type,
            ...nodeInfo
          });
        }
        
        // 添加边
        edges.push({
          source: nodeId,
          target: downstream.downstream_id,
          type: downstream.relation_type,
          impact: downstream.impact_score
        });
        
        // 递归
        await this.traverseLineage(
          downstream.downstream_id,
          downstream.downstream_type,
          'downstream',
          maxDepth,
          currentDepth + 1,
          visited,
          nodes,
          edges
        );
      }
    }
  }

  /**
   * 获取节点详细信息
   */
  async getNodeInfo(nodeType, nodeId) {
    try {
      if (nodeType === 'metric') {
        return await this.getMetricInfo(nodeId);
      } else if (nodeType === 'table') {
        return await this.getTableInfo(nodeId);
      } else if (nodeType === 'field') {
        return await this.getFieldInfo(nodeId);
      } else if (nodeType === 'report') {
        return { type: 'Report', id: nodeId };
      } else if (nodeType === 'dashboard') {
        return { type: 'Dashboard', id: nodeId };
      } else if (nodeType === 'api') {
        return { type: 'API', id: nodeId };
      }
      
      return {};
    } catch (error) {
      console.error(`获取节点信息失败 ${nodeType}:${nodeId}:`, error);
      return {};
    }
  }

  /**
   * 获取指标信息
   */
  async getMetricInfo(metric_code) {
    const result = await database.query(
      'SELECT * FROM metric_metadata WHERE metric_code = ?',
      [metric_code]
    );
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * 获取表信息
   */
  async getTableInfo(tableId) {
    // 尝试从doris_tables获取
    const [database_name, table_name] = tableId.split('.');
    
    const result = await database.query(
      'SELECT * FROM doris_tables WHERE database_name = ? AND table_name = ?',
      [database_name, table_name]
    );
    
    if (result.length > 0) {
      return {
        database: database_name,
        table: table_name,
        rows: result[0].row_count,
        size: result[0].data_length
      };
    }
    
    return { database: database_name, table: table_name };
  }

  /**
   * 获取字段信息
   */
  async getFieldInfo(fieldId) {
    const parts = fieldId.split('.');
    const field_name = parts.pop();
    const table_name = parts.pop();
    const database_name = parts.join('.');
    
    const result = await database.query(
      `SELECT * FROM doris_columns 
       WHERE database_name = ? AND table_name = ? AND column_name = ?`,
      [database_name, table_name, field_name]
    );
    
    if (result.length > 0) {
      return {
        dataType: result[0].data_type,
        nullable: result[0].is_nullable,
        comment: result[0].column_comment
      };
    }
    
    return { field: field_name };
  }

  /**
   * 指标影响分析
   */
  async analyzeMetricImpact(metric_code, changeType = 'value') {
    try {
      const impact = {
        metric_code,
        changeType,
        directImpact: [],
        indirectImpact: [],
        affectedReports: [],
        affectedDashboards: [],
        affectedAPIs: [],
        totalImpactScore: 0
      };

      // 获取直接下游
      const directDownstream = await database.query(`
        SELECT * FROM metric_lineage
        WHERE upstream_type = 'metric' AND upstream_id = ?
          AND status = 'active'
      `, [metric_code]);

      impact.directImpact = directDownstream;

      // 获取受影响的报表、看板、API
      for (const downstream of directDownstream) {
        if (downstream.downstream_type === 'report') {
          impact.affectedReports.push(downstream);
        } else if (downstream.downstream_type === 'dashboard') {
          impact.affectedDashboards.push(downstream);
        } else if (downstream.downstream_type === 'api') {
          impact.affectedAPIs.push(downstream);
        } else if (downstream.downstream_type === 'metric') {
          // 递归查找间接影响
          const indirectResult = await this.analyzeMetricImpact(
            downstream.downstream_id,
            changeType
          );
          impact.indirectImpact.push(...indirectResult.directImpact);
        }
        
        impact.totalImpactScore += downstream.impact_score || 0;
      }

      return impact;
    } catch (error) {
      console.error('指标影响分析失败:', error);
      throw error;
    }
  }

  /**
   * 记录指标使用情况
   */
  async logMetricUsage(usageData) {
    try {
      const {
        metric_code,
        caller_type,
        caller_id,
        caller_name,
        caller_system,
        user_id,
        user_name,
        department,
        query_params,
        query_dimensions,
        date_range_start,
        date_range_end,
        response_time_ms,
        data_rows
      } = usageData;

      const sql = `
        INSERT INTO metric_usage_logs (
          metric_code, caller_type, caller_id, caller_name,
          caller_system, user_id, user_name, department,
          query_params, query_dimensions,
          date_range_start, date_range_end,
          response_time_ms, data_rows
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await database.query(sql, [
        metric_code, caller_type, caller_id, caller_name,
        caller_system, user_id, user_name, department,
        JSON.stringify(query_params || {}),
        JSON.stringify(query_dimensions || {}),
        date_range_start, date_range_end,
        response_time_ms, data_rows
      ]);

      return { success: true };
    } catch (error) {
      console.error('记录指标使用情况失败:', error);
      throw error;
    }
  }

  /**
   * 获取指标使用统计
   */
  async getMetricUsageStats(metric_code, startDate, endDate) {
    try {
      const sql = `
        SELECT 
          DATE(usage_time) as usage_date,
          COUNT(*) as usage_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT caller_id) as unique_callers,
          AVG(response_time_ms) as avg_response_time,
          SUM(data_rows) as total_data_rows
        FROM metric_usage_logs
        WHERE metric_code = ?
          AND usage_time BETWEEN ? AND ?
        GROUP BY DATE(usage_time)
        ORDER BY usage_date
      `;

      const dailyStats = await database.query(sql, [metric_code, startDate, endDate]);

      // 获取按调用方类型统计
      const callerTypeSql = `
        SELECT 
          caller_type,
          COUNT(*) as usage_count,
          COUNT(DISTINCT caller_id) as unique_callers
        FROM metric_usage_logs
        WHERE metric_code = ?
          AND usage_time BETWEEN ? AND ?
        GROUP BY caller_type
      `;

      const callerTypeStats = await database.query(callerTypeSql, [metric_code, startDate, endDate]);

      return {
        metric_code,
        period: { start: startDate, end: endDate },
        dailyStats,
        callerTypeStats,
        summary: {
          totalUsage: dailyStats.reduce((sum, d) => sum + d.usage_count, 0),
          uniqueUsers: new Set(dailyStats.map(d => d.unique_users)).size,
          avgResponseTime: dailyStats.reduce((sum, d) => sum + d.avg_response_time, 0) / dailyStats.length
        }
      };
    } catch (error) {
      console.error('获取指标使用统计失败:', error);
      throw error;
    }
  }

  /**
   * 指标质量检查
   */
  async checkMetricQuality(metric_code, check_date = new Date()) {
    try {
      const quality = {
        metric_code,
        check_date,
        completeness_score: 100,
        accuracy_score: 100,
        timeliness_score: 100,
        consistency_score: 100,
        overall_score: 100,
        issues: [],
        warnings: []
      };

      // 1. 完整性检查
      const snapshot = await database.query(`
        SELECT * FROM metric_snapshots
        WHERE metric_code = ? AND snapshot_date = ?
      `, [metric_code, check_date]);

      if (snapshot.length === 0) {
        quality.completeness_score = 0;
        quality.issues.push('当日数据缺失');
      } else {
        // 检查空值
        if (snapshot[0].metric_value === null && snapshot[0].metric_value_str === null) {
          quality.completeness_score = 50;
          quality.warnings.push('指标值为空');
        }
      }

      // 2. 及时性检查
      const metadata = await this.getMetricInfo(metric_code);
      if (metadata && metadata.update_frequency === 'daily') {
        const expectedTime = new Date(check_date);
        expectedTime.setHours(metadata.sla_hours || 8, 0, 0, 0);
        
        if (snapshot[0] && snapshot[0].calculation_time > expectedTime) {
          quality.timeliness_score = 80;
          quality.warnings.push('数据更新延迟');
        }
      }

      // 3. 准确性检查（通过异常检测）
      if (snapshot[0] && snapshot[0].is_abnormal) {
        quality.accuracy_score = 70;
        quality.warnings.push(snapshot[0].abnormal_reason || '数据异常');
      }

      // 4. 一致性检查（与历史数据对比）
      const historicalData = await database.query(`
        SELECT AVG(metric_value) as avg_value, 
               STDDEV(metric_value) as std_value
        FROM metric_snapshots
        WHERE metric_code = ?
          AND snapshot_date BETWEEN DATE_SUB(?, INTERVAL 30 DAY) AND DATE_SUB(?, INTERVAL 1 DAY)
      `, [metric_code, check_date, check_date]);

      if (historicalData[0] && snapshot[0]) {
        const avg = historicalData[0].avg_value;
        const std = historicalData[0].std_value;
        const current = snapshot[0].metric_value;
        
        // 如果偏离超过3个标准差，认为不一致
        if (Math.abs(current - avg) > 3 * std) {
          quality.consistency_score = 60;
          quality.warnings.push('数据偏离历史范围');
        }
      }

      // 计算综合得分
      quality.overall_score = Math.round(
        (quality.completeness_score * 0.3 +
         quality.accuracy_score * 0.3 +
         quality.timeliness_score * 0.2 +
         quality.consistency_score * 0.2)
      );

      // 保存质量检查结果
      await this.saveQualityCheckResult(quality);

      return quality;
    } catch (error) {
      console.error('指标质量检查失败:', error);
      throw error;
    }
  }

  /**
   * 保存质量检查结果
   */
  async saveQualityCheckResult(quality) {
    const sql = `
      INSERT INTO metric_quality_monitoring (
        metric_code, check_date,
        completeness_score, accuracy_score, timeliness_score,
        consistency_score, overall_score,
        failed_rules, warning_messages
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        completeness_score = VALUES(completeness_score),
        accuracy_score = VALUES(accuracy_score),
        timeliness_score = VALUES(timeliness_score),
        consistency_score = VALUES(consistency_score),
        overall_score = VALUES(overall_score),
        failed_rules = VALUES(failed_rules),
        warning_messages = VALUES(warning_messages),
        created_at = NOW()
    `;

    await database.query(sql, [
      quality.metric_code,
      quality.check_date,
      quality.completeness_score,
      quality.accuracy_score,
      quality.timeliness_score,
      quality.consistency_score,
      quality.overall_score,
      JSON.stringify(quality.issues),
      JSON.stringify(quality.warnings)
    ]);
  }

  /**
   * 获取指标分类树
   */
  async getMetricCategoryTree() {
    try {
      const categories = await database.query(`
        SELECT * FROM metric_categories
        WHERE status = 'active'
        ORDER BY parent_id, sort_order
      `);

      // 构建树形结构
      const tree = [];
      const map = new Map();

      // 第一遍：创建所有节点
      categories.forEach(cat => {
        map.set(cat.id, {
          ...cat,
          children: []
        });
      });

      // 第二遍：建立父子关系
      categories.forEach(cat => {
        if (cat.parent_id) {
          const parent = map.get(cat.parent_id);
          if (parent) {
            parent.children.push(map.get(cat.id));
          }
        } else {
          tree.push(map.get(cat.id));
        }
      });

      return tree;
    } catch (error) {
      console.error('获取指标分类树失败:', error);
      throw error;
    }
  }

  /**
   * 搜索指标
   */
  async searchMetrics(keyword, filters = {}) {
    try {
      let sql = `
        SELECT m.*, c.category_name, c.category_path
        FROM metric_metadata m
        LEFT JOIN metric_categories c ON m.category_id = c.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // 关键词搜索
      if (keyword) {
        sql += ` AND (
          m.metric_code LIKE ? OR
          m.metric_name LIKE ? OR
          m.metric_alias LIKE ? OR
          m.business_definition LIKE ? OR
          m.technical_definition LIKE ?
        )`;
        const searchPattern = `%${keyword}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      // 筛选条件
      if (filters.metric_type) {
        sql += ' AND m.metric_type = ?';
        params.push(filters.metric_type);
      }
      
      if (filters.category_id) {
        sql += ' AND m.category_id = ?';
        params.push(filters.category_id);
      }
      
      if (filters.sensitivity_level) {
        sql += ' AND m.sensitivity_level = ?';
        params.push(filters.sensitivity_level);
      }
      
      if (filters.status) {
        sql += ' AND m.status = ?';
        params.push(filters.status);
      }
      
      if (filters.importance_level) {
        sql += ' AND m.importance_level = ?';
        params.push(filters.importance_level);
      }
      
      if (filters.owner) {
        sql += ' AND (m.business_owner = ? OR m.technical_owner = ?)';
        params.push(filters.owner, filters.owner);
      }
      
      sql += ' ORDER BY m.importance_level, m.metric_code';
      
      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }
      
      const results = await database.query(sql, params);
      
      // 解析JSON字段
      return results.map(row => ({
        ...row,
        source_fields: JSON.parse(row.source_fields || '[]')
      }));
    } catch (error) {
      console.error('搜索指标失败:', error);
      throw error;
    }
  }
}

module.exports = new MetricGovernanceService();