const axios = require('axios');
const database = require('../../config/database');

class DolphinSchedulerService {
  constructor() {
    this.baseURL = process.env.DOLPHINSCHEDULER_URL || 'http://localhost:12345';
    this.token = null;
    this.projectCode = process.env.DOLPHINSCHEDULER_PROJECT_CODE || '';
  }

  // 登录获取Token
  async login() {
    try {
      const response = await axios.post(`${this.baseURL}/dolphinscheduler/login`, {
        userName: process.env.DOLPHINSCHEDULER_USER || 'admin',
        userPassword: process.env.DOLPHINSCHEDULER_PASSWORD || 'dolphinscheduler123'
      });
      
      if (response.data.success) {
        this.token = response.data.data.token;
        console.log('DolphinScheduler登录成功');
        return this.token;
      } else {
        throw new Error(`登录失败: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('DolphinScheduler登录失败:', error.message);
      throw error;
    }
  }

  // 确保已认证
  async ensureAuthenticated() {
    if (!this.token) {
      await this.login();
    }
  }

  // 获取项目列表
  async getProjects() {
    await this.ensureAuthenticated();
    try {
      const response = await axios.get(`${this.baseURL}/dolphinscheduler/projects`, {
        headers: { 'token': this.token }
      });
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('获取项目列表失败:', error.message);
      return [];
    }
  }

  // 获取工作流定义列表
  async getProcessDefinitions(projectCode = null) {
    await this.ensureAuthenticated();
    const code = projectCode || this.projectCode;
    
    try {
      const response = await axios.get(
        `${this.baseURL}/dolphinscheduler/projects/${code}/process-definition`,
        {
          headers: { 'token': this.token },
          params: { pageSize: 1000, pageNo: 1 }
        }
      );
      return response.data.success ? response.data.data.totalList : [];
    } catch (error) {
      console.error('获取工作流定义失败:', error.message);
      return [];
    }
  }

  // 获取工作流详细信息
  async getProcessDefinitionDetail(projectCode, processDefinitionCode) {
    await this.ensureAuthenticated();
    
    try {
      const response = await axios.get(
        `${this.baseURL}/dolphinscheduler/projects/${projectCode}/process-definition/${processDefinitionCode}`,
        { headers: { 'token': this.token } }
      );
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('获取工作流详情失败:', error.message);
      return null;
    }
  }

  // 获取任务定义列表
  async getTaskDefinitions(projectCode = null) {
    await this.ensureAuthenticated();
    const code = projectCode || this.projectCode;
    
    try {
      const response = await axios.get(
        `${this.baseURL}/dolphinscheduler/projects/${code}/task-definition`,
        {
          headers: { 'token': this.token },
          params: { pageSize: 1000, pageNo: 1 }
        }
      );
      return response.data.success ? response.data.data.totalList : [];
    } catch (error) {
      console.error('获取任务定义失败:', error.message);
      return [];
    }
  }

  // 获取工作流实例列表
  async getProcessInstances(projectCode = null, startDate = null, endDate = null) {
    await this.ensureAuthenticated();
    const code = projectCode || this.projectCode;
    
    try {
      const params = {
        pageSize: 1000,
        pageNo: 1
      };
      
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await axios.get(
        `${this.baseURL}/dolphinscheduler/projects/${code}/process-instances`,
        {
          headers: { 'token': this.token },
          params
        }
      );
      return response.data.success ? response.data.data.totalList : [];
    } catch (error) {
      console.error('获取工作流实例失败:', error.message);
      return [];
    }
  }

  // 获取任务实例列表
  async getTaskInstances(projectCode, processInstanceId) {
    await this.ensureAuthenticated();
    
    try {
      const response = await axios.get(
        `${this.baseURL}/dolphinscheduler/projects/${projectCode}/process-instances/${processInstanceId}/tasks`,
        { headers: { 'token': this.token } }
      );
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('获取任务实例失败:', error.message);
      return [];
    }
  }

  // 解析工作流中的SQL任务，提取数据血缘
  async extractSQLFromWorkflow(projectCode, processDefinitionCode) {
    const detail = await this.getProcessDefinitionDetail(projectCode, processDefinitionCode);
    if (!detail || !detail.processDefinitionJson) return [];
    
    try {
      const workflow = JSON.parse(detail.processDefinitionJson);
      const sqlTasks = [];
      
      if (workflow.tasks) {
        for (const task of workflow.tasks) {
          if (task.type === 'SQL' && task.params && task.params.sql) {
            sqlTasks.push({
              taskCode: task.code,
              taskName: task.name,
              sql: task.params.sql,
              datasource: task.params.datasource,
              type: task.params.type
            });
          }
        }
      }
      
      return sqlTasks;
    } catch (error) {
      console.error('解析工作流SQL失败:', error.message);
      return [];
    }
  }

  // 同步DolphinScheduler元数据到本地数据库
  async syncMetadata() {
    try {
      console.log('开始同步DolphinScheduler元数据...');
      
      // 获取项目信息
      const projects = await this.getProjects();
      
      for (const project of projects) {
        // 同步项目信息
        await this.saveProjectInfo(project);
        
        // 获取并同步工作流定义
        const workflows = await this.getProcessDefinitions(project.code);
        for (const workflow of workflows) {
          await this.saveWorkflowInfo(project.code, workflow);
          
          // 提取SQL任务
          const sqlTasks = await this.extractSQLFromWorkflow(project.code, workflow.code);
          for (const sqlTask of sqlTasks) {
            await this.saveSQLTaskInfo(project.code, workflow.code, sqlTask);
          }
        }
        
        // 获取并同步任务定义
        const tasks = await this.getTaskDefinitions(project.code);
        for (const task of tasks) {
          await this.saveTaskInfo(project.code, task);
        }
      }
      
      console.log('DolphinScheduler元数据同步完成');
    } catch (error) {
      console.error('同步元数据失败:', error.message);
      throw error;
    }
  }

  // 保存项目信息到数据库
  async saveProjectInfo(project) {
    const sql = `
      INSERT INTO ds_projects (
        project_code, project_name, description, user_id, 
        flag, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        project_name = VALUES(project_name),
        description = VALUES(description),
        update_time = VALUES(update_time)
    `;
    
    await database.query(sql, [
      project.code,
      project.name,
      project.description,
      project.userId,
      project.flag,
      project.createTime,
      project.updateTime
    ]);
  }

  // 保存工作流信息到数据库
  async saveWorkflowInfo(projectCode, workflow) {
    const sql = `
      INSERT INTO ds_workflows (
        project_code, workflow_code, workflow_name, description,
        user_id, flag, create_time, update_time, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        workflow_name = VALUES(workflow_name),
        description = VALUES(description),
        update_time = VALUES(update_time),
        version = VALUES(version)
    `;
    
    await database.query(sql, [
      projectCode,
      workflow.code,
      workflow.name,
      workflow.description,
      workflow.userId,
      workflow.flag,
      workflow.createTime,
      workflow.updateTime,
      workflow.version
    ]);
  }

  // 保存SQL任务信息到数据库
  async saveSQLTaskInfo(projectCode, workflowCode, sqlTask) {
    const sql = `
      INSERT INTO ds_sql_tasks (
        project_code, workflow_code, task_code, task_name,
        sql_content, datasource, task_type, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        task_name = VALUES(task_name),
        sql_content = VALUES(sql_content),
        datasource = VALUES(datasource)
    `;
    
    await database.query(sql, [
      projectCode,
      workflowCode,
      sqlTask.taskCode,
      sqlTask.taskName,
      sqlTask.sql,
      sqlTask.datasource,
      sqlTask.type
    ]);
  }

  // 保存任务信息到数据库
  async saveTaskInfo(projectCode, task) {
    const sql = `
      INSERT INTO ds_tasks (
        project_code, task_code, task_name, description,
        task_type, user_id, flag, create_time, update_time, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        task_name = VALUES(task_name),
        description = VALUES(description),
        task_type = VALUES(task_type),
        update_time = VALUES(update_time),
        version = VALUES(version)
    `;
    
    await database.query(sql, [
      projectCode,
      task.code,
      task.name,
      task.description,
      task.taskType,
      task.userId,
      task.flag,
      task.createTime,
      task.updateTime,
      task.version
    ]);
  }

  // 获取工作流执行状态统计
  async getWorkflowExecutionStats(projectCode = null, days = 7) {
    const code = projectCode || this.projectCode;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const instances = await this.getProcessInstances(code, startDate, endDate);
    
    const stats = {
      total: instances.length,
      success: 0,
      failed: 0,
      running: 0,
      pending: 0
    };
    
    instances.forEach(instance => {
      switch(instance.state) {
        case 'SUCCESS':
          stats.success++;
          break;
        case 'FAILURE':
          stats.failed++;
          break;
        case 'RUNNING_EXECUTION':
          stats.running++;
          break;
        default:
          stats.pending++;
      }
    });
    
    return stats;
  }
}

module.exports = new DolphinSchedulerService();