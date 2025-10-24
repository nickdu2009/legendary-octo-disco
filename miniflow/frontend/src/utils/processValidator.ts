/**
 * 流程验证系统
 * 提供完整的流程定义验证和质量评估
 */

import type {
  TypedProcessNode,
  TypedProcessEdge,
  ProcessValidationResult,
  ProcessValidationError,
  ValidationRule
} from '../types/components';

export class ProcessValidator {
  private static readonly validationRules: ValidationRule[] = [
    // 基础结构验证
    {
      id: 'REQUIRE_START_NODE',
      name: '开始节点检查',
      description: '流程必须包含一个开始节点',
      severity: 'error',
      validator: (nodes) => {
        const startNodes = nodes.filter(n => n.type === 'start');
        if (startNodes.length === 0) {
          return [{
            type: 'error',
            message: '流程必须包含一个开始节点',
            ruleId: 'REQUIRE_START_NODE',
            suggestion: '请添加一个开始节点到流程中'
          }];
        }
        if (startNodes.length > 1) {
          return [{
            type: 'error',
            message: '流程只能包含一个开始节点',
            ruleId: 'REQUIRE_START_NODE',
            suggestion: '请删除多余的开始节点'
          }];
        }
        return [];
      }
    },

    {
      id: 'REQUIRE_END_NODE',
      name: '结束节点检查',
      description: '流程必须包含至少一个结束节点',
      severity: 'error',
      validator: (nodes) => {
        const endNodes = nodes.filter(n => n.type === 'end');
        if (endNodes.length === 0) {
          return [{
            type: 'error',
            message: '流程必须包含至少一个结束节点',
            ruleId: 'REQUIRE_END_NODE',
            suggestion: '请添加至少一个结束节点到流程中'
          }];
        }
        return [];
      }
    },

    // 连接性验证
    {
      id: 'NODE_CONNECTIVITY',
      name: '节点连接性检查',
      description: '检查节点的输入输出连接',
      severity: 'error',
      validator: (nodes, edges) => {
        const errors: ProcessValidationError[] = [];

        nodes.forEach(node => {
          const incomingEdges = edges.filter(e => e.target === node.id);
          const outgoingEdges = edges.filter(e => e.source === node.id);

          // 开始节点不能有输入
          if (node.type === 'start' && incomingEdges.length > 0) {
            errors.push({
              type: 'error',
              message: `开始节点 "${node.data.label}" 不能有输入连线`,
              nodeId: node.id,
              ruleId: 'NODE_CONNECTIVITY',
              suggestion: '请删除指向开始节点的连线'
            });
          }

          // 结束节点不能有输出
          if (node.type === 'end' && outgoingEdges.length > 0) {
            errors.push({
              type: 'error',
              message: `结束节点 "${node.data.label}" 不能有输出连线`,
              nodeId: node.id,
              ruleId: 'NODE_CONNECTIVITY',
              suggestion: '请删除从结束节点出发的连线'
            });
          }

          // 非结束节点必须有输出
          if (node.type !== 'end' && outgoingEdges.length === 0) {
            errors.push({
              type: 'error',
              message: `节点 "${node.data.label}" 缺少输出连线`,
              nodeId: node.id,
              ruleId: 'NODE_CONNECTIVITY',
              suggestion: '请添加从该节点出发的连线'
            });
          }

          // 非开始节点建议有输入
          if (node.type !== 'start' && incomingEdges.length === 0) {
            errors.push({
              type: 'warning',
              message: `节点 "${node.data.label}" 缺少输入连线，可能无法到达`,
              nodeId: node.id,
              ruleId: 'NODE_CONNECTIVITY',
              suggestion: '请添加指向该节点的连线，或检查流程逻辑'
            });
          }
        });

        return errors;
      }
    },

    // 业务逻辑验证
    {
      id: 'USER_TASK_ASSIGNEE',
      name: '用户任务处理人检查',
      description: '用户任务应该配置处理人',
      severity: 'warning',
      validator: (nodes) => {
        const errors: ProcessValidationError[] = [];

        nodes.forEach(node => {
          if (node.type === 'userTask' && !node.data.assignee) {
            errors.push({
              type: 'warning',
              message: `用户任务 "${node.data.label}" 未配置处理人`,
              nodeId: node.id,
              ruleId: 'USER_TASK_ASSIGNEE',
              suggestion: '建议为用户任务配置具体的处理人'
            });
          }
        });

        return errors;
      }
    },

    {
      id: 'GATEWAY_CONDITIONS',
      name: '网关条件检查',
      description: '网关节点应该配置条件表达式',
      severity: 'warning',
      validator: (nodes, edges) => {
        const errors: ProcessValidationError[] = [];

        nodes.forEach(node => {
          if (node.type === 'gateway') {
            const outgoingEdges = edges.filter(e => e.source === node.id);
            
            if (outgoingEdges.length > 1 && !node.data.condition) {
              errors.push({
                type: 'warning',
                message: `网关 "${node.data.label}" 有多个输出但未配置条件`,
                nodeId: node.id,
                ruleId: 'GATEWAY_CONDITIONS',
                suggestion: '建议为网关配置条件表达式以确定流程走向'
              });
            }
          }
        });

        return errors;
      }
    },

    {
      id: 'SERVICE_TASK_CONFIG',
      name: '服务任务配置检查',
      description: '服务任务应该配置服务端点',
      severity: 'warning',
      validator: (nodes) => {
        const errors: ProcessValidationError[] = [];

        nodes.forEach(node => {
          if (node.type === 'serviceTask' && !node.data.endpoint) {
            errors.push({
              type: 'warning',
              message: `服务任务 "${node.data.label}" 未配置服务端点`,
              nodeId: node.id,
              ruleId: 'SERVICE_TASK_CONFIG',
              suggestion: '建议为服务任务配置具体的服务端点和方法'
            });
          }
        });

        return errors;
      }
    },

    // 流程质量验证
    {
      id: 'ISOLATED_NODES',
      name: '孤立节点检查',
      description: '检查是否有孤立的节点',
      severity: 'warning',
      validator: (nodes, edges) => {
        const errors: ProcessValidationError[] = [];
        const connectedNodeIds = new Set([
          ...edges.map(e => e.source),
          ...edges.map(e => e.target)
        ]);

        nodes.forEach(node => {
          if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
            errors.push({
              type: 'warning',
              message: `节点 "${node.data.label}" 没有连接到流程中`,
              nodeId: node.id,
              ruleId: 'ISOLATED_NODES',
              suggestion: '请将该节点连接到流程中，或删除不需要的节点'
            });
          }
        });

        return errors;
      }
    },

    {
      id: 'CIRCULAR_REFERENCE',
      name: '循环引用检查',
      description: '检查流程中是否存在循环引用',
      severity: 'warning',
      validator: (nodes, edges) => {
        const errors: ProcessValidationError[] = [];
        
        // 简单的循环检测算法
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (nodeId: string): boolean => {
          if (recursionStack.has(nodeId)) {
            return true;
          }
          if (visited.has(nodeId)) {
            return false;
          }

          visited.add(nodeId);
          recursionStack.add(nodeId);

          const outgoingEdges = edges.filter(e => e.source === nodeId);
          for (const edge of outgoingEdges) {
            if (hasCycle(edge.target)) {
              return true;
            }
          }

          recursionStack.delete(nodeId);
          return false;
        };

        for (const node of nodes) {
          if (hasCycle(node.id)) {
            errors.push({
              type: 'warning',
              message: '流程中存在循环引用',
              nodeId: node.id,
              ruleId: 'CIRCULAR_REFERENCE',
              suggestion: '检查流程逻辑，避免无限循环'
            });
            break;
          }
        }

        return errors;
      }
    }
  ];

  /**
   * 验证流程定义
   */
  static validate(
    nodes: TypedProcessNode[], 
    edges: TypedProcessEdge[]
  ): ProcessValidationResult {
    const allErrors: ProcessValidationError[] = [];
    
    // 运行所有验证规则
    for (const rule of this.validationRules) {
      try {
        const ruleErrors = rule.validator(nodes, edges);
        allErrors.push(...ruleErrors);
      } catch (error) {
        allErrors.push({
          type: 'error',
          message: `验证规则 "${rule.name}" 执行失败`,
          ruleId: rule.id,
          suggestion: '请联系开发人员检查验证规则'
        });
      }
    }

    // 分类错误
    const errors = allErrors.filter(e => e.type === 'error');
    const warnings = allErrors.filter(e => e.type === 'warning');
    const infos = allErrors.filter(e => e.type === 'info');

    // 计算质量评分
    const score = this.calculateQualityScore(nodes, edges, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
      score
    };
  }

  /**
   * 计算流程质量评分 (0-100)
   */
  private static calculateQualityScore(
    nodes: TypedProcessNode[],
    edges: TypedProcessEdge[],
    errors: ProcessValidationError[],
    warnings: ProcessValidationError[]
  ): number {
    let score = 100;

    // 错误扣分
    score -= errors.length * 20;

    // 警告扣分
    score -= warnings.length * 5;

    // 复杂度奖励
    const complexity = nodes.length + edges.length;
    if (complexity > 5) score += Math.min(10, complexity - 5);

    // 节点类型多样性奖励
    const nodeTypes = new Set(nodes.map(n => n.type));
    score += nodeTypes.size * 2;

    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 获取验证规则列表
   */
  static getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * 添加自定义验证规则
   */
  static addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * 移除验证规则
   */
  static removeValidationRule(ruleId: string): void {
    const index = this.validationRules.findIndex(r => r.id === ruleId);
    if (index > -1) {
      this.validationRules.splice(index, 1);
    }
  }
}
