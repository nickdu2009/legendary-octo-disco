package engine

import (
	"encoding/json"
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
	logger   *logger.Logger
}

// NewTaskLifecycleManager 创建任务生命周期管理器
func NewTaskLifecycleManager(
	taskRepo *repository.TaskRepository,
	logger *logger.Logger,
) *TaskLifecycleManager {
	return &TaskLifecycleManager{
		taskRepo: taskRepo,
		logger:   logger,
	}
}

// CreateTask 创建任务
func (m *TaskLifecycleManager) CreateTask(instance *model.ProcessInstance, nodeID string) (*model.TaskInstance, error) {
	m.logger.Info("Creating task",
		zap.Uint("instance_id", instance.ID),
		zap.String("node_id", nodeID),
	)

	// 简化的任务创建逻辑
	task := &model.TaskInstance{
		InstanceID: instance.ID,
		NodeID:     nodeID,
		Name:       nodeID, // 简化处理，使用节点ID作为名称
		Status:     model.TaskStatusCreated,
		Priority:   50, // 默认优先级
	}

	// 保存任务
	if err := m.taskRepo.Create(task); err != nil {
		return nil, fmt.Errorf("创建任务失败: %v", err)
	}

	m.logger.Info("Task created successfully",
		zap.Uint("task_id", task.ID),
		zap.Uint("instance_id", task.InstanceID),
		zap.String("node_id", task.NodeID),
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

	// 更新任务
	task.AssigneeID = &assigneeID
	task.Status = model.TaskStatusAssigned

	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务失败: %v", err)
	}

	m.logger.Info("Task assigned successfully",
		zap.Uint("task_id", taskID),
		zap.Uint("assignee_id", assigneeID),
	)

	return nil
}

// CompleteTask 完成任务
func (m *TaskLifecycleManager) CompleteTask(taskID uint, userID uint, formData map[string]interface{}, comment string) error {
	m.logger.Info("Completing task",
		zap.Uint("task_id", taskID),
		zap.Uint("user_id", userID),
	)

	task, err := m.taskRepo.GetByID(taskID)
	if err != nil {
		return fmt.Errorf("获取任务失败: %v", err)
	}

	// 验证用户权限
	if task.AssigneeID == nil || *task.AssigneeID != userID {
		return errors.New("用户没有权限完成此任务")
	}

	// 更新任务
	now := time.Now()
	task.Status = model.TaskStatusCompleted
	task.CompleteTime = &now
	task.Comment = comment

	// 序列化表单数据
	if formData != nil {
		if formDataJSON, err := json.Marshal(formData); err == nil {
			task.FormData = string(formDataJSON)
		}
	}

	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务失败: %v", err)
	}

	m.logger.Info("Task completed successfully",
		zap.Uint("task_id", taskID),
		zap.Uint("user_id", userID),
	)

	return nil
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
