/**
 * 完整的流程服务
 * 集成实时保存、版本管理、离线编辑等生产级功能
 */

import { message } from 'antd';
import { processApi } from './processApi';
import { ProcessImportExport } from '../utils/processImportExport';
import type { 
  ProcessDefinition, 
  CreateProcessRequest, 
  UpdateProcessRequest,
  BackendProcessDefinitionData 
} from '../types/process';

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // milliseconds
  maxRetries: number;
  retryDelay: number;
}

export interface ProcessServiceConfig {
  autoSave: AutoSaveConfig;
  offlineMode: boolean;
  versionControl: boolean;
  conflictResolution: 'auto' | 'manual' | 'latest';
}

export class ProcessService {
  private config: ProcessServiceConfig;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private pendingChanges: Map<number, BackendProcessDefinitionData> = new Map();
  private lastSavedVersions: Map<number, string> = new Map();

  constructor(config: Partial<ProcessServiceConfig> = {}) {
    this.config = {
      autoSave: {
        enabled: true,
        interval: 5000,
        maxRetries: 3,
        retryDelay: 1000,
        ...config.autoSave,
      },
      offlineMode: false,
      versionControl: true,
      conflictResolution: 'manual',
      ...config,
    };
  }

  /**
   * 创建流程
   */
  async createProcess(request: CreateProcessRequest): Promise<ProcessDefinition> {
    try {
      const process = await processApi.createProcess(request);
      message.success('流程创建成功');
      return process;
    } catch (error: any) {
      message.error(`创建流程失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取流程详情
   */
  async getProcess(id: number): Promise<ProcessDefinition> {
    try {
      const process = await processApi.getProcess(id);
      
      // Store version for conflict detection
      if (this.config.versionControl) {
        this.lastSavedVersions.set(id, process.updated_at);
      }
      
      return process;
    } catch (error: any) {
      message.error(`获取流程失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新流程（支持实时保存）
   */
  async updateProcess(
    id: number, 
    request: UpdateProcessRequest,
    options: { silent?: boolean; force?: boolean } = {}
  ): Promise<ProcessDefinition> {
    try {
      // Check for conflicts if version control is enabled
      if (this.config.versionControl && !options.force) {
        const currentProcess = await processApi.getProcess(id);
        const lastSavedVersion = this.lastSavedVersions.get(id);
        
        if (lastSavedVersion && currentProcess.updated_at !== lastSavedVersion) {
          if (this.config.conflictResolution === 'manual') {
            throw new Error('流程已被其他用户修改，请刷新后重试');
          } else if (this.config.conflictResolution === 'latest') {
            // Use latest version
            this.lastSavedVersions.set(id, currentProcess.updated_at);
          }
        }
      }

      const process = await processApi.updateProcess(id, request);
      
      // Update version tracking
      if (this.config.versionControl) {
        this.lastSavedVersions.set(id, process.updated_at);
      }
      
      // Clear pending changes
      this.pendingChanges.delete(id);
      
      if (!options.silent) {
        message.success('流程保存成功');
      }
      
      return process;
    } catch (error: any) {
      if (!options.silent) {
        message.error(`保存流程失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 启动自动保存
   */
  startAutoSave(
    processId: number,
    getDefinition: () => BackendProcessDefinitionData,
    getMetadata: () => UpdateProcessRequest
  ): void {
    if (!this.config.autoSave.enabled) return;

    this.stopAutoSave(); // Clear existing timer

    this.autoSaveTimer = setInterval(async () => {
      try {
        const currentDefinition = getDefinition();
        const pendingDefinition = this.pendingChanges.get(processId);
        
        // Check if there are changes
        if (pendingDefinition && 
            JSON.stringify(currentDefinition) !== JSON.stringify(pendingDefinition)) {
          
          const metadata = getMetadata();
          const request: UpdateProcessRequest = {
            ...metadata,
            definition: currentDefinition,
          };

          await this.updateProcess(processId, request, { silent: true });
          this.pendingChanges.set(processId, currentDefinition);
        }
      } catch (error) {
        console.warn('自动保存失败:', error);
        // Optionally show a subtle notification
      }
    }, this.config.autoSave.interval);
  }

  /**
   * 停止自动保存
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 标记变更（用于自动保存）
   */
  markChanged(processId: number, definition: BackendProcessDefinitionData): void {
    this.pendingChanges.set(processId, definition);
  }

  /**
   * 检查是否有未保存的变更
   */
  hasUnsavedChanges(processId: number): boolean {
    return this.pendingChanges.has(processId);
  }

  /**
   * 导出流程
   */
  async exportProcess(
    process: ProcessDefinition,
    format: 'json' | 'xml' | 'bpmn' | 'csv' = 'json'
  ): Promise<void> {
    try {
      let content: string;
      let filename: string;
      let contentType: string;

      switch (format) {
        case 'json':
          content = ProcessImportExport.exportToJSON(process.definition, process);
          filename = `${process.key}_v${process.version}.json`;
          contentType = 'application/json';
          break;
        
        case 'xml':
          content = ProcessImportExport.exportToXML(process.definition, process);
          filename = `${process.key}_v${process.version}.xml`;
          contentType = 'application/xml';
          break;
        
        case 'bpmn':
          content = ProcessImportExport.exportToBPMN(process.definition, process);
          filename = `${process.key}_v${process.version}.bpmn`;
          contentType = 'application/xml';
          break;
        
        case 'csv':
          content = ProcessImportExport.exportToCSV(process.definition);
          filename = `${process.key}_nodes_v${process.version}.csv`;
          contentType = 'text/csv';
          break;
        
        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }

      ProcessImportExport.downloadFile(content, filename, contentType);
      message.success(`流程已导出为 ${format.toUpperCase()} 格式`);
    } catch (error: any) {
      message.error(`导出失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 导入流程
   */
  async importProcess(
    file: File,
    options: { 
      autoCorrect?: boolean; 
      validateOnImport?: boolean;
      createNew?: boolean;
    } = {}
  ): Promise<ProcessDefinition | BackendProcessDefinitionData> {
    try {
      const content = await ProcessImportExport.readFile(file);
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      let importResult;
      
      switch (fileExtension) {
        case 'json':
          importResult = ProcessImportExport.importFromJSON(content, {
            autoCorrect: options.autoCorrect,
            validateOnImport: options.validateOnImport,
          });
          break;
        
        case 'xml':
          importResult = ProcessImportExport.importFromXML(content, {
            autoCorrect: options.autoCorrect,
            validateOnImport: options.validateOnImport,
          });
          break;
        
        default:
          throw new Error(`不支持的文件格式: ${fileExtension}`);
      }

      if (!importResult.success) {
        const errorMsg = importResult.errors.join('; ');
        throw new Error(errorMsg);
      }

      if (importResult.warnings.length > 0) {
        message.warning(`导入成功，但有 ${importResult.warnings.length} 个警告`);
      } else {
        message.success('流程导入成功');
      }

      if (options.createNew && importResult.definition) {
        // Create new process from imported definition
        const createRequest: CreateProcessRequest = {
          key: `imported_${Date.now()}`,
          name: `导入的流程 - ${file.name}`,
          description: `从文件 ${file.name} 导入的流程`,
          category: 'imported',
          definition: importResult.definition,
        };
        
        return await this.createProcess(createRequest);
      }

      return importResult.definition!;
    } catch (error: any) {
      message.error(`导入失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 复制流程
   */
  async copyProcess(id: number): Promise<ProcessDefinition> {
    try {
      const process = await processApi.copyProcess(id);
      message.success('流程复制成功');
      return process;
    } catch (error: any) {
      message.error(`复制流程失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除流程
   */
  async deleteProcess(id: number): Promise<void> {
    try {
      await processApi.deleteProcess(id);
      
      // Clean up local state
      this.pendingChanges.delete(id);
      this.lastSavedVersions.delete(id);
      
      message.success('流程删除成功');
    } catch (error: any) {
      message.error(`删除流程失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取流程列表
   */
  async getProcessList(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
  }) {
    try {
      return await processApi.getProcesses({
        page: params?.page || 1,
        page_size: params?.pageSize || 20,
        search: params?.search,
        category: params?.category,
        status: params?.status,
      });
    } catch (error: any) {
      message.error(`获取流程列表失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取流程统计
   */
  async getProcessStats() {
    try {
      return await processApi.getProcessStats();
    } catch (error: any) {
      message.error(`获取流程统计失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopAutoSave();
    this.pendingChanges.clear();
    this.lastSavedVersions.clear();
  }
}

// 创建默认实例
export const processService = new ProcessService();

// 默认导出
export default processService;
