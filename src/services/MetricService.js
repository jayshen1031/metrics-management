const database = require('../../config/database');

class MetricService {
  
  // 获取所有指标
  async getAllMetrics() {
    const sql = `
      SELECT 
        id,
        name,
        description,
        category,
        unit,
        calculation_formula,
        data_source,
        update_frequency,
        is_active,
        created_at,
        updated_at
      FROM metrics 
      ORDER BY category, name
    `;
    return await database.query(sql);
  }

  // 根据ID获取指标
  async getMetricById(id) {
    const sql = `
      SELECT 
        id,
        name,
        description,
        category,
        unit,
        calculation_formula,
        data_source,
        update_frequency,
        is_active,
        created_at,
        updated_at
      FROM metrics 
      WHERE id = ?
    `;
    const result = await database.query(sql, [id]);
    return result[0];
  }

  // 创建新指标
  async createMetric(metricData) {
    const {
      name,
      description,
      category,
      unit,
      calculation_formula,
      data_source,
      update_frequency
    } = metricData;

    const sql = `
      INSERT INTO metrics (
        name, description, category, unit, 
        calculation_formula, data_source, update_frequency
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await database.query(sql, [
      name, description, category, unit,
      calculation_formula, data_source, update_frequency
    ]);
    
    return this.getMetricById(result.insertId);
  }

  // 更新指标
  async updateMetric(id, metricData) {
    const {
      name,
      description,
      category,
      unit,
      calculation_formula,
      data_source,
      update_frequency,
      is_active
    } = metricData;

    const sql = `
      UPDATE metrics SET
        name = ?,
        description = ?,
        category = ?,
        unit = ?,
        calculation_formula = ?,
        data_source = ?,
        update_frequency = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await database.query(sql, [
      name, description, category, unit,
      calculation_formula, data_source, update_frequency,
      is_active, id
    ]);
    
    return this.getMetricById(id);
  }

  // 删除指标
  async deleteMetric(id) {
    const sql = 'DELETE FROM metrics WHERE id = ?';
    const result = await database.query(sql, [id]);
    return result.affectedRows > 0;
  }

  // 获取指标值历史
  async getMetricValues(metricId, startDate, endDate) {
    const sql = `
      SELECT 
        id,
        metric_id,
        value,
        calculation_date,
        data_quality_score,
        created_at
      FROM metric_values 
      WHERE metric_id = ? 
        AND calculation_date BETWEEN ? AND ?
      ORDER BY calculation_date DESC
    `;
    return await database.query(sql, [metricId, startDate, endDate]);
  }

  // 添加指标值
  async addMetricValue(metricId, value, calculationDate, dataQualityScore = 100) {
    const sql = `
      INSERT INTO metric_values (
        metric_id, value, calculation_date, data_quality_score
      ) VALUES (?, ?, ?, ?)
    `;
    
    return await database.query(sql, [
      metricId, value, calculationDate, dataQualityScore
    ]);
  }

  // 获取指标分类统计
  async getMetricsByCategory() {
    const sql = `
      SELECT 
        category,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
      FROM metrics 
      GROUP BY category
      ORDER BY category
    `;
    return await database.query(sql);
  }

  // 计算指标趋势
  async getMetricTrend(metricId, days = 30) {
    const sql = `
      SELECT 
        DATE(calculation_date) as date,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        COUNT(*) as count
      FROM metric_values 
      WHERE metric_id = ? 
        AND calculation_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(calculation_date)
      ORDER BY date
    `;
    return await database.query(sql, [metricId, days]);
  }
}

module.exports = new MetricService();