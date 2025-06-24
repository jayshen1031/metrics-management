const dolphinSchedulerService = require('./DolphinSchedulerService');
const dorisService = require('./DorisService');
const database = require('../../config/database');
const cron = require('node-cron');

class MetadataCollectorService {
  constructor() {
    this.isRunning = false;
    this.collectInterval = process.env.METADATA_COLLECT_INTERVAL || '0 */6 * * *'; // 每6小时执行一次
  }

  // 启动元数据采集调度任务
  startScheduledCollection() {
    if (this.isRunning) {
      console.log('元数据采集任务已在运行');
      return;
    }

    console.log(`启动元数据采集调度，间隔: ${this.collectInterval}`);
    
    // 使用cron表达式调度任务
    cron.schedule(this.collectInterval, async () => {
      await this.collectAllMetadata();
    });

    // 启动时立即执行一次
    setTimeout(() => {
      this.collectAllMetadata();
    }, 5000);

    this.isRunning = true;
  }

  // 停止调度任务
  stopScheduledCollection() {
    this.isRunning = false;
    console.log('元数据采集调度已停止');
  }

  // 收集所有元数据
  async collectAllMetadata() {
    const startTime = Date.now();
    console.log('开始收集所有平台元数据...');
    
    const result = {
      success: true,
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      errors: [],
      statistics: {
        dolphinscheduler: {},
        doris: {}
      }
    };

    try {
      // 并行收集DolphinScheduler和Doris元数据
      const [dsResult, dorisResult] = await Promise.allSettled([
        this.collectDolphinSchedulerMetadata(),
        this.collectDorisMetadata()
      ]);

      // 处理DolphinScheduler结果
      if (dsResult.status === 'fulfilled') {
        result.statistics.dolphinscheduler = dsResult.value;
      } else {
        result.errors.push(`DolphinScheduler采集失败: ${dsResult.reason.message}`);
        result.success = false;
      }

      // 处理Doris结果
      if (dorisResult.status === 'fulfilled') {
        result.statistics.doris = dorisResult.value;
      } else {
        result.errors.push(`Doris采集失败: ${dorisResult.reason.message}`);
        result.success = false;
      }

      // 构建数据血缘关系
      if (result.success) {
        await this.buildDataLineage();
      }

      const endTime = Date.now();
      result.endTime = new Date(endTime);
      result.duration = endTime - startTime;

      // 记录采集日志
      await this.saveCollectionLog(result);

      console.log(`元数据采集完成，耗时: ${result.duration}ms`);
      console.log('采集统计:', JSON.stringify(result.statistics, null, 2));

    } catch (error) {
      result.success = false;
      result.errors.push(`元数据采集异常: ${error.message}`);
      console.error('元数据采集失败:', error);
    }

    return result;
  }

  // 收集DolphinScheduler元数据
  async collectDolphinSchedulerMetadata() {
    console.log('开始收集DolphinScheduler元数据...');
    
    const statistics = {
      projects: 0,
      workflows: 0,
      tasks: 0,
      sqlTasks: 0
    };

    try {
      // 同步元数据
      await dolphinSchedulerService.syncMetadata();

      // 统计数据
      const projectCount = await database.query('SELECT COUNT(*) as count FROM ds_projects');
      const workflowCount = await database.query('SELECT COUNT(*) as count FROM ds_workflows');
      const taskCount = await database.query('SELECT COUNT(*) as count FROM ds_tasks');
      const sqlTaskCount = await database.query('SELECT COUNT(*) as count FROM ds_sql_tasks');

      statistics.projects = projectCount[0]?.count || 0;
      statistics.workflows = workflowCount[0]?.count || 0;
      statistics.tasks = taskCount[0]?.count || 0;
      statistics.sqlTasks = sqlTaskCount[0]?.count || 0;

      console.log('DolphinScheduler元数据采集完成');
      return statistics;

    } catch (error) {
      console.error('DolphinScheduler元数据采集失败:', error);
      throw error;
    }
  }

  // 收集Doris元数据
  async collectDorisMetadata() {
    console.log('开始收集Doris元数据...');
    
    const statistics = {
      databases: 0,
      tables: 0,
      columns: 0
    };

    try {
      // 同步元数据
      await dorisService.syncMetadata();

      // 统计数据
      const dbCount = await database.query('SELECT COUNT(*) as count FROM doris_databases');
      const tableCount = await database.query('SELECT COUNT(*) as count FROM doris_tables');
      const columnCount = await database.query('SELECT COUNT(*) as count FROM doris_columns');

      statistics.databases = dbCount[0]?.count || 0;
      statistics.tables = tableCount[0]?.count || 0;
      statistics.columns = columnCount[0]?.count || 0;

      console.log('Doris元数据采集完成');
      return statistics;

    } catch (error) {
      console.error('Doris元数据采集失败:', error);
      throw error;
    }
  }

  // 构建数据血缘关系
  async buildDataLineage() {
    console.log('开始构建数据血缘关系...');
    
    try {
      // 获取所有SQL任务
      const sqlTasks = await database.query(`
        SELECT 
          project_code, workflow_code, task_code, 
          task_name, sql_content, datasource
        FROM ds_sql_tasks 
        WHERE sql_content IS NOT NULL
      `);

      for (const task of sqlTasks) {
        // 解析SQL，提取血缘关系
        const lineage = await this.parseSQLLineage(task.sql_content);
        
        // 保存血缘关系
        for (const relation of lineage) {
          await this.saveLineageRelation({
            source_type: 'dolphinscheduler_task',
            source_id: task.task_code,
            target_type: 'doris_table',
            target_id: `${relation.target_database}.${relation.target_table}`,
            relation_type: relation.type,
            sql_content: task.sql_content,
            project_code: task.project_code,
            workflow_code: task.workflow_code
          });
        }
      }

      console.log('数据血缘关系构建完成');
    } catch (error) {
      console.error('构建数据血缘关系失败:', error);
      throw error;
    }
  }

  // 解析SQL血缘关系（简化版本）
  async parseSQLLineage(sqlContent) {
    const lineage = [];
    
    try {
      // 简单的SQL解析逻辑，提取INSERT、CREATE TABLE AS SELECT等语句的血缘
      const sql = sqlContent.toLowerCase().trim();
      
      // 匹配INSERT INTO语句
      const insertMatch = sql.match(/insert\s+into\s+[\`\"]?(\w+)[\`\"]?\.[\`\"]?(\w+)[\`\"]?/);
      if (insertMatch) {
        lineage.push({
          type: 'insert',
          target_database: insertMatch[1],
          target_table: insertMatch[2]
        });
      }

      // 匹配CREATE TABLE AS SELECT语句
      const ctasMatch = sql.match(/create\s+table\s+[\`\"]?(\w+)[\`\"]?\.[\`\"]?(\w+)[\`\"]?/);
      if (ctasMatch) {
        lineage.push({
          type: 'create',
          target_database: ctasMatch[1],
          target_table: ctasMatch[2]
        });
      }

      // 可以扩展更复杂的SQL解析逻辑

    } catch (error) {
      console.error('SQL解析失败:', error.message);
    }

    return lineage;
  }

  // 保存血缘关系
  async saveLineageRelation(relation) {
    const sql = `
      INSERT INTO data_lineage (
        source_type, source_id, target_type, target_id,
        relation_type, sql_content, project_code, workflow_code,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        relation_type = VALUES(relation_type),
        sql_content = VALUES(sql_content),
        update_time = NOW()
    `;

    await database.query(sql, [
      relation.source_type,
      relation.source_id,
      relation.target_type,
      relation.target_id,
      relation.relation_type,
      relation.sql_content,
      relation.project_code,
      relation.workflow_code
    ]);
  }

  // 保存采集日志
  async saveCollectionLog(result) {
    const sql = `
      INSERT INTO metadata_collection_logs (
        start_time, end_time, duration, success,
        errors, statistics, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    await database.query(sql, [
      result.startTime,
      result.endTime,
      result.duration,
      result.success,
      JSON.stringify(result.errors),
      JSON.stringify(result.statistics)
    ]);
  }

  // 获取数据资产概览
  async getDataAssetOverview() {
    try {
      const [dsStats, dorisStats, lineageStats] = await Promise.all([
        this.getDolphinSchedulerStats(),
        this.getDorisStats(),
        this.getLineageStats()
      ]);

      return {
        dolphinscheduler: dsStats,
        doris: dorisStats,
        lineage: lineageStats,
        lastCollectionTime: await this.getLastCollectionTime()
      };
    } catch (error) {
      console.error('获取数据资产概览失败:', error);
      throw error;
    }
  }

  // 获取DolphinScheduler统计信息
  async getDolphinSchedulerStats() {
    const results = await database.query(`
      SELECT 
        (SELECT COUNT(*) FROM ds_projects) as project_count,
        (SELECT COUNT(*) FROM ds_workflows) as workflow_count,
        (SELECT COUNT(*) FROM ds_tasks) as task_count,
        (SELECT COUNT(*) FROM ds_sql_tasks) as sql_task_count
    `);
    return results[0];
  }

  // 获取Doris统计信息
  async getDorisStats() {
    const results = await database.query(`
      SELECT 
        (SELECT COUNT(*) FROM doris_databases) as database_count,
        (SELECT COUNT(*) FROM doris_tables) as table_count,
        (SELECT COUNT(*) FROM doris_columns) as column_count,
        (SELECT SUM(row_count) FROM doris_table_stats) as total_rows
    `);
    return results[0];
  }

  // 获取血缘统计信息
  async getLineageStats() {
    const results = await database.query(`
      SELECT 
        COUNT(*) as relation_count,
        COUNT(DISTINCT source_id) as source_count,
        COUNT(DISTINCT target_id) as target_count
      FROM data_lineage
    `);
    return results[0];
  }

  // 获取最后采集时间
  async getLastCollectionTime() {
    const result = await database.query(`
      SELECT MAX(end_time) as last_collection_time 
      FROM metadata_collection_logs 
      WHERE success = 1
    `);
    return result[0]?.last_collection_time;
  }

  // 搜索数据资产
  async searchDataAssets(keyword, type = null, limit = 50) {
    let conditions = [];
    let params = [];

    if (keyword) {
      conditions.push(`(name LIKE ? OR description LIKE ?)`);
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (type) {
      conditions.push('asset_type = ?');
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 合并查询多个资产类型
    const sql = `
      (
        SELECT 
          'dolphinscheduler_project' as asset_type,
          project_code as id,
          project_name as name,
          description,
          create_time
        FROM ds_projects
        ${whereClause.replace(/name/g, 'project_name')}
      )
      UNION ALL
      (
        SELECT 
          'dolphinscheduler_workflow' as asset_type,
          workflow_code as id,
          workflow_name as name,
          description,
          create_time
        FROM ds_workflows
        ${whereClause.replace(/name/g, 'workflow_name')}
      )
      UNION ALL
      (
        SELECT 
          'doris_table' as asset_type,
          CONCAT(database_name, '.', table_name) as id,
          table_name as name,
          table_comment as description,
          create_time
        FROM doris_tables
        ${whereClause.replace(/name/g, 'table_name').replace(/description/g, 'table_comment')}
      )
      ORDER BY create_time DESC
      LIMIT ?
    `;

    params.push(limit);
    return await database.query(sql, params);
  }

  // 获取数据血缘图
  async getDataLineageGraph(assetId, direction = 'both', depth = 3) {
    const nodes = new Map();
    const edges = [];

    try {
      // 递归查询血缘关系
      await this.buildLineageGraph(assetId, direction, depth, nodes, edges, 0);

      return {
        nodes: Array.from(nodes.values()),
        edges: edges
      };
    } catch (error) {
      console.error('获取数据血缘图失败:', error);
      throw error;
    }
  }

  // 递归构建血缘图
  async buildLineageGraph(assetId, direction, maxDepth, nodes, edges, currentDepth) {
    if (currentDepth >= maxDepth) return;

    // 添加当前节点
    if (!nodes.has(assetId)) {
      const nodeInfo = await this.getAssetInfo(assetId);
      nodes.set(assetId, {
        id: assetId,
        label: nodeInfo.name || assetId,
        type: nodeInfo.type,
        ...nodeInfo
      });
    }

    let sql = '';
    let params = [];

    if (direction === 'upstream' || direction === 'both') {
      // 查询上游依赖
      sql = `
        SELECT source_id, source_type, target_id, target_type, relation_type
        FROM data_lineage 
        WHERE target_id = ?
      `;
      params = [assetId];
      
      const upstreamResults = await database.query(sql, params);
      for (const relation of upstreamResults) {
        edges.push({
          source: relation.source_id,
          target: relation.target_id,
          type: relation.relation_type
        });
        
        await this.buildLineageGraph(
          relation.source_id, 
          direction, 
          maxDepth, 
          nodes, 
          edges, 
          currentDepth + 1
        );
      }
    }

    if (direction === 'downstream' || direction === 'both') {
      // 查询下游依赖
      sql = `
        SELECT source_id, source_type, target_id, target_type, relation_type
        FROM data_lineage 
        WHERE source_id = ?
      `;
      params = [assetId];
      
      const downstreamResults = await database.query(sql, params);
      for (const relation of downstreamResults) {
        edges.push({
          source: relation.source_id,
          target: relation.target_id,
          type: relation.relation_type
        });
        
        await this.buildLineageGraph(
          relation.target_id, 
          direction, 
          maxDepth, 
          nodes, 
          edges, 
          currentDepth + 1
        );
      }
    }
  }

  // 获取资产信息
  async getAssetInfo(assetId) {
    // 根据资产ID格式判断资产类型并查询信息
    if (assetId.includes('.')) {
      // Doris表格式: database.table
      const [database, table] = assetId.split('.');
      const result = await database.query(`
        SELECT table_name as name, 'doris_table' as type, table_comment as description
        FROM doris_tables 
        WHERE database_name = ? AND table_name = ?
      `, [database, table]);
      return result[0] || { name: assetId, type: 'unknown' };
    } else {
      // DolphinScheduler任务
      const result = await database.query(`
        SELECT task_name as name, 'dolphinscheduler_task' as type, '' as description
        FROM ds_tasks 
        WHERE task_code = ?
      `, [assetId]);
      return result[0] || { name: assetId, type: 'unknown' };
    }
  }
}

module.exports = new MetadataCollectorService();