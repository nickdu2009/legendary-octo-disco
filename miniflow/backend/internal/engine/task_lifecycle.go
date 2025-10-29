package engine

import (
	"errors"
	"fmt"
	"time"

	"miniflow/internal/model"
	"miniflow/internal/repository"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// TaskLifecycleManager 任务生命周期管理器
type TaskLifecycleManager struct {
	taskRepo *repository.TaskRepository
	engine   *ProcessEngine
	logger   *logger.Logger
}

// NewTaskLifecycleManager 创建任务生命周期管理器
func NewTaskLifecycleManager(
	taskRepo *repository.TaskRepository,
	engine *ProcessEngine,
	logger *logger.Logger,
) *TaskLifecycleManager {
	return &TaskLifecycleManager{
		taskRepo: taskRepo,
		engine:   engine,
		logger:   logger,
	}
}

// CreateTask 创建任务
func (m *TaskLifecycleManager) CreateTask(instance *model.ProcessInstance, nodeID string) (*model.TaskInstance, error) {
	m.logger.Info("Creating task",
		zap.Uint("instance_id", instance.ID),
		zap.String("node_id", nodeID),
	)

	// 获取流程定义数据
	definitionData, err := instance.Definition.GetDefinitionData()
	if err != nil {
		return nil, fmt.Errorf("解析流程定义失败: %v", err)
	}

	// 查找节点
	node := m.engine.findNodeByID(definitionData.Nodes, nodeID)
	if node == nil {
		return nil, fmt.Errorf("找不到节点: %s", nodeID)
	}

	// 创建任务实例
	task := &model.TaskInstance{
		InstanceID:        instance.ID,
		NodeID:            node.ID,
		Name:              node.Name,
		TaskType:          m.getTaskType(node.Type),
		Status:            model.TaskStatusCreated,
		Priority:          instance.Priority,
		EstimatedDuration: 3600, // 默认1小时
		AutoAssign:        false,
		RequiresApproval:  false,
		NotificationSent:  false,
		EscalationLevel:   0,
		ExecutionData:     "{}",
		FormDefinition:    "{}",
		OutputData:        "{}",
		Comment:           "",
		FormData:          "{}",
		ErrorMessage:      "",
		RetryCount:        0,
		MaxRetries:        3,
		ActualDuration:    0,
	}

	// 设置到期时间
	if instance.DueDate != nil {
		task.DueDate = instance.DueDate
	}

	// 保存任务
	if err := m.taskRepo.Create(task); err != nil {
		return nil, fmt.Errorf("创建任务失败: %v", err)
	}

	m.logger.Info("Task created successfully",
		zap.Uint("task_id", task.ID),
		zap.Uint("instance_id", task.InstanceID),
		zap.String("node_id", task.NodeID),
		zap.String("task_type", task.TaskType),
	)

	return task, nil
}

// AssignTask 分配任务
func (m *TaskLifecycleManager) AssignTask(taskID uint, assigneeID uint) error {
	m.logger.Info("Assigning task",
		zap.Uint("task_id", taskID),
		zap.Uint("assignee_id", assigneeID),
	)

	task, err := m.taskRepo.GetByID(taskID)
	if err != nil {
		return fmt.Errorf("获取任务失败: %v", err)
	}

	// 验证任务状态
	if !m.canTransition(task.Status, model.TaskStatusAssigned) {
		return fmt.Errorf("任务状态不允许分配操作: %s", task.Status)
	}

	// 更新任务
	task.AssigneeID = &assigneeID
	task.Status = model.TaskStatusAssigned

	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务失败: %v", err)
	}

	// 通知任务状态变化
	if err := m.notifyTaskStatusChange(task, model.TaskStatusCreated, model.TaskStatusAssigned); err != nil {
		m.logger.Error("Failed to notify task status change", zap.Error(err))
	}

	m.logger.Info("Task assigned successfully",
		zap.Uint("task_id", taskID),
		zap.Uint("assignee_id", assigneeID),
	)

	return nil
}

// ClaimTask 认领任务
func (m *TaskLifecycleManager) ClaimTask(taskID uint, userID uint) error {
	m.logger.Info("Claiming task",
		zap.Uint("task_id", taskID),
		zap.Uint("user_id", userID),
	)

	task, err := m.taskRepo.GetByID(taskID)
	if err != nil {
		return fmt.Errorf("获取任务失败: %v", err)
	}

	// 验证任务状态
	if !m.canTransition(task.Status, model.TaskStatusClaimed) {
		return fmt.Errorf("任务状态不允许认领操作: %s", task.Status)
	}

	// 更新任务
	now := time.Now()
	task.ClaimedBy = &userID
	task.ClaimTime = &now
	task.Status = model.TaskStatusClaimed
	task.StartTime = &now

	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务失败: %v", err)
	}

	// 通知任务状态变化
	if err := m.notifyTaskStatusChange(task, task.Status, model.TaskStatusClaimed); err != nil {
		m.logger.Error("Failed to notify task status change", zap.Error(err))
	}

	m.logger.Info("Task claimed successfully",
		zap.Uint("task_id", taskID),
		zap.Uint("user_id", userID),
	)

	return nil
}

// CompleteTask 完成任务
func (m *TaskLifecycleManager) CompleteTask(taskID uint, userID uint, result map[string]interface{}) error {
	m.logger.Info("Completing task",
		zap.Uint("task_id", taskID),
		zap.Uint("user_id", userID),
	)

	task, err := m.taskRepo.GetByID(taskID)
	if err != nil {
		return fmt.Errorf("获取任务失败: %v", err)
	}

	// 验证任务状态
	if !m.canTransition(task.Status, model.TaskStatusCompleted) {
		return fmt.Errorf("任务状态不允许完成操作: %s", task.Status)
	}

	// 验证用户权限
	if !m.hasTaskPermission(task, userID) {
		return errors.New("用户没有权限完成此任务")
	}

	// 更新任务
	now := time.Now()
	task.Status = model.TaskStatusCompleted
	task.CompleteTime = &now
	task.CompletedBy = &userID

	// 计算实际执行时间
	if task.StartTime != nil {
		task.ActualDuration = int(now.Sub(*task.StartTime).Seconds())
	}

	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务失败: %v", err)
	}

	// 通知任务状态变化
	if err := m.notifyTaskStatusChange(task, task.Status, model.TaskStatusCompleted); err != nil {
		m.logger.Error("Failed to notify task status change", zap.Error(err))
	}

	m.logger.Info("Task completed successfully",
		zap.Uint("task_id", taskID),
		zap.Uint("user_id", userID),
	)

	return nil
}

// HandleTaskTimeout 处理任务超时
func (m *TaskLifecycleManager) HandleTaskTimeout(taskID uint) error {
	m.logger.Info("Handling task timeout", zap.Uint("task_id", taskID))

	task, err := m.taskRepo.GetByID(taskID)
	if err != nil {
		return fmt.Errorf("获取任务失败: %v", err)
	}

	// 检查任务是否真的超时
	if task.DueDate == nil || time.Now().Before(*task.DueDate) {
		return errors.New("任务未超时")
	}

	// 更新任务状态
	task.Status = model.TaskStatusFailed
	task.ErrorMessage = "任务超时"

	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务失败: %v", err)
	}

	// 通知任务状态变化
	if err := m.notifyTaskStatusChange(task, task.Status, model.TaskStatusFailed); err != nil {
		m.logger.Error("Failed to notify task status change", zap.Error(err))
	}

	m.logger.Info("Task timeout handled",
		zap.Uint("task_id", taskID),
	)

	return nil
}

// HandleTaskEscalation 处理任务升级
func (m *TaskLifecycleManager) HandleTaskEscalation(taskID uint) error {
	m.logger.Info("Handling task escalation", zap.Uint("task_id", taskID))

	task, err := m.taskRepo.GetByID(taskID)
	if err != nil {
		return fmt.Errorf("获取任务失败: %v", err)
	}

	// 增加升级级别
	task.EscalationLevel++

	// 更新任务
	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务失败: %v", err)
	}

	// 通知任务状态变化
	if err := m.notifyTaskStatusChange(task, task.Status, task.Status); err != nil {
		m.logger.Error("Failed to notify task status change", zap.Error(err))
	}

	m.logger.Info("Task escalation handled",
		zap.Uint("task_id", taskID),
		zap.Int("escalation_level", task.EscalationLevel),
	)

	return nil
}

// validateTransition 验证任务状态转换
func (m *TaskLifecycleManager) validateTransition(from, to string) error {
	if !m.canTransition(from, to) {
		return fmt.Errorf("无效的状态转换: %s -> %s", from, to)
	}
	return nil
}

// canTransition 检查是否可以进行状态转换
func (m *TaskLifecycleManager) canTransition(from, to string) bool {
	// 定义允许的状态转换
	allowedTransitions := map[string][]string{
		model.TaskStatusCreated:    {model.TaskStatusAssigned, model.TaskStatusClaimed, model.TaskStatusFailed},
		model.TaskStatusAssigned:   {model.TaskStatusClaimed, model.TaskStatusFailed},
		model.TaskStatusClaimed:    {model.TaskStatusInProgress, model.TaskStatusCompleted, model.TaskStatusFailed},
		model.TaskStatusInProgress: {model.TaskStatusCompleted, model.TaskStatusFailed},
		model.TaskStatusCompleted:  {},
		model.TaskStatusFailed:     {},
		model.TaskStatusSkipped:    {},
	}

	allowed, exists := allowedTransitions[from]
	if !exists {
		return false
	}

	// 允许转换到自身状态
	if from == to {
		return true
	}

	// 检查目标状态是否在允许列表中
	for _, status := range allowed {
		if status == to {
			return true
		}
	}

	return false
}

// notifyTaskStatusChange 通知任务状态变化
func (m *TaskLifecycleManager) notifyTaskStatusChange(task *model.TaskInstance, oldStatus, newStatus string) error {
	// TODO: 实现通知逻辑，例如发送事件、邮件等
	m.logger.Info("Task status changed",
		zap.Uint("task_id", task.ID),
		zap.String("old_status", oldStatus),
		zap.String("new_status", newStatus),
	)
	return nil
}

// hasTaskPermission 检查用户是否有任务权限
func (m *TaskLifecycleManager) hasTaskPermission(task *model.TaskInstance, userID uint) bool {
	// 检查是否是指定处理人
	if task.AssigneeID != nil && *task.AssigneeID == userID {
		return true
	}

	// 检查是否是认领人
	if task.ClaimedBy != nil && *task.ClaimedBy == userID {
		return true
	}

	return false
}

// getTaskType 根据节点类型获取任务类型
func (m *TaskLifecycleManager) getTaskType(nodeType string) string {
	switch nodeType {
	case "userTask":
		return model.TaskTypeUser
	case "serviceTask":
		return model.TaskTypeService
	default:
		return model.TaskTypeUser
	}
}
