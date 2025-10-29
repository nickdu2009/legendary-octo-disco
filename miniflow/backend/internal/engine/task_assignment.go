package engine

import (
	"errors"
	"fmt"

	"miniflow/internal/model"
	"miniflow/internal/repository"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// TaskAssignmentManager 任务分配管理器
type TaskAssignmentManager struct {
	userRepo *repository.UserRepository
	taskRepo *repository.TaskRepository
	logger   *logger.Logger
}

// NewTaskAssignmentManager 创建任务分配管理器
func NewTaskAssignmentManager(
	userRepo *repository.UserRepository,
	taskRepo *repository.TaskRepository,
	logger *logger.Logger,
) *TaskAssignmentManager {
	return &TaskAssignmentManager{
		userRepo: userRepo,
		taskRepo: taskRepo,
		logger:   logger,
	}
}

// AssignTask 分配任务
func (m *TaskAssignmentManager) AssignTask(task *model.TaskInstance) error {
	// 获取可分配的用户
	availableUsers, err := m.getAvailableUsers(task)
	if err != nil {
		return fmt.Errorf("获取可分配用户失败: %v", err)
	}

	if len(availableUsers) == 0 {
		return errors.New("没有可分配的用户")
	}

	// 直接分配给第一个用户
	selectedUser := availableUsers[0]
	task.AssigneeID = &selectedUser.ID
	task.Status = model.TaskStatusAssigned

	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务分配失败: %v", err)
	}

	m.logger.Info("Task assigned successfully",
		zap.Uint("task_id", task.ID),
		zap.Uint("assignee_id", selectedUser.ID),
	)

	return nil
}

// getAvailableUsers 获取可分配的用户
func (m *TaskAssignmentManager) getAvailableUsers(task *model.TaskInstance) ([]*model.User, error) {
	// 获取所有活跃用户
	users, err := m.userRepo.GetActiveUsers()
	if err != nil {
		return nil, err
	}

	// 如果任务已经指定了分配人，只返回该用户
	if task.AssigneeID != nil {
		for _, user := range users {
			if user.ID == *task.AssigneeID {
				return []*model.User{&user}, nil
			}
		}
	}

	var availableUsers []*model.User
	for i := range users {
		if m.isUserAvailable(&users[i], task) {
			availableUsers = append(availableUsers, &users[i])
		}
	}

	return availableUsers, nil
}

// isUserAvailable 检查用户是否可分配
func (m *TaskAssignmentManager) isUserAvailable(user *model.User, task *model.TaskInstance) bool {
	// 检查用户状态
	if user.Status != "active" {
		return false
	}

	// 检查用户角色权限
	// TODO: 实现更复杂的权限检查

	return true
}
