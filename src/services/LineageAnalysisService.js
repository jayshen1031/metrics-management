const database = require('../../config/database');

class LineageAnalysisService {
  constructor() {
    this.sqlParser = new SQLLineageParser();
  }

  // 分析SQL血缘关系
  async analyzeSQLLineage(sqlContent, context = {}) {
    try {
      const lineage = this.sqlParser.parse(sqlContent);
      
      // 验证和规范化血缘关系
      const normalizedLineage = await this.normalizeLineage(lineage, context);
      
      return {
        success: true,
        lineage: normalizedLineage,
        tables: this.extractTables(normalizedLineage),
        columns: this.extractColumns(normalizedLineage)
      };
    } catch (error) {
      console.error('SQL血缘分析失败:', error);
      return {
        success: false,
        error: error.message,
        lineage: null
      };
    }
  }

  // 规范化血缘关系
  async normalizeLineage(lineage, context) {
    const normalized = {
      targetTables: [],
      sourceTables: [],
      operations: [],
      columnMappings: []
    };

    // 处理目标表
    for (const target of lineage.targets || []) {
      const normalizedTarget = await this.normalizeTableReference(target, context);
      if (normalizedTarget) {
        normalized.targetTables.push(normalizedTarget);
      }
    }

    // 处理源表
    for (const source of lineage.sources || []) {
      const normalizedSource = await this.normalizeTableReference(source, context);
      if (normalizedSource) {
        normalized.sourceTables.push(normalizedSource);
      }
    }

    // 处理操作类型
    normalized.operations = lineage.operations || [];

    // 处理列级血缘
    normalized.columnMappings = lineage.columnMappings || [];

    return normalized;
  }

  // 规范化表引用
  async normalizeTableReference(tableRef, context) {
    try {
      let database = tableRef.database;
      let table = tableRef.table;

      // 如果没有指定数据库，使用上下文默认数据库
      if (!database && context.defaultDatabase) {
        database = context.defaultDatabase;
      }

      // 验证表是否存在
      const exists = await this.validateTableExists(database, table);
      if (!exists) {
        console.warn(`表不存在: ${database}.${table}`);
      }

      return {
        database: database,
        table: table,
        fullName: `${database}.${table}`,
        exists: exists,
        alias: tableRef.alias
      };
    } catch (error) {
      console.error('规范化表引用失败:', error);
      return null;
    }
  }

  // 验证表是否存在
  async validateTableExists(databaseName, tableName) {
    try {
      const result = await database.query(`
        SELECT 1 FROM doris_tables 
        WHERE database_name = ? AND table_name = ?
      `, [databaseName, tableName]);
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  // 提取所有表
  extractTables(lineage) {
    const tables = new Set();
    
    lineage.targetTables?.forEach(t => tables.add(t.fullName));
    lineage.sourceTables?.forEach(t => tables.add(t.fullName));
    
    return Array.from(tables);
  }

  // 提取所有列
  extractColumns(lineage) {
    const columns = new Set();
    
    lineage.columnMappings?.forEach(mapping => {
      if (mapping.source) columns.add(mapping.source);
      if (mapping.target) columns.add(mapping.target);
    });
    
    return Array.from(columns);
  }

  // 构建表级血缘图
  async buildTableLineageGraph(startTable, direction = 'both', maxDepth = 5) {
    const visited = new Set();
    const nodes = new Map();
    const edges = [];

    await this.traverseTableLineage(
      startTable, 
      direction, 
      maxDepth, 
      0, 
      visited, 
      nodes, 
      edges
    );

    return {
      nodes: Array.from(nodes.values()),
      edges: edges,
      statistics: {
        nodeCount: nodes.size,
        edgeCount: edges.length,
        maxDepth: maxDepth
      }
    };
  }

  // 递归遍历表血缘
  async traverseTableLineage(tableName, direction, maxDepth, currentDepth, visited, nodes, edges) {
    if (currentDepth >= maxDepth || visited.has(tableName)) {
      return;
    }

    visited.add(tableName);

    // 添加节点信息
    if (!nodes.has(tableName)) {
      const tableInfo = await this.getTableMetadata(tableName);
      nodes.set(tableName, {
        id: tableName,
        label: tableInfo.table_name || tableName,
        type: 'table',
        database: tableInfo.database_name,
        metadata: tableInfo
      });
    }

    // 查询血缘关系
    if (direction === 'upstream' || direction === 'both') {
      const upstreamTables = await this.getUpstreamTables(tableName);
      for (const upstream of upstreamTables) {
        edges.push({
          source: upstream.source_table,
          target: tableName,
          type: upstream.relation_type,
          sql: upstream.sql_content
        });
        
        await this.traverseTableLineage(
          upstream.source_table,
          direction,
          maxDepth,
          currentDepth + 1,
          visited,
          nodes,
          edges
        );
      }
    }

    if (direction === 'downstream' || direction === 'both') {
      const downstreamTables = await this.getDownstreamTables(tableName);
      for (const downstream of downstreamTables) {
        edges.push({
          source: tableName,
          target: downstream.target_table,
          type: downstream.relation_type,
          sql: downstream.sql_content
        });
        
        await this.traverseTableLineage(
          downstream.target_table,
          direction,
          maxDepth,
          currentDepth + 1,
          visited,
          nodes,
          edges
        );
      }
    }
  }

  // 获取表元数据
  async getTableMetadata(tableName) {
    try {
      const [database, table] = tableName.split('.');
      const result = await database.query(`
        SELECT * FROM doris_tables 
        WHERE database_name = ? AND table_name = ?
      `, [database, table]);
      return result[0] || {};
    } catch (error) {
      return {};
    }
  }

  // 获取上游表
  async getUpstreamTables(tableName) {
    const sql = `
      SELECT DISTINCT
        SUBSTRING_INDEX(source_id, '.', -2) as source_table,
        relation_type,
        sql_content
      FROM data_lineage 
      WHERE target_id = ? OR target_id LIKE ?
    `;
    
    return await database.query(sql, [tableName, `%.${tableName}`]);
  }

  // 获取下游表
  async getDownstreamTables(tableName) {
    const sql = `
      SELECT DISTINCT
        SUBSTRING_INDEX(target_id, '.', -2) as target_table,
        relation_type,
        sql_content
      FROM data_lineage 
      WHERE source_id = ? OR source_id LIKE ?
    `;
    
    return await database.query(sql, [tableName, `%.${tableName}`]);
  }

  // 分析血缘影响范围
  async analyzeLineageImpact(tableName, changeType = 'schema') {
    const impact = {
      directImpact: [],
      indirectImpact: [],
      totalAffectedTables: 0,
      totalAffectedWorkflows: 0,
      severity: 'low'
    };

    try {
      // 获取直接下游影响
      const directDownstream = await this.getDownstreamTables(tableName);
      impact.directImpact = directDownstream.map(d => d.target_table);

      // 获取间接影响（递归查询2-3层）
      const indirectImpact = new Set();
      for (const directTable of impact.directImpact) {
        const indirectDownstream = await this.getDownstreamTables(directTable);
        indirectDownstream.forEach(t => indirectImpact.add(t.target_table));
      }
      impact.indirectImpact = Array.from(indirectImpact);

      // 统计影响的工作流
      const affectedWorkflows = await this.getAffectedWorkflows([
        tableName,
        ...impact.directImpact,
        ...impact.indirectImpact
      ]);

      impact.totalAffectedTables = impact.directImpact.length + impact.indirectImpact.length;
      impact.totalAffectedWorkflows = affectedWorkflows.length;

      // 评估影响严重程度
      if (impact.totalAffectedTables > 20 || impact.totalAffectedWorkflows > 10) {
        impact.severity = 'high';
      } else if (impact.totalAffectedTables > 5 || impact.totalAffectedWorkflows > 3) {
        impact.severity = 'medium';
      }

      impact.affectedWorkflows = affectedWorkflows;

    } catch (error) {
      console.error('血缘影响分析失败:', error);
    }

    return impact;
  }

  // 获取受影响的工作流
  async getAffectedWorkflows(tableNames) {
    if (tableNames.length === 0) return [];

    const placeholders = tableNames.map(() => '?').join(',');
    const sql = `
      SELECT DISTINCT 
        project_code,
        workflow_code,
        workflow_name
      FROM ds_workflows w
      JOIN ds_sql_tasks st ON w.workflow_code = st.workflow_code
      JOIN data_lineage dl ON st.task_code = dl.source_id
      WHERE dl.target_id IN (${placeholders})
         OR dl.source_id IN (${placeholders})
    `;

    return await database.query(sql, [...tableNames, ...tableNames]);
  }

  // 生成血缘报告
  async generateLineageReport(tableName) {
    const report = {
      tableName: tableName,
      generatedAt: new Date(),
      summary: {},
      upstream: {},
      downstream: {},
      impact: {},
      recommendations: []
    };

    try {
      // 基本统计
      const [upstream, downstream] = await Promise.all([
        this.getUpstreamTables(tableName),
        this.getDownstreamTables(tableName)
      ]);

      report.summary = {
        upstreamCount: upstream.length,
        downstreamCount: downstream.length,
        totalDependencies: upstream.length + downstream.length
      };

      // 上游分析
      report.upstream = {
        tables: upstream,
        complexity: this.calculateComplexity(upstream)
      };

      // 下游分析
      report.downstream = {
        tables: downstream,
        complexity: this.calculateComplexity(downstream)
      };

      // 影响分析
      report.impact = await this.analyzeLineageImpact(tableName);

      // 生成建议
      report.recommendations = this.generateRecommendations(report);

    } catch (error) {
      console.error('生成血缘报告失败:', error);
      report.error = error.message;
    }

    return report;
  }

  // 计算复杂度
  calculateComplexity(tables) {
    if (tables.length === 0) return 'simple';
    if (tables.length <= 3) return 'moderate';
    if (tables.length <= 10) return 'complex';
    return 'very_complex';
  }

  // 生成建议
  generateRecommendations(report) {
    const recommendations = [];

    if (report.summary.upstreamCount > 10) {
      recommendations.push({
        type: 'performance',
        message: '上游依赖过多，考虑优化数据管道'
      });
    }

    if (report.summary.downstreamCount > 15) {
      recommendations.push({
        type: 'risk',
        message: '下游影响面较大，变更时需要谨慎'
      });
    }

    if (report.impact.severity === 'high') {
      recommendations.push({
        type: 'governance',
        message: '建议设置变更审批流程'
      });
    }

    return recommendations;
  }
}

// SQL血缘解析器
class SQLLineageParser {
  constructor() {
    this.keywords = {
      dml: ['insert', 'update', 'delete', 'merge'],
      ddl: ['create', 'alter', 'drop'],
      select: ['select', 'with'],
      from: ['from', 'join', 'inner join', 'left join', 'right join', 'full join']
    };
  }

  // 解析SQL语句
  parse(sqlContent) {
    const sql = this.normalizeSql(sqlContent);
    const lineage = {
      targets: [],
      sources: [],
      operations: [],
      columnMappings: []
    };

    try {
      // 检测SQL类型
      const sqlType = this.detectSqlType(sql);
      lineage.operations.push(sqlType);

      // 根据SQL类型解析
      switch (sqlType) {
        case 'INSERT':
          this.parseInsertStatement(sql, lineage);
          break;
        case 'CREATE_TABLE_AS_SELECT':
          this.parseCreateTableAsSelect(sql, lineage);
          break;
        case 'SELECT':
          this.parseSelectStatement(sql, lineage);
          break;
        case 'UPDATE':
          this.parseUpdateStatement(sql, lineage);
          break;
        default:
          console.warn('未支持的SQL类型:', sqlType);
      }

    } catch (error) {
      console.error('SQL解析失败:', error);
      throw error;
    }

    return lineage;
  }

  // 规范化SQL
  normalizeSql(sql) {
    return sql
      .replace(/\s+/g, ' ')  // 合并多个空格
      .replace(/\n/g, ' ')   // 替换换行符
      .trim()
      .toLowerCase();
  }

  // 检测SQL类型
  detectSqlType(sql) {
    if (sql.includes('insert into')) return 'INSERT';
    if (sql.includes('create table') && sql.includes('as select')) return 'CREATE_TABLE_AS_SELECT';
    if (sql.startsWith('select')) return 'SELECT';
    if (sql.includes('update')) return 'UPDATE';
    return 'UNKNOWN';
  }

  // 解析INSERT语句
  parseInsertStatement(sql, lineage) {
    // 提取目标表
    const insertMatch = sql.match(/insert\s+into\s+(?:`?(\w+)`?\.)?`?(\w+)`?/);
    if (insertMatch) {
      lineage.targets.push({
        database: insertMatch[1] || null,
        table: insertMatch[2]
      });
    }

    // 提取源表
    this.extractSourceTables(sql, lineage);
  }

  // 解析CREATE TABLE AS SELECT语句
  parseCreateTableAsSelect(sql, lineage) {
    // 提取目标表
    const createMatch = sql.match(/create\s+table\s+(?:`?(\w+)`?\.)?`?(\w+)`?/);
    if (createMatch) {
      lineage.targets.push({
        database: createMatch[1] || null,
        table: createMatch[2]
      });
    }

    // 提取源表
    this.extractSourceTables(sql, lineage);
  }

  // 解析SELECT语句
  parseSelectStatement(sql, lineage) {
    this.extractSourceTables(sql, lineage);
  }

  // 解析UPDATE语句
  parseUpdateStatement(sql, lineage) {
    // UPDATE语句的目标表也是源表
    const updateMatch = sql.match(/update\s+(?:`?(\w+)`?\.)?`?(\w+)`?/);
    if (updateMatch) {
      const table = {
        database: updateMatch[1] || null,
        table: updateMatch[2]
      };
      lineage.targets.push(table);
      lineage.sources.push(table);
    }

    // 提取JOIN中的其他源表
    this.extractSourceTables(sql, lineage);
  }

  // 提取源表
  extractSourceTables(sql, lineage) {
    // 匹配FROM子句中的表
    const fromMatches = sql.match(/from\s+(?:`?(\w+)`?\.)?`?(\w+)`?(?:\s+(?:as\s+)?(\w+))?/g);
    if (fromMatches) {
      fromMatches.forEach(match => {
        const tableMatch = match.match(/from\s+(?:`?(\w+)`?\.)?`?(\w+)`?(?:\s+(?:as\s+)?(\w+))?/);
        if (tableMatch) {
          lineage.sources.push({
            database: tableMatch[1] || null,
            table: tableMatch[2],
            alias: tableMatch[3] || null
          });
        }
      });
    }

    // 匹配JOIN子句中的表
    const joinMatches = sql.match(/(?:inner\s+|left\s+|right\s+|full\s+)?join\s+(?:`?(\w+)`?\.)?`?(\w+)`?(?:\s+(?:as\s+)?(\w+))?/g);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const tableMatch = match.match(/join\s+(?:`?(\w+)`?\.)?`?(\w+)`?(?:\s+(?:as\s+)?(\w+))?/);
        if (tableMatch) {
          lineage.sources.push({
            database: tableMatch[1] || null,
            table: tableMatch[2],
            alias: tableMatch[3] || null
          });
        }
      });
    }
  }
}

module.exports = new LineageAnalysisService();