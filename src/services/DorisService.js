const mysql = require('mysql2/promise');
const axios = require('axios');
const database = require('../../config/database');

class DorisService {
  constructor() {
    // Doris FE节点配置
    this.config = {
      host: process.env.DORIS_FE_HOST || 'localhost',
      port: process.env.DORIS_FE_QUERY_PORT || 9030,
      httpPort: process.env.DORIS_FE_HTTP_PORT || 8030,
      user: process.env.DORIS_USER || 'root',
      password: process.env.DORIS_PASSWORD || '',
      database: process.env.DORIS_DATABASE || 'information_schema'
    };
    this.connection = null;
  }

  // 创建Doris连接
  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        ssl: false
      });
      console.log('Doris连接成功');
      return this.connection;
    } catch (error) {
      console.error('Doris连接失败:', error.message);
      throw error;
    }
  }

  // 确保连接可用
  async ensureConnection() {
    if (!this.connection) {
      await this.connect();
    }
  }

  // 执行SQL查询
  async query(sql, params = []) {
    await this.ensureConnection();
    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Doris查询失败:', error.message);
      throw error;
    }
  }

  // 通过HTTP API执行查询（用于某些特殊查询）
  async httpQuery(sql, database = null) {
    try {
      const response = await axios.post(
        `http://${this.config.host}:${this.config.httpPort}/rest/v1/query/${database || this.config.database}`,
        { sql },
        {
          auth: {
            username: this.config.user,
            password: this.config.password
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Doris HTTP查询失败:', error.message);
      throw error;
    }
  }

  // 获取所有数据库列表
  async getDatabases() {
    const sql = 'SHOW DATABASES';
    const results = await this.query(sql);
    return results.map(row => ({
      database_name: row.Database,
      catalog_name: 'internal'
    }));
  }

  // 获取指定数据库的表列表
  async getTables(databaseName) {
    const sql = `
      SELECT 
        TABLE_SCHEMA as database_name,
        TABLE_NAME as table_name,
        TABLE_TYPE as table_type,
        ENGINE as engine,
        TABLE_COMMENT as table_comment,
        CREATE_TIME as create_time
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;
    return await this.query(sql, [databaseName]);
  }

  // 获取表的列信息
  async getTableColumns(databaseName, tableName) {
    const sql = `
      SELECT 
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type,
        IS_NULLABLE as is_nullable,
        COLUMN_DEFAULT as column_default,
        COLUMN_COMMENT as column_comment,
        ORDINAL_POSITION as ordinal_position,
        COLUMN_SIZE as column_size
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;
    return await this.query(sql, [databaseName, tableName]);
  }

  // 获取表的详细信息
  async getTableDetail(databaseName, tableName) {
    const sql = `SHOW CREATE TABLE \`${databaseName}\`.\`${tableName}\``;
    const result = await this.query(sql);
    return result[0] ? result[0]['Create Table'] : null;
  }

  // 获取表的分区信息
  async getTablePartitions(databaseName, tableName) {
    try {
      const sql = `SHOW PARTITIONS FROM \`${databaseName}\`.\`${tableName}\``;
      return await this.query(sql);
    } catch (error) {
      // 如果表没有分区，会报错，返回空数组
      return [];
    }
  }

  // 获取表的数据量统计
  async getTableStats(databaseName, tableName) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as row_count,
          MAX(CURRENT_TIMESTAMP) as last_updated
        FROM \`${databaseName}\`.\`${tableName}\`
        LIMIT 1
      `;
      const result = await this.query(sql);
      return result[0] || { row_count: 0, last_updated: null };
    } catch (error) {
      console.error(`获取表统计信息失败 ${databaseName}.${tableName}:`, error.message);
      return { row_count: 0, last_updated: null };
    }
  }

  // 获取Doris集群信息
  async getClusterInfo() {
    try {
      const frontends = await this.query('SHOW FRONTENDS');
      const backends = await this.query('SHOW BACKENDS');
      
      return {
        frontends: frontends.map(fe => ({
          host: fe.Host,
          query_port: fe.QueryPort,
          http_port: fe.HttpPort,
          is_master: fe.IsMaster,
          alive: fe.Alive,
          last_heartbeat: fe.LastHeartbeat
        })),
        backends: backends.map(be => ({
          host: be.Host,
          heartbeat_port: be.HeartbeatPort,
          be_port: be.BePort,
          http_port: be.HttpPort,
          alive: be.Alive,
          system_decommissioned: be.SystemDecommissioned,
          disk_capacity: be.TotalCapacity,
          disk_used: be.UsedCapacity
        }))
      };
    } catch (error) {
      console.error('获取集群信息失败:', error.message);
      return null;
    }
  }

  // 同步Doris元数据到本地数据库
  async syncMetadata() {
    try {
      console.log('开始同步Doris元数据...');
      
      // 获取所有数据库
      const databases = await this.getDatabases();
      
      for (const db of databases) {
        // 跳过系统数据库
        if (['information_schema', '__internal_schema'].includes(db.database_name)) {
          continue;
        }
        
        // 同步数据库信息
        await this.saveDatabaseInfo(db);
        
        // 获取数据库下的所有表
        const tables = await this.getTables(db.database_name);
        
        for (const table of tables) {
          // 同步表信息
          await this.saveTableInfo(table);
          
          // 获取表的列信息
          const columns = await this.getTableColumns(db.database_name, table.table_name);
          
          // 同步列信息
          for (const column of columns) {
            await this.saveColumnInfo(db.database_name, table.table_name, column);
          }
          
          // 获取表的统计信息
          const stats = await this.getTableStats(db.database_name, table.table_name);
          await this.saveTableStats(db.database_name, table.table_name, stats);
          
          // 获取分区信息
          const partitions = await this.getTablePartitions(db.database_name, table.table_name);
          for (const partition of partitions) {
            await this.savePartitionInfo(db.database_name, table.table_name, partition);
          }
        }
      }
      
      console.log('Doris元数据同步完成');
    } catch (error) {
      console.error('同步Doris元数据失败:', error.message);
      throw error;
    }
  }

  // 保存数据库信息到本地
  async saveDatabaseInfo(dbInfo) {
    const sql = `
      INSERT INTO doris_databases (
        database_name, catalog_name, create_time, update_time
      ) VALUES (?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE update_time = NOW()
    `;
    
    await database.query(sql, [
      dbInfo.database_name,
      dbInfo.catalog_name
    ]);
  }

  // 保存表信息到本地
  async saveTableInfo(tableInfo) {
    const sql = `
      INSERT INTO doris_tables (
        database_name, table_name, table_type, engine,
        table_comment, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        table_type = VALUES(table_type),
        engine = VALUES(engine),
        table_comment = VALUES(table_comment),
        update_time = NOW()
    `;
    
    await database.query(sql, [
      tableInfo.database_name,
      tableInfo.table_name,
      tableInfo.table_type,
      tableInfo.engine,
      tableInfo.table_comment
    ]);
  }

  // 保存列信息到本地
  async saveColumnInfo(databaseName, tableName, columnInfo) {
    const sql = `
      INSERT INTO doris_columns (
        database_name, table_name, column_name, data_type,
        is_nullable, column_default, column_comment,
        ordinal_position, column_size, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        data_type = VALUES(data_type),
        is_nullable = VALUES(is_nullable),
        column_default = VALUES(column_default),
        column_comment = VALUES(column_comment),
        ordinal_position = VALUES(ordinal_position),
        column_size = VALUES(column_size),
        update_time = NOW()
    `;
    
    await database.query(sql, [
      databaseName,
      tableName,
      columnInfo.column_name,
      columnInfo.data_type,
      columnInfo.is_nullable,
      columnInfo.column_default,
      columnInfo.column_comment,
      columnInfo.ordinal_position,
      columnInfo.column_size
    ]);
  }

  // 保存表统计信息
  async saveTableStats(databaseName, tableName, stats) {
    const sql = `
      INSERT INTO doris_table_stats (
        database_name, table_name, row_count, last_updated, sync_time
      ) VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        row_count = VALUES(row_count),
        last_updated = VALUES(last_updated),
        sync_time = NOW()
    `;
    
    await database.query(sql, [
      databaseName,
      tableName,
      stats.row_count,
      stats.last_updated
    ]);
  }

  // 保存分区信息
  async savePartitionInfo(databaseName, tableName, partitionInfo) {
    const sql = `
      INSERT INTO doris_table_partitions (
        database_name, table_name, partition_name, 
        partition_desc, create_time
      ) VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        partition_desc = VALUES(partition_desc)
    `;
    
    await database.query(sql, [
      databaseName,
      tableName,
      partitionInfo.PartitionName || '',
      JSON.stringify(partitionInfo)
    ]);
  }

  // 执行数据质量检查
  async executeDataQualityCheck(databaseName, tableName, rules) {
    const checks = [];
    
    for (const rule of rules) {
      try {
        let sql;
        switch (rule.type) {
          case 'null_check':
            sql = `SELECT COUNT(*) as null_count FROM \`${databaseName}\`.\`${tableName}\` WHERE \`${rule.column}\` IS NULL`;
            break;
          case 'duplicate_check':
            sql = `SELECT COUNT(*) - COUNT(DISTINCT \`${rule.column}\`) as duplicate_count FROM \`${databaseName}\`.\`${tableName}\``;
            break;
          case 'range_check':
            sql = `SELECT COUNT(*) as out_of_range_count FROM \`${databaseName}\`.\`${tableName}\` WHERE \`${rule.column}\` NOT BETWEEN ${rule.min} AND ${rule.max}`;
            break;
          default:
            continue;
        }
        
        const result = await this.query(sql);
        checks.push({
          rule_type: rule.type,
          column: rule.column,
          result: result[0],
          passed: this.evaluateQualityRule(rule, result[0])
        });
      } catch (error) {
        console.error(`数据质量检查失败 ${rule.type}:`, error.message);
        checks.push({
          rule_type: rule.type,
          column: rule.column,
          error: error.message,
          passed: false
        });
      }
    }
    
    return checks;
  }

  // 评估数据质量规则
  evaluateQualityRule(rule, result) {
    switch (rule.type) {
      case 'null_check':
        return (result.null_count || 0) <= (rule.threshold || 0);
      case 'duplicate_check':
        return (result.duplicate_count || 0) <= (rule.threshold || 0);
      case 'range_check':
        return (result.out_of_range_count || 0) <= (rule.threshold || 0);
      default:
        return false;
    }
  }

  // 关闭连接
  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log('Doris连接已关闭');
    }
  }
}

module.exports = new DorisService();