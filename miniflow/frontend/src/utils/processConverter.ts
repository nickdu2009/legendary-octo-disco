/**
 * 流程数据格式转换工具
 * 用于ReactFlow格式与后端API格式之间的转换
 */

import { Node, Edge } from 'reactflow';
import { 
  ProcessNode, 
  ProcessEdge, 
  BackendProcessNode, 
  BackendProcessFlow, 
  BackendProcessDefinitionData,
  ProcessValidationResult,
  ProcessValidationError
} from '../types/process';

export class ProcessConverter {
  /**
   * ReactFlow格式转换为后端API格式
   */
  static reactFlowToBackend(nodes: Node[], edges: Edge[]): BackendProcessDefinitionData {
    const backendNodes: BackendProcessNode[] = nodes.map(node => ({
      id: node.id,
      type: node.type || 'userTask',
      name: node.data.label || '',
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      props: {
        assignee: node.data.assignee,
        condition: node.data.condition,
        description: node.data.description,
        serviceType: node.data.serviceType,
        endpoint: node.data.endpoint,
        method: node.data.method,
        gatewayType: node.data.gatewayType,
        required: node.data.required,
        ...node.data
      }
    }));

    const backendFlows: BackendProcessFlow[] = edges.map(edge => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      condition: edge.data?.condition || '',
      label: edge.label as string || ''
    }));

    return { 
      nodes: backendNodes, 
      flows: backendFlows 
    };
  }

  /**
   * 后端API格式转换为ReactFlow格式
   */
  static backendToReactFlow(definition: BackendProcessDefinitionData): {
    nodes: Node[];
    edges: Edge[];
  } {
    const reactNodes: Node[] = definition.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: { x: node.x || 0, y: node.y || 0 },
      data: {
        label: node.name || '',
        assignee: node.props?.assignee,
        condition: node.props?.condition,
        description: node.props?.description,
        serviceType: node.props?.serviceType,
        endpoint: node.props?.endpoint,
        method: node.props?.method,
        gatewayType: node.props?.gatewayType,
        required: node.props?.required,
        ...node.props
      }
    }));

    const reactEdges: Edge[] = definition.flows.map(flow => ({
      id: flow.id,
      source: flow.from,
      target: flow.to,
      label: flow.label,
      type: 'smoothstep',
      animated: true,
      data: {
        condition: flow.condition
      }
    }));

    return { 
      nodes: reactNodes, 
      edges: reactEdges 
    };
  }

  /**
   * 验证流程定义的完整性和正确性
   */
  static validateProcess(nodes: BackendProcessNode[], flows: BackendProcessFlow[]): ProcessValidationResult {
    const errors: ProcessValidationError[] = [];
    const warnings: ProcessValidationError[] = [];

    // 检查必需的开始和结束节点
    const startNodes = nodes.filter(n => n.type === 'start');
    const endNodes = nodes.filter(n => n.type === 'end');

    if (startNodes.length === 0) {
      errors.push({
        type: 'error',
        message: '流程必须包含一个开始节点',
      });
    }

    if (startNodes.length > 1) {
      errors.push({
        type: 'error',
        message: '流程只能包含一个开始节点',
      });
    }

    if (endNodes.length === 0) {
      errors.push({
        type: 'error',
        message: '流程必须包含至少一个结束节点',
      });
    }

    // 检查节点连接
    nodes.forEach(node => {
      const outgoingFlows = flows.filter(f => f.from === node.id);
      const incomingFlows = flows.filter(f => f.to === node.id);

      // 开始节点不能有输入连线
      if (node.type === 'start' && incomingFlows.length > 0) {
        errors.push({
          type: 'error',
          message: `开始节点 "${node.name}" 不能有输入连线`,
          nodeId: node.id
        });
      }

      // 结束节点不能有输出连线
      if (node.type === 'end' && outgoingFlows.length > 0) {
        errors.push({
          type: 'error',
          message: `结束节点 "${node.name}" 不能有输出连线`,
          nodeId: node.id
        });
      }

      // 非结束节点必须有输出连线
      if (node.type !== 'end' && outgoingFlows.length === 0) {
        errors.push({
          type: 'error',
          message: `节点 "${node.name}" 缺少输出连线`,
          nodeId: node.id
        });
      }

      // 非开始节点必须有输入连线
      if (node.type !== 'start' && incomingFlows.length === 0) {
        warnings.push({
          type: 'warning',
          message: `节点 "${node.name}" 缺少输入连线，可能无法到达`,
          nodeId: node.id
        });
      }

      // 用户任务节点建议配置处理人
      if (node.type === 'userTask' && !node.props?.assignee) {
        warnings.push({
          type: 'warning',
          message: `用户任务 "${node.name}" 建议配置处理人`,
          nodeId: node.id
        });
      }

      // 网关节点建议配置条件
      if (node.type === 'gateway' && !node.props?.condition && outgoingFlows.length > 1) {
        warnings.push({
          type: 'warning',
          message: `网关 "${node.name}" 有多个输出连线，建议配置条件表达式`,
          nodeId: node.id
        });
      }

      // 服务任务节点建议配置端点
      if (node.type === 'serviceTask' && !node.props?.endpoint) {
        warnings.push({
          type: 'warning',
          message: `服务任务 "${node.name}" 建议配置服务端点`,
          nodeId: node.id
        });
      }
    });

    // 检查连线的有效性
    flows.forEach(flow => {
      const sourceNode = nodes.find(n => n.id === flow.from);
      const targetNode = nodes.find(n => n.id === flow.to);

      if (!sourceNode) {
        errors.push({
          type: 'error',
          message: `连线源节点不存在: ${flow.from}`,
          edgeId: flow.id
        });
      }

      if (!targetNode) {
        errors.push({
          type: 'error',
          message: `连线目标节点不存在: ${flow.to}`,
          edgeId: flow.id
        });
      }

      // 检查循环连接
      if (flow.from === flow.to) {
        errors.push({
          type: 'error',
          message: `连线不能连接到自身`,
          edgeId: flow.id
        });
      }
    });

    // 检查是否有孤立的节点
    const connectedNodeIds = new Set([
      ...flows.map(f => f.from),
      ...flows.map(f => f.to)
    ]);

    nodes.forEach(node => {
      if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
        warnings.push({
          type: 'warning',
          message: `节点 "${node.name}" 没有连接到流程中`,
          nodeId: node.id
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 生成唯一的节点ID
   */
  static generateNodeId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * 生成唯一的连线ID
   */
  static generateEdgeId(sourceId: string, targetId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 3);
    return `edge-${sourceId}-${targetId}-${timestamp}-${random}`;
  }

  /**
   * 创建默认节点数据
   */
  static createDefaultNodeData(type: string): any {
    const defaultLabels: { [key: string]: string } = {
      start: '开始',
      end: '结束',
      userTask: '用户任务',
      serviceTask: '服务任务',
      gateway: '条件网关'
    };

    const baseData = {
      label: defaultLabels[type] || '未知节点',
      description: ''
    };

    switch (type) {
      case 'userTask':
        return {
          ...baseData,
          assignee: '',
          required: false
        };
      case 'serviceTask':
        return {
          ...baseData,
          serviceType: 'http',
          endpoint: '',
          method: 'POST'
        };
      case 'gateway':
        return {
          ...baseData,
          gatewayType: 'exclusive',
          condition: ''
        };
      default:
        return baseData;
    }
  }

  /**
   * 计算流程的布局位置
   */
  static calculateLayout(nodes: Node[]): Node[] {
    // 简单的自动布局算法
    const layoutNodes = [...nodes];
    const startNodes = layoutNodes.filter(n => n.type === 'start');
    const endNodes = layoutNodes.filter(n => n.type === 'end');
    const otherNodes = layoutNodes.filter(n => n.type !== 'start' && n.type !== 'end');

    let x = 100;
    let y = 200;
    const spacing = 200;

    // 布局开始节点
    startNodes.forEach((node, index) => {
      node.position = { x, y: y + index * 100 };
    });

    x += spacing;

    // 布局其他节点
    otherNodes.forEach((node, index) => {
      node.position = { x, y: y + index * 100 };
    });

    x += spacing;

    // 布局结束节点
    endNodes.forEach((node, index) => {
      node.position = { x, y: y + index * 100 };
    });

    return layoutNodes;
  }

  /**
   * 深度复制流程定义
   */
  static cloneProcessDefinition(definition: BackendProcessDefinitionData): BackendProcessDefinitionData {
    return {
      nodes: definition.nodes.map(node => ({
        ...node,
        id: this.generateNodeId(node.type),
        props: { ...node.props }
      })),
      flows: definition.flows.map(flow => ({
        ...flow,
        id: this.generateEdgeId(flow.from, flow.to)
      }))
    };
  }
}
