#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SQL血缘分析服务
基于SQLLineage实现企业级SQL血缘解析
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sqllineage.runner import LineageRunner
import logging
import traceback
import re
from typing import Dict, List, Set, Any

app = Flask(__name__)
CORS(app)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AdvancedLineageAnalyzer:
    """高级SQL血缘分析器"""
    
    def __init__(self):
        self.doris_keywords = {
            'insert', 'select', 'update', 'delete', 'create', 'drop', 
            'alter', 'with', 'union', 'join', 'from', 'where'
        }
    
    def analyze_sql(self, sql: str) -> Dict[str, Any]:
        """
        分析SQL血缘关系
        
        Args:
            sql: SQL语句
            
        Returns:
            血缘分析结果
        """
        try:
            # 预处理SQL - 处理Doris特有语法
            processed_sql = self._preprocess_doris_sql(sql)
            
            # 使用SQLLineage进行解析
            result = LineageRunner(processed_sql)
            
            # 提取基本血缘信息
            lineage_data = {
                'source_tables': [self._normalize_table_name(str(t)) for t in result.source_tables],
                'target_tables': [self._normalize_table_name(str(t)) for t in result.target_tables],
                'intermediate_tables': [self._normalize_table_name(str(t)) for t in result.intermediate_tables],
                'cte_tables': [],
                'column_lineage': [],
                'sql_type': self._detect_sql_type(sql),
                'complexity_score': self._calculate_complexity(sql)
            }
            
            # 提取CTE信息
            lineage_data['cte_tables'] = self._extract_cte_tables(sql)
            
            # 尝试提取列级血缘
            try:
                if hasattr(result, 'get_column_lineage'):
                    column_lineage = result.get_column_lineage()
                    lineage_data['column_lineage'] = self._format_column_lineage(column_lineage)
            except Exception as e:
                logger.warning(f"列级血缘提取失败: {e}")
                lineage_data['column_lineage'] = []
            
            # 构建血缘关系
            lineage_data['relations'] = self._build_lineage_relations(lineage_data)
            
            # 计算统计信息
            lineage_data['statistics'] = {
                'source_count': len(lineage_data['source_tables']),
                'target_count': len(lineage_data['target_tables']),
                'relation_count': len(lineage_data['relations']),
                'cte_count': len(lineage_data['cte_tables'])
            }
            
            return {
                'success': True,
                'data': lineage_data,
                'message': '血缘分析成功'
            }
            
        except Exception as e:
            logger.error(f"SQL血缘分析失败: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e),
                'message': '血缘分析失败，可能是SQL语法复杂或不支持'
            }
    
    def _preprocess_doris_sql(self, sql: str) -> str:
        """预处理Doris SQL语法"""
        # 移除Doris特有的WITH LABEL语法
        sql = re.sub(r'WITH\s+LABEL\s+\w+', '', sql, flags=re.IGNORECASE)
        
        # 处理Doris的分区语法
        sql = re.sub(r'PARTITION\s*\([^)]+\)', '', sql, flags=re.IGNORECASE)
        
        # 处理group_concat函数（MySQL/Doris特有）
        sql = re.sub(r'group_concat\s*\([^)]+\)', 'GROUP_CONCAT_PLACEHOLDER', sql, flags=re.IGNORECASE)
        
        return sql.strip()
    
    def _normalize_table_name(self, table_name: str) -> str:
        """标准化表名"""
        # 移除引号
        table_name = table_name.strip('"\'`')
        
        # 确保包含schema
        if '.' not in table_name and table_name:
            return f"default.{table_name}"
        
        return table_name
    
    def _detect_sql_type(self, sql: str) -> str:
        """检测SQL类型"""
        sql_upper = sql.upper().strip()
        
        if sql_upper.startswith('INSERT'):
            return 'INSERT'
        elif sql_upper.startswith('CREATE TABLE') and 'AS SELECT' in sql_upper:
            return 'CREATE_TABLE_AS_SELECT'
        elif sql_upper.startswith('CREATE'):
            return 'CREATE'
        elif sql_upper.startswith('UPDATE'):
            return 'UPDATE'
        elif sql_upper.startswith('DELETE'):
            return 'DELETE'
        elif sql_upper.startswith('SELECT') or sql_upper.startswith('WITH'):
            return 'SELECT'
        elif sql_upper.startswith('MERGE'):
            return 'MERGE'
        else:
            return 'UNKNOWN'
    
    def _calculate_complexity(self, sql: str) -> int:
        """计算SQL复杂度评分 (0-100)"""
        score = 0
        sql_upper = sql.upper()
        
        # CTE数量
        cte_count = len(re.findall(r'\bWITH\b.*?\bAS\s*\(', sql_upper))
        score += min(cte_count * 10, 30)
        
        # JOIN数量
        join_count = len(re.findall(r'\b(?:LEFT|RIGHT|INNER|FULL|OUTER)?\s*JOIN\b', sql_upper))
        score += min(join_count * 5, 20)
        
        # 子查询数量
        subquery_count = sql_upper.count('(SELECT')
        score += min(subquery_count * 5, 20)
        
        # 窗口函数
        window_functions = len(re.findall(r'\b\w+\s*\(\s*.*?\s*\)\s+OVER\s*\(', sql_upper))
        score += min(window_functions * 5, 15)
        
        # 聚合函数
        aggregate_functions = len(re.findall(r'\b(?:SUM|COUNT|MAX|MIN|AVG|GROUP_CONCAT)\s*\(', sql_upper))
        score += min(aggregate_functions * 2, 10)
        
        # SQL长度
        if len(sql) > 5000:
            score += 5
        
        return min(score, 100)
    
    def _extract_cte_tables(self, sql: str) -> List[str]:
        """提取CTE表名"""
        cte_tables = []
        
        # 匹配WITH子句中的CTE表名
        cte_pattern = r'\b(\w+)\s+AS\s*\('
        matches = re.findall(cte_pattern, sql, re.IGNORECASE)
        
        for match in matches:
            if match.lower() not in ['with', 'as', 'select']:
                cte_tables.append(match)
        
        return cte_tables
    
    def _format_column_lineage(self, column_lineage) -> List[Dict]:
        """格式化列级血缘"""
        formatted = []
        
        try:
            for lineage in column_lineage:
                formatted.append({
                    'source_column': str(lineage.source),
                    'target_column': str(lineage.target),
                    'transform': getattr(lineage, 'transform', None)
                })
        except Exception as e:
            logger.warning(f"列级血缘格式化失败: {e}")
        
        return formatted
    
    def _build_lineage_relations(self, lineage_data: Dict) -> List[Dict]:
        """构建血缘关系"""
        relations = []
        
        # 源表到目标表的关系
        for source in lineage_data['source_tables']:
            for target in lineage_data['target_tables']:
                relations.append({
                    'source': source,
                    'target': target,
                    'type': 'TABLE_TO_TABLE',
                    'description': f'数据从 {source} 流向 {target}'
                })
        
        # CTE表关系
        for cte in lineage_data['cte_tables']:
            relations.append({
                'source': 'CTE',
                'target': cte,
                'type': 'CTE_DEFINITION',
                'description': f'临时表 {cte} 的定义'
            })
        
        return relations

# 全局分析器实例
analyzer = AdvancedLineageAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'service': 'SQL血缘分析服务',
        'version': '1.0.0'
    })

@app.route('/analyze', methods=['POST'])
def analyze_sql():
    """分析SQL血缘关系"""
    try:
        data = request.get_json()
        
        if not data or 'sql' not in data:
            return jsonify({
                'success': False,
                'message': '请提供SQL语句'
            }), 400
        
        sql = data['sql'].strip()
        if not sql:
            return jsonify({
                'success': False,
                'message': 'SQL语句不能为空'
            }), 400
        
        # 分析SQL
        result = analyzer.analyze_sql(sql)
        
        if result['success']:
            logger.info(f"SQL血缘分析成功，源表数: {result['data']['statistics']['source_count']}")
            return jsonify(result)
        else:
            logger.error(f"SQL血缘分析失败: {result.get('error', 'Unknown error')}")
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"请求处理失败: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': '服务内部错误'
        }), 500

@app.route('/batch-analyze', methods=['POST'])
def batch_analyze():
    """批量分析SQL"""
    try:
        data = request.get_json()
        
        if not data or 'sqls' not in data:
            return jsonify({
                'success': False,
                'message': '请提供SQL列表'
            }), 400
        
        sqls = data['sqls']
        if not isinstance(sqls, list):
            return jsonify({
                'success': False,
                'message': 'SQL列表格式错误'
            }), 400
        
        results = []
        for i, sql in enumerate(sqls):
            try:
                result = analyzer.analyze_sql(sql)
                results.append({
                    'index': i,
                    'sql': sql[:100] + '...' if len(sql) > 100 else sql,
                    'result': result
                })
            except Exception as e:
                results.append({
                    'index': i,
                    'sql': sql[:100] + '...' if len(sql) > 100 else sql,
                    'result': {
                        'success': False,
                        'error': str(e)
                    }
                })
        
        return jsonify({
            'success': True,
            'data': results,
            'total': len(results),
            'success_count': sum(1 for r in results if r['result']['success'])
        })
        
    except Exception as e:
        logger.error(f"批量分析失败: {e}")
        return jsonify({
            'success': False,
            'message': '批量分析失败'
        }), 500

@app.route('/complexity', methods=['POST'])
def analyze_complexity():
    """分析SQL复杂度"""
    try:
        data = request.get_json()
        
        if not data or 'sql' not in data:
            return jsonify({
                'success': False,
                'message': '请提供SQL语句'
            }), 400
        
        sql = data['sql'].strip()
        complexity_score = analyzer._calculate_complexity(sql)
        sql_type = analyzer._detect_sql_type(sql)
        cte_tables = analyzer._extract_cte_tables(sql)
        
        # 复杂度等级
        if complexity_score >= 80:
            complexity_level = '极高'
        elif complexity_score >= 60:
            complexity_level = '高'
        elif complexity_score >= 40:
            complexity_level = '中等'
        elif complexity_score >= 20:
            complexity_level = '低'
        else:
            complexity_level = '简单'
        
        return jsonify({
            'success': True,
            'data': {
                'complexity_score': complexity_score,
                'complexity_level': complexity_level,
                'sql_type': sql_type,
                'cte_count': len(cte_tables),
                'cte_tables': cte_tables,
                'recommendation': (
                    'SQLLineage' if complexity_score >= 40 
                    else 'node-sql-parser'
                )
            }
        })
        
    except Exception as e:
        logger.error(f"复杂度分析失败: {e}")
        return jsonify({
            'success': False,
            'message': '复杂度分析失败'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)