/**
 * 流程导入导出工具
 * 支持多种格式的流程定义导入导出功能
 */

import type { 
  BackendProcessDefinitionData,
  ProcessDefinition 
} from '../types/process';

export interface ExportOptions {
  format: 'json' | 'xml' | 'bpmn' | 'csv';
  minify?: boolean;
  includeMetadata?: boolean;
  includeValidation?: boolean;
}

export interface ImportOptions {
  format: 'json' | 'xml' | 'bpmn';
  validateOnImport?: boolean;
  mergeMode?: 'replace' | 'merge' | 'append';
  autoCorrect?: boolean;
}

export interface ImportResult {
  success: boolean;
  definition?: BackendProcessDefinitionData;
  warnings: string[];
  errors: string[];
  metadata?: {
    originalFormat: string;
    nodeCount: number;
    edgeCount: number;
    version?: string;
  };
}

export class ProcessImportExport {
  /**
   * 导出流程定义为JSON格式
   */
  static exportToJSON(
    definition: BackendProcessDefinitionData, 
    metadata?: Partial<ProcessDefinition>,
    options: Partial<ExportOptions> = {}
  ): string {
    const exportData = {
      version: '1.0.0',
      format: 'miniflow-json',
      timestamp: new Date().toISOString(),
      metadata: options.includeMetadata ? {
        name: metadata?.name,
        description: metadata?.description,
        category: metadata?.category,
        created_by: metadata?.created_by,
        version: metadata?.version,
      } : undefined,
      definition,
      validation: options.includeValidation ? 
        this.validateDefinition(definition) : undefined,
    };

    return options.minify ? 
      JSON.stringify(exportData) : 
      JSON.stringify(exportData, null, 2);
  }

  /**
   * 导出流程定义为XML格式
   */
  static exportToXML(
    definition: BackendProcessDefinitionData,
    metadata?: Partial<ProcessDefinition>
  ): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const processXml = `
<process id="${metadata?.key || 'process'}" name="${metadata?.name || 'Unnamed Process'}">
  <metadata>
    <description>${metadata?.description || ''}</description>
    <category>${metadata?.category || ''}</category>
    <version>${metadata?.version || 1}</version>
    <created>${new Date().toISOString()}</created>
  </metadata>
  
  <nodes>
    ${definition.nodes.map(node => `
    <node id="${node.id}" type="${node.type}" name="${node.name}">
      <position x="${node.x}" y="${node.y}" />
      ${node.props ? `<properties>${JSON.stringify(node.props)}</properties>` : ''}
    </node>`).join('')}
  </nodes>
  
  <flows>
    ${definition.flows.map(flow => `
    <flow id="${flow.id}" from="${flow.from}" to="${flow.to}">
      ${flow.condition ? `<condition>${flow.condition}</condition>` : ''}
      ${flow.label ? `<label>${flow.label}</label>` : ''}
    </flow>`).join('')}
  </flows>
</process>`;

    return xmlHeader + processXml;
  }

  /**
   * 导出流程定义为BPMN格式
   */
  static exportToBPMN(
    definition: BackendProcessDefinitionData,
    metadata?: Partial<ProcessDefinition>
  ): string {
    const bpmnHeader = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  targetNamespace="http://miniflow.com/bpmn">`;

    const processId = metadata?.key || 'process';
    
    const bpmnProcess = `
  <bpmn:process id="${processId}" name="${metadata?.name || 'Process'}" isExecutable="true">
    ${definition.nodes.map(node => {
      switch (node.type) {
        case 'start':
          return `<bpmn:startEvent id="${node.id}" name="${node.name}" />`;
        case 'end':
          return `<bpmn:endEvent id="${node.id}" name="${node.name}" />`;
        case 'userTask':
          return `<bpmn:userTask id="${node.id}" name="${node.name}"${node.props?.assignee ? ` assignee="${node.props.assignee}"` : ''} />`;
        case 'serviceTask':
          return `<bpmn:serviceTask id="${node.id}" name="${node.name}" />`;
        case 'gateway':
          return `<bpmn:exclusiveGateway id="${node.id}" name="${node.name}" />`;
        default:
          return `<bpmn:task id="${node.id}" name="${node.name}" />`;
      }
    }).join('')}
    
    ${definition.flows.map(flow => 
      `<bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.from}" targetRef="${flow.to}"${flow.condition ? ` conditionExpression="${flow.condition}"` : ''} />`
    ).join('')}
  </bpmn:process>`;

    const bpmnDiagram = `
  <bpmndi:BPMNDiagram>
    <bpmndi:BPMNPlane bpmnElement="${processId}">
      ${definition.nodes.map(node => `
      <bpmndi:BPMNShape bpmnElement="${node.id}">
        <dc:Bounds x="${node.x}" y="${node.y}" width="100" height="80" />
      </bpmndi:BPMNShape>`).join('')}
      
      ${definition.flows.map(flow => {
        const fromNode = definition.nodes.find(n => n.id === flow.from);
        const toNode = definition.nodes.find(n => n.id === flow.to);
        return fromNode && toNode ? `
      <bpmndi:BPMNEdge bpmnElement="${flow.id}">
        <di:waypoint x="${fromNode.x + 100}" y="${fromNode.y + 40}" />
        <di:waypoint x="${toNode.x}" y="${toNode.y + 40}" />
      </bpmndi:BPMNEdge>` : '';
      }).join('')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>`;

    return bpmnHeader + bpmnProcess + bpmnDiagram + '\n</bpmn:definitions>';
  }

  /**
   * 导出流程定义为CSV格式（节点列表）
   */
  static exportToCSV(definition: BackendProcessDefinitionData): string {
    const headers = ['ID', 'Type', 'Name', 'X', 'Y', 'Properties'];
    const nodeRows = definition.nodes.map(node => [
      node.id,
      node.type,
      node.name,
      node.x.toString(),
      node.y.toString(),
      JSON.stringify(node.props || {})
    ]);

    const csvContent = [
      headers.join(','),
      ...nodeRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * 从JSON格式导入流程定义
   */
  static importFromJSON(jsonString: string, options: ImportOptions = {}): ImportResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const data = JSON.parse(jsonString);
      
      // Validate JSON structure
      if (!data.definition) {
        errors.push('JSON格式错误：缺少definition字段');
        return { success: false, warnings, errors };
      }

      const definition = data.definition as BackendProcessDefinitionData;

      // Validate definition structure
      if (!definition.nodes || !Array.isArray(definition.nodes)) {
        errors.push('流程定义错误：nodes字段必须是数组');
        return { success: false, warnings, errors };
      }

      if (!definition.flows || !Array.isArray(definition.flows)) {
        errors.push('流程定义错误：flows字段必须是数组');
        return { success: false, warnings, errors };
      }

      // Validate and auto-correct if enabled
      const validatedDefinition = options.autoCorrect ? 
        this.autoCorrectDefinition(definition, warnings) : definition;

      // Perform validation if requested
      if (options.validateOnImport) {
        const validation = this.validateDefinition(validatedDefinition);
        if (!validation.isValid) {
          warnings.push(...validation.warnings);
          if (validation.errors.length > 0) {
            errors.push(...validation.errors);
          }
        }
      }

      return {
        success: true,
        definition: validatedDefinition,
        warnings,
        errors,
        metadata: {
          originalFormat: data.format || 'unknown',
          nodeCount: validatedDefinition.nodes.length,
          edgeCount: validatedDefinition.flows.length,
          version: data.version,
        }
      };

    } catch (error) {
      errors.push(`JSON解析错误: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, warnings, errors };
    }
  }

  /**
   * 从XML格式导入流程定义
   */
  static importFromXML(xmlString: string, options: ImportOptions = {}): ImportResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Simple XML parsing (in production, use a proper XML parser)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        errors.push('XML格式错误：无法解析XML文档');
        return { success: false, warnings, errors };
      }

      const processElement = xmlDoc.querySelector('process');
      if (!processElement) {
        errors.push('XML格式错误：缺少process元素');
        return { success: false, warnings, errors };
      }

      // Parse nodes
      const nodeElements = xmlDoc.querySelectorAll('node');
      const nodes = Array.from(nodeElements).map(nodeEl => {
        const positionEl = nodeEl.querySelector('position');
        const propertiesEl = nodeEl.querySelector('properties');
        
        return {
          id: nodeEl.getAttribute('id') || '',
          type: nodeEl.getAttribute('type') || 'userTask',
          name: nodeEl.getAttribute('name') || '',
          x: parseFloat(positionEl?.getAttribute('x') || '0'),
          y: parseFloat(positionEl?.getAttribute('y') || '0'),
          props: propertiesEl ? JSON.parse(propertiesEl.textContent || '{}') : {}
        };
      });

      // Parse flows
      const flowElements = xmlDoc.querySelectorAll('flow');
      const flows = Array.from(flowElements).map(flowEl => ({
        id: flowEl.getAttribute('id') || '',
        from: flowEl.getAttribute('from') || '',
        to: flowEl.getAttribute('to') || '',
        condition: flowEl.querySelector('condition')?.textContent || '',
        label: flowEl.querySelector('label')?.textContent || '',
      }));

      const definition: BackendProcessDefinitionData = { nodes, flows };

      return {
        success: true,
        definition,
        warnings,
        errors,
        metadata: {
          originalFormat: 'xml',
          nodeCount: nodes.length,
          edgeCount: flows.length,
        }
      };

    } catch (error) {
      errors.push(`XML解析错误: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, warnings, errors };
    }
  }

  /**
   * 验证流程定义
   */
  private static validateDefinition(definition: BackendProcessDefinitionData) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for start nodes
    const startNodes = definition.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('流程必须包含一个开始节点');
    } else if (startNodes.length > 1) {
      errors.push('流程只能包含一个开始节点');
    }

    // Check for end nodes
    const endNodes = definition.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      warnings.push('建议添加至少一个结束节点');
    }

    // Check node connections
    definition.nodes.forEach(node => {
      const incomingFlows = definition.flows.filter(f => f.to === node.id);
      const outgoingFlows = definition.flows.filter(f => f.from === node.id);

      if (node.type !== 'start' && incomingFlows.length === 0) {
        warnings.push(`节点 "${node.name}" 缺少输入连线`);
      }

      if (node.type !== 'end' && outgoingFlows.length === 0) {
        warnings.push(`节点 "${node.name}" 缺少输出连线`);
      }
    });

    // Check for orphaned flows
    definition.flows.forEach(flow => {
      const sourceNode = definition.nodes.find(n => n.id === flow.from);
      const targetNode = definition.nodes.find(n => n.id === flow.to);

      if (!sourceNode) {
        errors.push(`连线 "${flow.id}" 的源节点不存在`);
      }
      if (!targetNode) {
        errors.push(`连线 "${flow.id}" 的目标节点不存在`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 自动修正流程定义
   */
  private static autoCorrectDefinition(
    definition: BackendProcessDefinitionData,
    warnings: string[]
  ): BackendProcessDefinitionData {
    const correctedDefinition = { ...definition };

    // Remove orphaned flows
    correctedDefinition.flows = definition.flows.filter(flow => {
      const sourceExists = definition.nodes.some(n => n.id === flow.from);
      const targetExists = definition.nodes.some(n => n.id === flow.to);
      
      if (!sourceExists || !targetExists) {
        warnings.push(`已移除无效连线: ${flow.id}`);
        return false;
      }
      return true;
    });

    // Ensure unique node IDs
    const nodeIds = new Set<string>();
    correctedDefinition.nodes = definition.nodes.map(node => {
      if (nodeIds.has(node.id)) {
        const newId = `${node.id}_${Date.now()}`;
        warnings.push(`节点ID重复，已重命名: ${node.id} -> ${newId}`);
        return { ...node, id: newId };
      }
      nodeIds.add(node.id);
      return node;
    });

    return correctedDefinition;
  }

  /**
   * 下载文件到本地
   */
  static downloadFile(content: string, filename: string, contentType: string = 'application/json') {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * 读取文件内容
   */
  static readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      reader.readAsText(file);
    });
  }

  /**
   * 批量导出多个流程
   */
  static exportBatch(
    processes: Array<{
      definition: BackendProcessDefinitionData;
      metadata: Partial<ProcessDefinition>;
    }>,
    options: ExportOptions = { format: 'json' }
  ): string {
    const batchData = {
      version: '1.0.0',
      format: `miniflow-batch-${options.format}`,
      timestamp: new Date().toISOString(),
      count: processes.length,
      processes: processes.map((proc, index) => ({
        index,
        metadata: proc.metadata,
        definition: proc.definition,
      }))
    };

    return options.minify ? 
      JSON.stringify(batchData) : 
      JSON.stringify(batchData, null, 2);
  }

  /**
   * 流程定义差异比较
   */
  static compareDefinitions(
    definition1: BackendProcessDefinitionData,
    definition2: BackendProcessDefinitionData
  ): {
    identical: boolean;
    differences: {
      nodes: {
        added: typeof definition1.nodes;
        removed: typeof definition1.nodes;
        modified: Array<{
          id: string;
          changes: string[];
        }>;
      };
      flows: {
        added: typeof definition1.flows;
        removed: typeof definition1.flows;
        modified: Array<{
          id: string;
          changes: string[];
        }>;
      };
    };
  } {
    const differences = {
      nodes: { added: [], removed: [], modified: [] },
      flows: { added: [], removed: [], modified: [] }
    };

    // Compare nodes
    const nodes1Map = new Map(definition1.nodes.map(n => [n.id, n]));
    const nodes2Map = new Map(definition2.nodes.map(n => [n.id, n]));

    // Find added nodes
    differences.nodes.added = definition2.nodes.filter(n => !nodes1Map.has(n.id));
    
    // Find removed nodes
    differences.nodes.removed = definition1.nodes.filter(n => !nodes2Map.has(n.id));

    // Find modified nodes
    for (const [id, node1] of nodes1Map) {
      const node2 = nodes2Map.get(id);
      if (node2) {
        const changes: string[] = [];
        if (node1.name !== node2.name) changes.push('name');
        if (node1.type !== node2.type) changes.push('type');
        if (node1.x !== node2.x || node1.y !== node2.y) changes.push('position');
        if (JSON.stringify(node1.props) !== JSON.stringify(node2.props)) changes.push('properties');
        
        if (changes.length > 0) {
          differences.nodes.modified.push({ id, changes });
        }
      }
    }

    // Compare flows (similar logic)
    const flows1Map = new Map(definition1.flows.map(f => [f.id, f]));
    const flows2Map = new Map(definition2.flows.map(f => [f.id, f]));

    differences.flows.added = definition2.flows.filter(f => !flows1Map.has(f.id));
    differences.flows.removed = definition1.flows.filter(f => !flows2Map.has(f.id));

    for (const [id, flow1] of flows1Map) {
      const flow2 = flows2Map.get(id);
      if (flow2) {
        const changes: string[] = [];
        if (flow1.from !== flow2.from) changes.push('source');
        if (flow1.to !== flow2.to) changes.push('target');
        if (flow1.condition !== flow2.condition) changes.push('condition');
        if (flow1.label !== flow2.label) changes.push('label');
        
        if (changes.length > 0) {
          differences.flows.modified.push({ id, changes });
        }
      }
    }

    const identical = 
      differences.nodes.added.length === 0 &&
      differences.nodes.removed.length === 0 &&
      differences.nodes.modified.length === 0 &&
      differences.flows.added.length === 0 &&
      differences.flows.removed.length === 0 &&
      differences.flows.modified.length === 0;

    return { identical, differences };
  }

  /**
   * 生成流程缩略图
   */
  static generateThumbnail(
    definition: BackendProcessDefinitionData,
    width: number = 200,
    height: number = 150
  ): string {
    // Create SVG thumbnail
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fafafa" stroke="#d9d9d9"/>
        ${definition.nodes.map(node => {
          const scale = Math.min(width / 600, height / 400);
          const x = node.x * scale;
          const y = node.y * scale;
          const color = this.getNodeColor(node.type);
          
          return `<rect x="${x}" y="${y}" width="${20 * scale}" height="${15 * scale}" 
                    fill="${color}" stroke="#666" stroke-width="1" rx="2"/>`;
        }).join('')}
        ${definition.flows.map(flow => {
          const fromNode = definition.nodes.find(n => n.id === flow.from);
          const toNode = definition.nodes.find(n => n.id === flow.to);
          if (!fromNode || !toNode) return '';
          
          const scale = Math.min(width / 600, height / 400);
          const x1 = (fromNode.x + 20) * scale;
          const y1 = (fromNode.y + 7.5) * scale;
          const x2 = toNode.x * scale;
          const y2 = (toNode.y + 7.5) * scale;
          
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
                    stroke="#1890ff" stroke-width="1"/>`;
        }).join('')}
      </svg>`;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * 获取节点颜色
   */
  private static getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      start: '#52c41a',
      end: '#f5222d',
      userTask: '#1890ff',
      serviceTask: '#722ed1',
      gateway: '#fa8c16',
    };
    return colors[type] || '#d9d9d9';
  }
}
