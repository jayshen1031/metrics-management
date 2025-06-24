const express = require('express');
const router = express.Router();
const MetadataCollectorService = require('../services/MetadataCollectorService');

// 获取数据资产目录
router.get('/catalog', async (req, res) => {
  try {
    const { type, category, page = 1, limit = 50 } = req.query;
    
    const database = require('../../config/database');
    let conditions = [];
    let params = [];
    
    // 构建查询条件
    if (type) {
      conditions.push('asset_type = ?');
      params.push(type);
    }
    
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // 统一查询各类数据资产
    const sql = `
      (
        SELECT 
          'doris_table' as asset_type,
          'table' as category,
          CONCAT(database_name, '.', table_name) as asset_id,
          table_name as name,
          table_comment as description,
          database_name,
          table_type,
          engine,
          create_time,
          update_time
        FROM doris_tables
        ${whereClause.replace(/asset_type/g, "'doris_table'").replace(/category/g, "'table'")}
      )
      UNION ALL
      (
        SELECT 
          'dolphinscheduler_workflow' as asset_type,
          'workflow' as category,
          workflow_code as asset_id,
          workflow_name as name,
          description,
          project_code as database_name,
          '' as table_type,
          '' as engine,
          create_time,
          update_time
        FROM ds_workflows
        ${whereClause.replace(/asset_type/g, "'dolphinscheduler_workflow'").replace(/category/g, "'workflow'")}
      )
      UNION ALL
      (
        SELECT 
          'dolphinscheduler_task' as asset_type,
          'task' as category,
          task_code as asset_id,
          task_name as name,
          description,
          project_code as database_name,
          task_type as table_type,
          '' as engine,
          create_time,
          update_time
        FROM ds_tasks
        ${whereClause.replace(/asset_type/g, "'dolphinscheduler_task'").replace(/category/g, "'task'")}
      )
      ORDER BY update_time DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    const assets = await database.query(sql, params);
    
    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT 1 FROM doris_tables ${whereClause.replace(/asset_type/g, "'doris_table'").replace(/category/g, "'table'")}
        UNION ALL
        SELECT 1 FROM ds_workflows ${whereClause.replace(/asset_type/g, "'dolphinscheduler_workflow'").replace(/category/g, "'workflow'")}
        UNION ALL
        SELECT 1 FROM ds_tasks ${whereClause.replace(/asset_type/g, "'dolphinscheduler_task'").replace(/category/g, "'task'")}
      ) as combined
    `;
    
    const countParams = params.slice(0, -2); // 移除limit和offset参数
    const totalResult = await database.query(countSql, countParams);
    const total = totalResult[0]?.total || 0;
    
    res.json({
      success: true,
      data: assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取资产详情
router.get('/detail/:assetType/:assetId', async (req, res) => {
  try {
    const { assetType, assetId } = req.params;
    const database = require('../../config/database');
    
    let asset = null;
    let additionalInfo = {};
    
    switch (assetType) {
      case 'doris_table':
        const [dbName, tableName] = assetId.split('.');
        if (!tableName) {
          return res.status(400).json({
            success: false,
            error: '无效的表名格式'
          });
        }
        
        // 获取表基本信息
        const tableInfo = await database.query(`
          SELECT * FROM doris_tables 
          WHERE database_name = ? AND table_name = ?
        `, [dbName, tableName]);
        
        if (tableInfo.length > 0) {
          asset = tableInfo[0];
          
          // 获取列信息
          const columns = await database.query(`
            SELECT * FROM doris_columns 
            WHERE database_name = ? AND table_name = ?
            ORDER BY ordinal_position
          `, [dbName, tableName]);
          
          // 获取统计信息
          const stats = await database.query(`
            SELECT * FROM doris_table_stats 
            WHERE database_name = ? AND table_name = ?
          `, [dbName, tableName]);
          
          additionalInfo = {
            columns: columns,
            statistics: stats[0] || null
          };
        }
        break;
        
      case 'dolphinscheduler_workflow':
        const workflowInfo = await database.query(`
          SELECT * FROM ds_workflows WHERE workflow_code = ?
        `, [assetId]);
        
        if (workflowInfo.length > 0) {
          asset = workflowInfo[0];
          
          // 获取工作流中的任务
          const tasks = await database.query(`
            SELECT * FROM ds_tasks 
            WHERE project_code = ? 
            ORDER BY create_time
          `, [asset.project_code]);
          
          additionalInfo = {
            tasks: tasks
          };
        }
        break;
        
      case 'dolphinscheduler_task':
        const taskInfo = await database.query(`
          SELECT * FROM ds_tasks WHERE task_code = ?
        `, [assetId]);
        
        if (taskInfo.length > 0) {
          asset = taskInfo[0];
          
          // 获取SQL内容（如果是SQL任务）
          const sqlTask = await database.query(`
            SELECT * FROM ds_sql_tasks WHERE task_code = ?
          `, [assetId]);
          
          additionalInfo = {
            sqlContent: sqlTask[0]?.sql_content || null
          };
        }
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的资产类型'
        });
    }
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '资产不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...asset,
        asset_type: assetType,
        asset_id: assetId,
        additional_info: additionalInfo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 搜索数据资产
router.get('/search', async (req, res) => {
  try {
    const { keyword, type, limit = 50 } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }
    
    const results = await MetadataCollectorService.searchDataAssets(
      keyword,
      type,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: results,
      searchInfo: {
        keyword: keyword,
        type: type,
        resultCount: results.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取资产统计信息
router.get('/statistics', async (req, res) => {
  try {
    const overview = await MetadataCollectorService.getDataAssetOverview();
    
    const database = require('../../config/database');
    
    // 获取各类型资产数量
    const assetCounts = await database.query(`
      SELECT 
        'doris_table' as asset_type,
        COUNT(*) as count
      FROM doris_tables
      UNION ALL
      SELECT 
        'doris_database' as asset_type,
        COUNT(*) as count
      FROM doris_databases
      UNION ALL
      SELECT 
        'dolphinscheduler_project' as asset_type,
        COUNT(*) as count
      FROM ds_projects
      UNION ALL
      SELECT 
        'dolphinscheduler_workflow' as asset_type,
        COUNT(*) as count
      FROM ds_workflows
      UNION ALL
      SELECT 
        'dolphinscheduler_task' as asset_type,
        COUNT(*) as count
      FROM ds_tasks
    `);
    
    // 获取最近更新的资产
    const recentlyUpdated = await database.query(`
      (
        SELECT 
          'doris_table' as asset_type,
          CONCAT(database_name, '.', table_name) as asset_id,
          table_name as name,
          update_time
        FROM doris_tables
        ORDER BY update_time DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          'dolphinscheduler_workflow' as asset_type,
          workflow_code as asset_id,
          workflow_name as name,
          update_time
        FROM ds_workflows
        ORDER BY update_time DESC
        LIMIT 5
      )
      ORDER BY update_time DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        overview: overview,
        assetCounts: assetCounts.reduce((acc, item) => {
          acc[item.asset_type] = item.count;
          return acc;
        }, {}),
        recentlyUpdated: recentlyUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取资产依赖关系
router.get('/dependencies/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { direction = 'both', depth = 2 } = req.query;
    
    const lineageGraph = await MetadataCollectorService.getDataLineageGraph(
      assetId,
      direction,
      parseInt(depth)
    );
    
    res.json({
      success: true,
      data: {
        assetId: assetId,
        dependencies: lineageGraph,
        summary: {
          totalNodes: lineageGraph.nodes.length,
          totalEdges: lineageGraph.edges.length,
          direction: direction,
          maxDepth: depth
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 资产标签管理
router.post('/:assetId/tags', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: '标签必须是数组格式'
      });
    }
    
    const database = require('../../config/database');
    
    // 删除旧标签
    await database.query('DELETE FROM asset_tags WHERE asset_id = ?', [assetId]);
    
    // 添加新标签
    for (const tag of tags) {
      await database.query(`
        INSERT INTO asset_tags (asset_id, tag_name, create_time)
        VALUES (?, ?, NOW())
      `, [assetId, tag]);
    }
    
    res.json({
      success: true,
      message: '标签更新成功',
      data: { assetId, tags }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取资产标签
router.get('/:assetId/tags', async (req, res) => {
  try {
    const { assetId } = req.params;
    const database = require('../../config/database');
    
    const tags = await database.query(`
      SELECT tag_name, create_time 
      FROM asset_tags 
      WHERE asset_id = ?
      ORDER BY create_time DESC
    `, [assetId]);
    
    res.json({
      success: true,
      data: {
        assetId: assetId,
        tags: tags.map(t => t.tag_name),
        tagDetails: tags
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 按标签查找资产
router.get('/by-tag/:tagName', async (req, res) => {
  try {
    const { tagName } = req.params;
    const { limit = 50 } = req.query;
    
    const database = require('../../config/database');
    
    const assets = await database.query(`
      SELECT DISTINCT at.asset_id, at.tag_name, at.create_time as tag_create_time
      FROM asset_tags at
      WHERE at.tag_name = ?
      ORDER BY at.create_time DESC
      LIMIT ?
    `, [tagName, parseInt(limit)]);
    
    res.json({
      success: true,
      data: {
        tagName: tagName,
        assets: assets,
        count: assets.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取所有标签
router.get('/tags/all', async (req, res) => {
  try {
    const database = require('../../config/database');
    
    const tags = await database.query(`
      SELECT 
        tag_name,
        COUNT(*) as usage_count,
        MIN(create_time) as first_used,
        MAX(create_time) as last_used
      FROM asset_tags
      GROUP BY tag_name
      ORDER BY usage_count DESC, tag_name
    `);
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;