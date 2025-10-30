package engine

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"miniflow/internal/model"
	"miniflow/internal/repository"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// ProcessEngine 流程执行引擎
type ProcessEngine struct {
	instanceRepo    *repository.ProcessInstanceRepository
	taskRepo        *repository.TaskRepository
	processRepo     *repository.ProcessRepository
	userRepo        *repository.UserRepository
	logger          *logger.Logger
	variableEngine  *VariableEngine
	serviceExecutor *ServiceExecutor
	stateMachine    *ProcessStateMachine
	taskLifecycle   *TaskLifecycleManager
}

// NewProcessEngine 创建新的流程执行引擎
func NewProcessEngine(
	instanceRepo *repository.ProcessInstanceRepository,
	taskRepo *repository.TaskRepository,
	processRepo *repository.ProcessRepository,
	userRepo *repository.UserRepository,
	db *database.Database,
	logger *logger.Logger,
) *ProcessEngine {
	stateMachine := NewProcessStateMachine(nil, logger)
	taskLifecycle := NewTaskLifecycleManager(taskRepo, logger)

	engine := &ProcessEngine{
		instanceRepo:    instanceRepo,
		taskRepo:        taskRepo,
		processRepo:     processRepo,
		userRepo:        userRepo,
		logger:          logger,
		variableEngine:  NewVariableEngine(logger),
		serviceExecutor: NewServiceExecutor(db, logger),
		stateMachine:    stateMachine,
		taskLifecycle:   taskLifecycle,
	}

	return engine
}

// StartProcessRequest 启动流程请求
type StartProcessRequest struct {
	DefinitionID uint                   `json:"definition_id" validate:"required"`
	BusinessKey  string                 `json:"business_key" validate:"required,min=1,max=255"`
	Variables    map[string]interface{} `json:"variables"`
}

// StartProcess 启动流程实例
func (e *ProcessEngine) StartProcess(req *StartProcessRequest, starterID uint) (*model.ProcessInstance, error) {
	e.logger.Info("Starting process instance",
		zap.Uint("definition_id", req.DefinitionID),
		zap.String("business_key", req.BusinessKey),
		zap.Uint("starter_id", starterID),
	)

	// 获取流程定义
	definition, err := e.processRepo.GetByID(req.DefinitionID)
	if err != nil {
		return nil, fmt.Errorf("获取流程定义失败: %v", err)
	}

	// 解析流程定义
	definitionData, err := definition.GetDefinitionData()
	if err != nil {
		return nil, fmt.Errorf("解析流程定义失败: %v", err)
	}

	// 查找开始节点
	startNode := e.findStartNode(definitionData.Nodes)
	if startNode == nil {
		return nil, errors.New("流程定义中没有开始节点")
	}

	// 序列化变量
	variablesJSON, err := json.Marshal(req.Variables)
	if err != nil {
		return nil, fmt.Errorf("序列化变量失败: %v", err)
	}

	// 创建流程实例
	instance := &model.ProcessInstance{
		DefinitionID: req.DefinitionID,
		BusinessKey:  req.BusinessKey,
		CurrentNode:  startNode.ID,
		Status:       model.InstanceStatusRunning,
		Variables:    string(variablesJSON),
		StartTime:    time.Now(),
		StarterID:    starterID,
	}

	// 保存流程实例
	if err := e.instanceRepo.Create(instance); err != nil {
		return nil, fmt.Errorf("创建流程实例失败: %v", err)
	}

	e.logger.Info("Process instance created successfully",
		zap.Uint("instance_id", instance.ID),
		zap.String("current_node", instance.CurrentNode),
	)

	// 设置Definition关联，供后续使用
	instance.Definition = *definition

	// 发布流程启动事件
	e.logger.Info("Process started",
		zap.Uint("instance_id", instance.ID),
		zap.Uint("starter_id", starterID),
	)

	// 推进到第一个节点
	if err := e.moveToNextNode(instance, startNode.ID); err != nil {
		e.logger.Error("Failed to move to first node",
			zap.Uint("instance_id", instance.ID),
			zap.String("start_node", startNode.ID),
			zap.Error(err),
		)
		// 这是关键错误，应该返回错误
		return nil, fmt.Errorf("流程推进失败: %v", err)
	}

	return instance, nil
}

// CompleteTask 完成任务
func (e *ProcessEngine) CompleteTask(taskID uint, userID uint, formData map[string]interface{}, comment string) error {
	e.logger.Info("Completing task",
		zap.Uint("task_id", taskID),
		zap.Uint("user_id", userID),
	)

	// 获取任务实例
	task, err := e.taskRepo.GetByID(taskID)
	if err != nil {
		return fmt.Errorf("获取任务失败: %v", err)
	}

	// 验证任务状态
	if task.Status != model.TaskStatusClaimed && task.Status != model.TaskStatusInProgress {
		return errors.New("任务状态不允许完成操作")
	}

	// 验证用户权限
	if task.AssigneeID != nil && *task.AssigneeID != userID {
		return errors.New("用户没有权限完成此任务")
	}

	// 序列化表单数据
	if formData != nil {
		if formDataJSON, err := json.Marshal(formData); err == nil {
			task.Comment = string(formDataJSON)
		}
	}

	// 更新任务状态
	now := time.Now()
	task.Status = model.TaskStatusCompleted
	task.CompleteTime = &now
	task.Comment = comment

	if err := e.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新服务任务状态失败: %v", err)
	}

	e.logger.Info("Task completed successfully",
		zap.Uint("task_id", taskID),
		zap.Uint("user_id", userID),
	)

	// 获取流程实例并推进流程
	instance, err := e.instanceRepo.GetByID(task.InstanceID)
	if err != nil {
		return fmt.Errorf("获取流程实例失败: %v", err)
	}

	// 检查当前节点的所有任务是否都已完成
	if err := e.checkAndAdvanceProcess(instance, task.NodeID); err != nil {
		e.logger.Error("Failed to advance process", zap.Error(err))
		// 不返回错误，任务已完成成功
	}

	return nil
}

// SuspendInstance 暂停流程实例
func (e *ProcessEngine) SuspendInstance(instanceID uint, reason string) error {
	instance, err := e.instanceRepo.GetByID(instanceID)
	if err != nil {
		return fmt.Errorf("获取流程实例失败: %v", err)
	}

	if instance.Status != model.InstanceStatusRunning {
		return errors.New("只能暂停运行中的流程实例")
	}

	// 使用状态机转换状态
	if err := e.stateMachine.TransitionTo(instance, model.InstanceStatusSuspended, reason); err != nil {
		return fmt.Errorf("状态转换失败: %v", err)
	}

	if err := e.instanceRepo.Update(instance); err != nil {
		return fmt.Errorf("更新流程实例状态失败: %v", err)
	}

	e.logger.Info("Process instance suspended",
		zap.Uint("instance_id", instanceID),
		zap.String("reason", reason),
	)

	return nil
}

// ResumeInstance 恢复流程实例
func (e *ProcessEngine) ResumeInstance(instanceID uint) error {
	instance, err := e.instanceRepo.GetByID(instanceID)
	if err != nil {
		return fmt.Errorf("获取流程实例失败: %v", err)
	}

	if instance.Status != model.InstanceStatusSuspended {
		return errors.New("只能恢复暂停的流程实例")
	}

	// 使用状态机转换状态
	if err := e.stateMachine.TransitionTo(instance, model.InstanceStatusRunning, ""); err != nil {
		return fmt.Errorf("状态转换失败: %v", err)
	}

	if err := e.instanceRepo.Update(instance); err != nil {
		return fmt.Errorf("更新流程实例状态失败: %v", err)
	}

	e.logger.Info("Process instance resumed",
		zap.Uint("instance_id", instanceID),
	)

	return nil
}

// CancelInstance 取消流程实例
func (e *ProcessEngine) CancelInstance(instanceID uint, reason string) error {
	instance, err := e.instanceRepo.GetByID(instanceID)
	if err != nil {
		return fmt.Errorf("获取流程实例失败: %v", err)
	}

	if instance.Status == model.InstanceStatusCompleted || instance.Status == model.InstanceStatusCancelled {
		return errors.New("流程实例已完成或已取消，无法取消")
	}

	// 使用状态机转换状态
	if err := e.stateMachine.TransitionTo(instance, model.InstanceStatusCancelled, reason); err != nil {
		return fmt.Errorf("状态转换失败: %v", err)
	}

	if err := e.instanceRepo.Update(instance); err != nil {
		return fmt.Errorf("更新流程实例状态失败: %v", err)
	}

	// 取消所有未完成的任务
	if err := e.cancelInstanceTasks(instanceID); err != nil {
		e.logger.Error("Failed to cancel instance tasks", zap.Error(err))
	}

	e.logger.Info("Process instance cancelled",
		zap.Uint("instance_id", instanceID),
		zap.String("reason", reason),
	)

	return nil
}

// 私有方法

// findStartNode 查找开始节点
func (e *ProcessEngine) findStartNode(nodes []model.ProcessNode) *model.ProcessNode {
	for _, node := range nodes {
		if node.Type == "start" {
			return &node
		}
	}
	return nil
}

// moveToNextNode 推进到下一个节点
func (e *ProcessEngine) moveToNextNode(instance *model.ProcessInstance, currentNodeID string) error {
	// 获取流程定义
	definitionData, err := instance.Definition.GetDefinitionData()
	if err != nil {
		return fmt.Errorf("解析流程定义失败: %v", err)
	}

	// 查找当前节点
	currentNode := e.findNodeByID(definitionData.Nodes, currentNodeID)
	if currentNode == nil {
		return fmt.Errorf("找不到节点: %s", currentNodeID)
	}

	// 根据节点类型处理
	switch currentNode.Type {
	case "start":
		return e.handleStartNode(instance, currentNode, definitionData)
	case "userTask":
		return e.handleUserTask(instance, currentNode)
	case "serviceTask":
		return e.handleServiceTask(instance, currentNode)
	case "gateway":
		return e.handleGateway(instance, currentNode, definitionData)
	case "end":
		return e.handleEndNode(instance, currentNode)
	default:
		return fmt.Errorf("不支持的节点类型: %s", currentNode.Type)
	}
}

// handleStartNode 处理开始节点
func (e *ProcessEngine) handleStartNode(instance *model.ProcessInstance, node *model.ProcessNode, definition *model.ProcessDefinitionData) error {
	e.logger.Info("Handling start node",
		zap.Uint("instance_id", instance.ID),
		zap.String("node_id", node.ID),
	)

	// 查找开始节点的出口连线
	outgoingFlows := e.findOutgoingFlows(definition.Flows, node.ID)
	if len(outgoingFlows) == 0 {
		return errors.New("开始节点没有出口连线")
	}

	e.logger.Info("Found outgoing flows from start node",
		zap.Int("flow_count", len(outgoingFlows)),
		zap.String("next_node", outgoingFlows[0].To),
	)

	// 推进到下一个节点
	nextNodeID := outgoingFlows[0].To

	// 更新当前节点到下一个节点
	instance.CurrentNode = nextNodeID
	if err := e.instanceRepo.Update(instance); err != nil {
		return fmt.Errorf("更新流程实例当前节点失败: %v", err)
	}

	// 处理下一个节点
	nextNode := e.findNodeByID(definition.Nodes, nextNodeID)
	if nextNode == nil {
		return fmt.Errorf("找不到下一个节点: %s", nextNodeID)
	}

	e.logger.Info("Processing next node",
		zap.String("node_id", nextNode.ID),
		zap.String("node_type", nextNode.Type),
		zap.String("node_name", nextNode.Name),
	)

	// 根据下一个节点类型处理
	switch nextNode.Type {
	case "userTask":
		e.logger.Info("Calling handleUserTask")
		return e.handleUserTask(instance, nextNode)
	case "serviceTask":
		e.logger.Info("Calling handleServiceTask")
		return e.handleServiceTask(instance, nextNode)
	case "gateway":
		e.logger.Info("Calling handleGateway")
		return e.handleGateway(instance, nextNode, definition)
	case "end":
		e.logger.Info("Calling handleEndNode")
		return e.handleEndNode(instance, nextNode)
	default:
		e.logger.Error("Unsupported node type",
			zap.String("node_type", nextNode.Type),
			zap.String("node_id", nextNode.ID),
		)
		return fmt.Errorf("不支持的节点类型: %s", nextNode.Type)
	}
}

// handleUserTask 处理用户任务节点
func (e *ProcessEngine) handleUserTask(instance *model.ProcessInstance, node *model.ProcessNode) error {
	e.logger.Info("Handling user task node",
		zap.Uint("instance_id", instance.ID),
		zap.String("node_id", node.ID),
		zap.String("task_name", node.Name),
	)

	// 使用任务生命周期管理器创建任务
	task, err := e.taskLifecycle.CreateTask(instance, node.ID)
	if err != nil {
		return fmt.Errorf("创建用户任务失败: %v", err)
	}

	// 更新流程实例统计
	// 注意：CurrentNode已经在handleStartNode中更新了，这里不需要重复更新

	if err := e.instanceRepo.Update(instance); err != nil {
		e.logger.Error("Failed to update process instance",
			zap.Uint("instance_id", instance.ID),
			zap.Error(err),
		)
		return fmt.Errorf("更新流程实例失败: %v", err)
	}

	// 发布任务创建事件
	e.logger.Info("User task created",
		zap.Uint("instance_id", instance.ID),
		zap.Uint("task_id", task.ID),
		zap.String("node_id", node.ID),
	)

	return nil
}

// handleServiceTask 处理服务任务节点
func (e *ProcessEngine) handleServiceTask(instance *model.ProcessInstance, node *model.ProcessNode) error {
	// 创建服务任务
	task := &model.TaskInstance{
		InstanceID: instance.ID,
		NodeID:     node.ID,
		Name:       node.Name,
		Status:     model.TaskStatusCreated,
		Priority:   50, // 默认优先级
	}

	// 保存任务
	if err := e.taskRepo.Create(task); err != nil {
		return fmt.Errorf("创建服务任务失败: %v", err)
	}

	// 立即执行服务任务
	if err := e.executeServiceTask(task, node); err != nil {
		e.logger.Error("Service task execution failed", zap.Error(err))
		return err
	}

	// 任务执行成功，推进流程
	return e.completeServiceTask(instance, task, node)
}

// handleGateway 处理网关节点
func (e *ProcessEngine) handleGateway(instance *model.ProcessInstance, node *model.ProcessNode, definition *model.ProcessDefinitionData) error {
	// 获取流程变量
	variables, err := e.getInstanceVariables(instance.ID)
	if err != nil {
		return fmt.Errorf("获取流程变量失败: %v", err)
	}

	// 评估网关条件
	nextNodeIDs, err := e.evaluateGatewayConditions(node, definition.Flows, variables)
	if err != nil {
		return fmt.Errorf("评估网关条件失败: %v", err)
	}

	if len(nextNodeIDs) == 0 {
		return errors.New("网关条件评估后没有可执行的路径")
	}

	// 推进到所有满足条件的节点
	for _, nodeID := range nextNodeIDs {
		if err := e.moveToNextNode(instance, nodeID); err != nil {
			e.logger.Error("Failed to move to next node",
				zap.String("node_id", nodeID),
				zap.Error(err),
			)
		}
	}

	return nil
}

// handleEndNode 处理结束节点
func (e *ProcessEngine) handleEndNode(instance *model.ProcessInstance, node *model.ProcessNode) error {
	now := time.Now()

	// 使用状态机转换状态
	if err := e.stateMachine.TransitionTo(instance, model.InstanceStatusCompleted, ""); err != nil {
		return fmt.Errorf("状态转换失败: %v", err)
	}

	instance.EndTime = &now
	instance.CurrentNode = node.ID

	// 更新执行路径
	// e.updateExecutionPath(instance, node.ID) // 移除此行

	if err := e.instanceRepo.Update(instance); err != nil {
		return fmt.Errorf("更新流程实例状态失败: %v", err)
	}

	e.logger.Info("Process instance completed",
		zap.Uint("instance_id", instance.ID),
		zap.String("end_node", node.ID),
	)

	return nil
}

// 辅助方法

// findNodeByID 根据ID查找节点
func (e *ProcessEngine) findNodeByID(nodes []model.ProcessNode, nodeID string) *model.ProcessNode {
	for _, node := range nodes {
		if node.ID == nodeID {
			return &node
		}
	}
	return nil
}

// findOutgoingFlows 查找节点的出口连线
func (e *ProcessEngine) findOutgoingFlows(flows []model.ProcessFlow, nodeID string) []model.ProcessFlow {
	var outgoing []model.ProcessFlow
	for _, flow := range flows {
		if flow.From == nodeID {
			outgoing = append(outgoing, flow)
		}
	}
	return outgoing
}

// getInstanceVariables 获取流程实例变量
func (e *ProcessEngine) getInstanceVariables(instanceID uint) (map[string]interface{}, error) {
	instance, err := e.instanceRepo.GetByID(instanceID)
	if err != nil {
		return nil, err
	}

	var variables map[string]interface{}
	if err := json.Unmarshal([]byte(instance.Variables), &variables); err != nil {
		return nil, err
	}

	return variables, nil
}

// estimateProcessDuration 估算流程执行时间
func (e *ProcessEngine) estimateProcessDuration(definition *model.ProcessDefinitionData) int {
	// 简单估算：用户任务1小时，服务任务1分钟
	duration := 0
	for _, node := range definition.Nodes {
		switch node.Type {
		case "userTask":
			duration += 3600 // 1小时
		case "serviceTask":
			duration += 60 // 1分钟
		}
	}
	return duration
}

// executeServiceTask 执行服务任务
func (e *ProcessEngine) executeServiceTask(task *model.TaskInstance, node *model.ProcessNode) error {
	e.logger.Info("Executing service task",
		zap.Uint("task_id", task.ID),
		zap.String("node_id", node.ID),
	)

	// 使用简化后的服务执行器
	return e.serviceExecutor.ExecuteService(task)
}

// completeServiceTask 完成服务任务
func (e *ProcessEngine) completeServiceTask(instance *model.ProcessInstance, task *model.TaskInstance, node *model.ProcessNode) error {
	now := time.Now()
	task.Status = model.TaskStatusCompleted
	task.CompleteTime = &now

	if err := e.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新服务任务状态失败: %v", err)
	}

	// 推进流程到下一个节点
	return e.checkAndAdvanceProcess(instance, node.ID)
}

// checkAndAdvanceProcess 检查并推进流程
func (e *ProcessEngine) checkAndAdvanceProcess(instance *model.ProcessInstance, nodeID string) error {
	// 检查当前节点的所有任务是否都已完成
	pendingTasks, err := e.taskRepo.GetByInstanceAndNode(instance.ID, nodeID, []string{
		model.TaskStatusCreated,
		model.TaskStatusAssigned,
		model.TaskStatusClaimed,
		model.TaskStatusInProgress,
	})
	if err != nil {
		return fmt.Errorf("检查待处理任务失败: %v", err)
	}

	// 如果还有未完成的任务，不推进流程
	if len(pendingTasks) > 0 {
		e.logger.Info("Waiting for pending tasks",
			zap.Uint("instance_id", instance.ID),
			zap.String("node_id", nodeID),
			zap.Int("pending_count", len(pendingTasks)),
		)
		return nil
	}

	// 获取流程定义
	definitionData, err := instance.Definition.GetDefinitionData()
	if err != nil {
		return fmt.Errorf("解析流程定义失败: %v", err)
	}

	// 查找出口连线
	outgoingFlows := e.findOutgoingFlows(definitionData.Flows, nodeID)
	if len(outgoingFlows) == 0 {
		// 没有出口连线，可能是结束节点
		return nil
	}

	// 推进到所有满足条件的节点
	for _, flow := range outgoingFlows {
		if err := e.moveToNextNode(instance, flow.To); err != nil {
			e.logger.Error("Failed to move to next node",
				zap.String("node_id", flow.To),
				zap.Error(err),
			)
		}
	}

	return nil
}

// evaluateGatewayConditions 评估网关条件
func (e *ProcessEngine) evaluateGatewayConditions(gateway *model.ProcessNode, flows []model.ProcessFlow, variables map[string]interface{}) ([]string, error) {
	gatewayType := "exclusive" // 默认排他网关
	if gType, ok := gateway.Props["gatewayType"].(string); ok {
		gatewayType = gType
	}

	outgoingFlows := e.findOutgoingFlows(flows, gateway.ID)
	var nextNodes []string

	switch gatewayType {
	case "exclusive":
		// 排他网关：只选择第一个满足条件的路径
		for _, flow := range outgoingFlows {
			if e.evaluateCondition(flow.Condition, variables) {
				nextNodes = append(nextNodes, flow.To)
				break
			}
		}
		// 如果没有满足条件的，选择默认路径（没有条件的）
		if len(nextNodes) == 0 {
			for _, flow := range outgoingFlows {
				if flow.Condition == "" {
					nextNodes = append(nextNodes, flow.To)
					break
				}
			}
		}
	case "parallel":
		// 并行网关：所有路径都执行
		for _, flow := range outgoingFlows {
			nextNodes = append(nextNodes, flow.To)
		}
	case "inclusive":
		// 包容网关：所有满足条件的路径都执行
		for _, flow := range outgoingFlows {
			if flow.Condition == "" || e.evaluateCondition(flow.Condition, variables) {
				nextNodes = append(nextNodes, flow.To)
			}
		}
	}

	return nextNodes, nil
}

// evaluateCondition 评估条件表达式
func (e *ProcessEngine) evaluateCondition(condition string, variables map[string]interface{}) bool {
	if condition == "" {
		return true
	}

	// 使用VariableEngine评估条件
	result, err := e.variableEngine.EvaluateCondition(condition, variables)
	if err != nil {
		e.logger.Error("Condition evaluation failed",
			zap.String("condition", condition),
			zap.Any("variables", variables),
			zap.Error(err),
		)
		// 条件评估失败时默认返回true
		return true
	}

	return result
}

// GetInstance 获取流程实例
func (e *ProcessEngine) GetInstance(instanceID uint) (*model.ProcessInstance, error) {
	return e.instanceRepo.GetByID(instanceID)
}

// GetInstances 获取流程实例列表
func (e *ProcessEngine) GetInstances(offset, limit int, filters map[string]interface{}) ([]model.ProcessInstance, int64, error) {
	return e.instanceRepo.List(offset, limit, filters)
}

// GetInstanceHistory 获取流程实例执行历史
func (e *ProcessEngine) GetInstanceHistory(instanceID uint) (interface{}, error) {
	// 获取流程实例
	instance, err := e.instanceRepo.GetByID(instanceID)
	if err != nil {
		return nil, err
	}

	// 获取所有任务
	tasks, err := e.taskRepo.GetByInstance(instanceID)
	if err != nil {
		return nil, err
	}

	// 构建历史数据
	history := map[string]interface{}{
		"instance":   instance,
		"tasks":      tasks,
		"created_at": instance.CreatedAt,
		"start_time": instance.StartTime,
		"end_time":   instance.EndTime,
	}

	return history, nil
}

// cancelInstanceTasks 取消流程实例的所有任务
func (e *ProcessEngine) cancelInstanceTasks(instanceID uint) error {
	tasks, err := e.taskRepo.GetByInstance(instanceID)
	if err != nil {
		return err
	}

	for _, task := range tasks {
		if task.Status != model.TaskStatusCompleted && task.Status != model.TaskStatusFailed {
			task.Status = model.TaskStatusSkipped
			if err := e.taskRepo.Update(&task); err != nil {
				e.logger.Error("Failed to cancel task", zap.Uint("task_id", task.ID), zap.Error(err))
			}

			// 发布任务跳过事件
			e.logger.Info("Task skipped",
				zap.Uint("instance_id", instanceID),
				zap.Uint("task_id", task.ID),
				zap.String("reason", "流程取消"),
			)
		}
	}

	return nil
}

// GetUserTasks 获取用户任务列表
func (e *ProcessEngine) GetUserTasks(userID uint, status string, offset, limit int) ([]model.TaskInstance, int64, error) {
	return e.taskRepo.GetUserTasks(userID, status, offset, limit)
}

// GetTask 获取任务详情
func (e *ProcessEngine) GetTask(taskID uint) (*model.TaskInstance, error) {
	return e.taskRepo.GetByID(taskID)
}

// ClaimTask 认领任务
func (e *ProcessEngine) ClaimTask(taskID uint, userID uint) error {
	return e.taskRepo.ClaimTask(taskID, userID)
}

// ReleaseTask 释放任务
func (e *ProcessEngine) ReleaseTask(taskID uint, userID uint) error {
	return e.taskRepo.ReleaseTask(taskID, userID)
}

// DelegateTask 委派任务
func (e *ProcessEngine) DelegateTask(taskID uint, fromUserID uint, toUserID uint, comment string) error {
	return e.taskRepo.DelegateTask(taskID, fromUserID, toUserID)
}

// GetTaskForm 获取任务表单定义
func (e *ProcessEngine) GetTaskForm(taskID uint) (interface{}, error) {
	task, err := e.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}

	// 简化处理，直接返回任务信息
	return map[string]interface{}{
		"task":      task,
		"form_data": task.Comment,
	}, nil
}

// SaveTaskForm 保存任务表单数据
func (e *ProcessEngine) SaveTaskForm(taskID uint, userID uint, formData map[string]interface{}) error {
	task, err := e.taskRepo.GetByID(taskID)
	if err != nil {
		return err
	}

	// 验证用户权限
	if task.AssigneeID == nil || *task.AssigneeID != userID {
		return errors.New("用户没有权限保存此任务表单")
	}

	// 序列化表单数据
	formDataJSON, err := json.Marshal(formData)
	if err != nil {
		return err
	}

	// 更新任务表单数据
	task.Comment = string(formDataJSON)
	return e.taskRepo.Update(task)
}

// GetTasksByStatus 根据状态获取任务列表
func (e *ProcessEngine) GetTasksByStatus(status string, offset, limit int) ([]model.TaskInstance, int64, error) {
	return e.taskRepo.GetTasksByStatus(status, offset, limit)
}
