const database = require('../../config/database');
const axios = require('axios');

/**
 * 增强版血缘分析服务
 * 集成SQLLineage Python服务，提供企业级SQL血缘解析能力
 */
class EnhancedLineageAnalysisService {
  constructor() {
    this.pythonServiceUrl = process.env.PYTHON_LINEAGE_SERVICE_URL || 'http://localhost:5001';
    this.fallbackToRegex = true; // Python服务不可用时回退到正则表达式
    this.timeoutMs = 30000; // 30秒超时
    
    // 简单SQL的复杂度阈值
    this.simpleThreshold = 40;
  }

  /**
   * 智能SQL血缘分析
   * 根据SQL复杂度选择最适合的解析引擎
   */
  async analyzeSQLLineage(sqlContent, context = {}) {
    try {
      console.log('开始SQL血缘分析...');
      
      // 1. 检查Python服务是否可用
      const isPythonServiceAvailable = await this.checkPythonService();
      
      if (isPythonServiceAvailable) {
        // 2. 分析SQL复杂度
        const complexity = await this.analyzeSQLComplexity(sqlContent);
        console.log(`SQL复杂度评分: ${complexity.complexity_score} (${complexity.complexity_level})`);
        
        // 3. 根据复杂度选择解析器
        if (complexity.complexity_score >= this.simpleThreshold || 
            complexity.cte_count > 0 || 
            complexity.sql_type === 'CREATE_TABLE_AS_SELECT') {
          
          console.log('使用SQLLineage进行高级解析...');
          return await this.parseWithSQLLineage(sqlContent, context);
        } else {
          console.log('使用正则表达式进行快速解析...');
          return await this.parseWithRegex(sqlContent, context);
        }
      } else {
        console.log('Python服务不可用，使用正则表达式解析...');
        return await this.parseWithRegex(sqlContent, context);
      }
      
    } catch (error) {
      console.error('SQL血缘分析失败:', error);
      
      // 发生错误时回退到正则表达式
      if (this.fallbackToRegex) {
        console.log('回退到正则表达式解析...');
        return await this.parseWithRegex(sqlContent, context);
      }
      
      return {
        success: false,
        error: error.message,
        lineage: null
      };
    }
  }

  /**
   * 检查Python血缘服务是否可用
   */
  async checkPythonService() {
    try {
      const response = await axios.get(`${this.pythonServiceUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Python血缘服务不可用:', error.message);
      return false;
    }
  }

  /**
   * 分析SQL复杂度
   */
  async analyzeSQLComplexity(sqlContent) {
    try {
      const response = await axios.post(`${this.pythonServiceUrl}/complexity`, {
        sql: sqlContent
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.warn('复杂度分析失败，使用默认值:', error.message);
      
      // 简单的本地复杂度评估
      const cteCount = (sqlContent.match(/\bwith\b/gi) || []).length;
      const joinCount = (sqlContent.match(/\bjoin\b/gi) || []).length;
      const complexity_score = Math.min(cteCount * 15 + joinCount * 5 + (sqlContent.length > 1000 ? 20 : 0), 100);
      
      return {
        complexity_score,
        complexity_level: complexity_score >= 60 ? '高' : complexity_score >= 30 ? '中等' : '低',
        cte_count: cteCount,
        sql_type: this.detectSQLType(sqlContent),
        recommendation: complexity_score >= 40 ? 'SQLLineage' : 'node-sql-parser'
      };
    }
  }

  /**
   * 使用SQLLineage进行解析
   */
  async parseWithSQLLineage(sqlContent, context) {
    try {
      const response = await axios.post(`${this.pythonServiceUrl}/analyze`, {
        sql: sqlContent
      }, {
        timeout: this.timeoutMs,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data.success) {
        const pythonResult = response.data.data;
        
        // 转换为标准格式
        const lineage = await this.convertPythonResultToStandard(pythonResult, context);
        
        return {
          success: true,
          lineage: lineage,
          tables: this.extractTables(lineage),
          columns: this.extractColumns(lineage),
          parser: 'SQLLineage',
          statistics: pythonResult.statistics,
          complexity: pythonResult.complexity_score
        };
      } else {
        throw new Error(response.data.message || 'SQLLineage解析失败');
      }
      
    } catch (error) {
      console.error('SQLLineage解析失败:', error.message);
      
      if (this.fallbackToRegex) {
        console.log('回退到正则表达式解析...');
        return await this.parseWithRegex(sqlContent, context);
      }
      
      throw error;
    }
  }

  /**
   * 转换Python结果为标准格式
   */
  async convertPythonResultToStandard(pythonResult, context) {
    const lineage = {
      targetTables: [],
      sourceTables: [],
      operations: [pythonResult.sql_type],
      columnMappings: pythonResult.column_lineage || [],
      cteReferences: pythonResult.cte_tables || [],
      relations: pythonResult.relations || []
    };

    // 处理源表
    for (const tableName of pythonResult.source_tables) {
      const normalized = await this.normalizeTableReference(tableName, context);
      if (normalized) {
        lineage.sourceTables.push(normalized);
      }
    }

    // 处理目标表
    for (const tableName of pythonResult.target_tables) {
      const normalized = await this.normalizeTableReference(tableName, context);
      if (normalized) {
        lineage.targetTables.push(normalized);
      }
    }

    return lineage;
  }

  /**
   * 使用正则表达式进行简单解析（保留原有逻辑）
   */
  async parseWithRegex(sqlContent, context) {
    try {
      const sqlParser = new SQLLineageParser();
      const lineage = sqlParser.parse(sqlContent);
      
      // 规范化血缘关系
      const normalizedLineage = await this.normalizeLineage(lineage, context);
      
      return {
        success: true,
        lineage: normalizedLineage,
        tables: this.extractTables(normalizedLineage),
        columns: this.extractColumns(normalizedLineage),
        parser: 'RegExp',
        statistics: {
          source_count: normalizedLineage.sourceTables.length,
          target_count: normalizedLineage.targetTables.length,
          relation_count: normalizedLineage.sourceTables.length + normalizedLineage.targetTables.length
        }
      };
    } catch (error) {
      console.error('正则表达式解析失败:', error);
      return {
        success: false,
        error: error.message,
        lineage: null,
        parser: 'RegExp'
      };
    }
  }

  /**
   * 规范化血缘关系
   */
  async normalizeLineage(lineage, context) {
    const normalized = {
      targetTables: [],
      sourceTables: [],
      operations: [],
      columnMappings: [],
      cteReferences: [],
      relations: []
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

  /**
   * 规范化表引用
   */
  async normalizeTableReference(tableRef, context) {
    try {
      let database, table;
      
      if (typeof tableRef === 'string') {
        // 字符串格式: "database.table" 或 "table"
        const parts = tableRef.split('.');
        if (parts.length === 2) {
          database = parts[0];
          table = parts[1];
        } else {
          database = context.defaultDatabase || 'default';
          table = parts[0];
        }
      } else {
        // 对象格式
        database = tableRef.database || context.defaultDatabase || 'default';
        table = tableRef.table;
      }

      // 过滤掉无效的表名
      if (!table || table === 'default' || table.length < 2) {
        return null;
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
        alias: tableRef.alias || null
      };
    } catch (error) {
      console.error('规范化表引用失败:', error);
      return null;
    }
  }

  /**
   * 验证表是否存在
   */
  async validateTableExists(databaseName, tableName) {
    try {
      const result = await database.query(`
        SELECT 1 FROM doris_tables 
        WHERE database_name = ? AND table_name = ?
        LIMIT 1
      `, [databaseName, tableName]);
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 提取所有表
   */
  extractTables(lineage) {
    const tables = new Set();
    
    lineage.targetTables?.forEach(t => tables.add(t.fullName));
    lineage.sourceTables?.forEach(t => tables.add(t.fullName));
    
    return Array.from(tables);
  }

  /**
   * 提取所有列
   */
  extractColumns(lineage) {
    const columns = new Set();
    
    lineage.columnMappings?.forEach(mapping => {
      if (mapping.source_column) columns.add(mapping.source_column);
      if (mapping.target_column) columns.add(mapping.target_column);
    });
    
    return Array.from(columns);
  }

  /**
   * 检测SQL类型
   */
  detectSQLType(sql) {
    const sqlUpper = sql.toUpperCase().trim();
    
    if (sqlUpper.startsWith('INSERT')) {
      return 'INSERT';
    } else if (sqlUpper.startsWith('CREATE TABLE') && sqlUpper.includes('AS SELECT')) {
      return 'CREATE_TABLE_AS_SELECT';
    } else if (sqlUpper.startsWith('CREATE')) {
      return 'CREATE';
    } else if (sqlUpper.startsWith('UPDATE')) {
      return 'UPDATE';
    } else if (sqlUpper.startsWith('DELETE')) {
      return 'DELETE';
    } else if (sqlUpper.startsWith('SELECT') || sqlUpper.startsWith('WITH')) {
      return 'SELECT';
    } else if (sqlUpper.startsWith('MERGE')) {
      return 'MERGE';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * 批量分析SQL血缘
   */
  async batchAnalyzeSQL(sqlList, context = {}) {
    try {
      const isPythonServiceAvailable = await this.checkPythonService();
      
      if (isPythonServiceAvailable) {
        // 使用Python服务进行批量分析
        const response = await axios.post(`${this.pythonServiceUrl}/batch-analyze`, {
          sqls: sqlList
        }, {
          timeout: this.timeoutMs * 2, // 批量分析允许更长时间
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data.success) {
          return {
            success: true,
            results: response.data.data,
            total: response.data.total,
            success_count: response.data.success_count
          };
        }
      }
      
      // 回退到逐个分析
      const results = [];
      for (let i = 0; i < sqlList.length; i++) {
        try {
          const result = await this.analyzeSQLLineage(sqlList[i], context);
          results.push({
            index: i,
            sql: sqlList[i].substring(0, 100) + '...',
            result: result
          });
        } catch (error) {
          results.push({
            index: i,
            sql: sqlList[i].substring(0, 100) + '...',
            result: {
              success: false,
              error: error.message
            }
          });
        }
      }
      
      return {
        success: true,
        results: results,
        total: results.length,
        success_count: results.filter(r => r.result.success).length
      };
      
    } catch (error) {
      console.error('批量分析失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 保留原有的方法
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
          sql: upstream.sql_statement
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
          sql: downstream.sql_statement
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

  async getTableMetadata(tableName) {
    try {
      const [database, table] = tableName.split('.');
      const result = await database.query(`
        SELECT * FROM doris_tables 
        WHERE database_name = ? AND table_name = ?
        LIMIT 1
      `, [database, table]);
      return result[0] || {};
    } catch (error) {
      return {};
    }
  }

  async getUpstreamTables(tableName) {
    const sql = `
      SELECT DISTINCT
        SUBSTRING_INDEX(source_id, '.', -2) as source_table,
        relation_type,
        sql_statement
      FROM data_lineage 
      WHERE target_id = ? OR target_id LIKE ?
    `;
    
    return await database.query(sql, [tableName, `%.${tableName}`]);
  }

  async getDownstreamTables(tableName) {
    const sql = `
      SELECT DISTINCT
        SUBSTRING_INDEX(target_id, '.', -2) as target_table,
        relation_type,
        sql_statement
      FROM data_lineage 
      WHERE source_id = ? OR source_id LIKE ?
    `;
    
    return await database.query(sql, [tableName, `%.${tableName}`]);
  }
}

// 保留原有的SQLLineageParser用于回退
class SQLLineageParser {
  constructor() {
    this.keywords = {
      dml: ['insert', 'update', 'delete', 'merge'],
      ddl: ['create', 'alter', 'drop'],
      select: ['select', 'with'],
      from: ['from', 'join', 'inner join', 'left join', 'right join', 'full join']
    };
  }

  parse(sqlContent) {
    const sql = this.normalizeSql(sqlContent);
    const lineage = {
      targets: [],
      sources: [],
      operations: [],
      columnMappings: []
    };

    try {
      const sqlType = this.detectSqlType(sql);
      lineage.operations.push(sqlType);

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

  normalizeSql(sql) {
    return sql
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim()
      .toLowerCase();
  }

  detectSqlType(sql) {
    if (sql.includes('insert into')) return 'INSERT';
    if (sql.includes('create table') && sql.includes('as select')) return 'CREATE_TABLE_AS_SELECT';
    if (sql.startsWith('select')) return 'SELECT';
    if (sql.includes('update')) return 'UPDATE';
    return 'UNKNOWN';
  }

  parseInsertStatement(sql, lineage) {
    const insertMatch = sql.match(/insert\s+into\s+(?:`?(\w+)`?\.)?`?(\w+)`?/);
    if (insertMatch) {
      lineage.targets.push({
        database: insertMatch[1] || null,
        table: insertMatch[2]
      });
    }

    this.extractSourceTables(sql, lineage);
  }

  parseCreateTableAsSelect(sql, lineage) {
    const createMatch = sql.match(/create\s+table\s+(?:`?(\w+)`?\.)?`?(\w+)`?/);
    if (createMatch) {
      lineage.targets.push({
        database: createMatch[1] || null,
        table: createMatch[2]
      });
    }

    this.extractSourceTables(sql, lineage);
  }

  parseSelectStatement(sql, lineage) {
    this.extractSourceTables(sql, lineage);
  }

  parseUpdateStatement(sql, lineage) {
    const updateMatch = sql.match(/update\s+(?:`?(\w+)`?\.)?`?(\w+)`?/);
    if (updateMatch) {
      const table = {
        database: updateMatch[1] || null,
        table: updateMatch[2]
      };
      lineage.targets.push(table);
      lineage.sources.push(table);
    }

    this.extractSourceTables(sql, lineage);
  }

  extractSourceTables(sql, lineage) {
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

module.exports = new EnhancedLineageAnalysisService();