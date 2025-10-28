package repository

import (
	"errors"
	"time"

	"miniflow/internal/model"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// TaskRepository 任务数据访问层
type TaskRepository struct {
	db     *database.Database
	logger *logger.Logger
}

// NewTaskRepository 创建新的任务仓库
func NewTaskRepository(db *database.Database, logger *logger.Logger) *TaskRepository {
	return &TaskRepository{
		db:     db,
		logger: logger,
	}
}

// Create 创建任务实例
func (r *TaskRepository) Create(task *model.TaskInstance) error {
	if err := r.db.Create(task).Error; err != nil {
		r.logger.Error("Failed to create task instance", zap.Error(err))
		return err
	}
	return nil
}

// GetByID 根据ID获取任务实例
func (r *TaskRepository) GetByID(id uint) (*model.TaskInstance, error) {
	var task model.TaskInstance
	err := r.db.Preload("Instance").
		Preload("Assignee").
		Preload("ClaimedUser").
		Preload("CompletedUser").
		First(&task, id).Error

	if err != nil {
		r.logger.Error("Failed to get task by ID", zap.Uint("id", id), zap.Error(err))
		return nil, err
	}

	return &task, nil
}

// Update 更新任务实例
func (r *TaskRepository) Update(task *model.TaskInstance) error {
	if err := r.db.Save(task).Error; err != nil {
		r.logger.Error("Failed to update task instance", zap.Uint("id", task.ID), zap.Error(err))
		return err
	}
	return nil
}

// Delete 删除任务实例
func (r *TaskRepository) Delete(id uint) error {
	if err := r.db.Delete(&model.TaskInstance{}, id).Error; err != nil {
		r.logger.Error("Failed to delete task instance", zap.Uint("id", id), zap.Error(err))
		return err
	}
	return nil
}

// GetByInstance 获取流程实例的所有任务
func (r *TaskRepository) GetByInstance(instanceID uint) ([]model.TaskInstance, error) {
	var tasks []model.TaskInstance
	err := r.db.Preload("Assignee").
		Preload("ClaimedUser").
		Preload("CompletedUser").
		Where("instance_id = ?", instanceID).
		Order("created_at ASC").
		Find(&tasks).Error

	if err != nil {
		r.logger.Error("Failed to get tasks by instance", zap.Uint("instance_id", instanceID), zap.Error(err))
		return nil, err
	}

	return tasks, nil
}

// GetByInstanceAndNode 获取指定流程实例和节点的任务
func (r *TaskRepository) GetByInstanceAndNode(instanceID uint, nodeID string, statuses []string) ([]model.TaskInstance, error) {
	var tasks []model.TaskInstance
	query := r.db.Preload("Assignee").
		Preload("ClaimedUser").
		Preload("CompletedUser").
		Where("instance_id = ? AND node_id = ?", instanceID, nodeID)

	if len(statuses) > 0 {
		query = query.Where("status IN ?", statuses)
	}

	err := query.Find(&tasks).Error
	if err != nil {
		r.logger.Error("Failed to get tasks by instance and node",
			zap.Uint("instance_id", instanceID),
			zap.String("node_id", nodeID),
			zap.Error(err),
		)
		return nil, err
	}

	return tasks, nil
}

// GetUserTasks 获取用户的任务列表
func (r *TaskRepository) GetUserTasks(userID uint, status string, offset, limit int) ([]model.TaskInstance, int64, error) {
	var tasks []model.TaskInstance
	var total int64

	query := r.db.Preload("Instance").
		Preload("Instance.Definition").
		Preload("Assignee").
		Where("assignee_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	// 获取总数
	if err := query.Model(&model.TaskInstance{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err := query.Offset(offset).
		Limit(limit).
		Order("priority DESC, created_at DESC").
		Find(&tasks).Error

	if err != nil {
		r.logger.Error("Failed to get user tasks", zap.Uint("user_id", userID), zap.Error(err))
		return nil, 0, err
	}

	return tasks, total, nil
}

// CountUserActiveTasks 统计用户活跃任务数
func (r *TaskRepository) CountUserActiveTasks(userID uint) (int, error) {
	var count int64
	err := r.db.Model(&model.TaskInstance{}).
		Where("assignee_id = ? AND status IN ?", userID, []string{
			model.TaskStatusAssigned,
			model.TaskStatusClaimed,
			model.TaskStatusInProgress,
		}).
		Count(&count).Error

	if err != nil {
		r.logger.Error("Failed to count user active tasks", zap.Uint("user_id", userID), zap.Error(err))
		return 0, err
	}

	return int(count), nil
}

// GetTasksByStatus 根据状态获取任务列表
func (r *TaskRepository) GetTasksByStatus(status string, offset, limit int) ([]model.TaskInstance, int64, error) {
	var tasks []model.TaskInstance
	var total int64

	query := r.db.Preload("Instance").
		Preload("Instance.Definition").
		Preload("Assignee").
		Where("status = ?", status)

	// 获取总数
	if err := query.Model(&model.TaskInstance{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err := query.Offset(offset).
		Limit(limit).
		Order("priority DESC, created_at DESC").
		Find(&tasks).Error

	if err != nil {
		r.logger.Error("Failed to get tasks by status", zap.String("status", status), zap.Error(err))
		return nil, 0, err
	}

	return tasks, total, nil
}

// GetOverdueTasks 获取超期任务
func (r *TaskRepository) GetOverdueTasks() ([]model.TaskInstance, error) {
	var tasks []model.TaskInstance
	now := time.Now()

	err := r.db.Preload("Instance").
		Preload("Assignee").
		Where("due_date < ? AND status IN ?", now, []string{
			model.TaskStatusAssigned,
			model.TaskStatusClaimed,
			model.TaskStatusInProgress,
		}).
		Find(&tasks).Error

	if err != nil {
		r.logger.Error("Failed to get overdue tasks", zap.Error(err))
		return nil, err
	}

	return tasks, nil
}

// ClaimTask 认领任务
func (r *TaskRepository) ClaimTask(taskID uint, userID uint) error {
	now := time.Now()
	result := r.db.Model(&model.TaskInstance{}).
		Where("id = ? AND status = ? AND (assignee_id = ? OR assignee_id IS NULL)",
			taskID, model.TaskStatusAssigned, userID).
		Updates(map[string]interface{}{
			"status":     model.TaskStatusClaimed,
			"claimed_by": userID,
			"claim_time": now,
			"start_time": now,
		})

	if result.Error != nil {
		r.logger.Error("Failed to claim task", zap.Uint("task_id", taskID), zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("任务不存在或状态不允许认领")
	}

	return nil
}

// ReleaseTask 释放任务
func (r *TaskRepository) ReleaseTask(taskID uint, userID uint) error {
	result := r.db.Model(&model.TaskInstance{}).
		Where("id = ? AND claimed_by = ? AND status = ?",
			taskID, userID, model.TaskStatusClaimed).
		Updates(map[string]interface{}{
			"status":     model.TaskStatusAssigned,
			"claimed_by": nil,
			"claim_time": nil,
			"start_time": nil,
		})

	if result.Error != nil {
		r.logger.Error("Failed to release task", zap.Uint("task_id", taskID), zap.Error(result.Error))
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("任务不存在或状态不允许释放")
	}

	return nil
}

// DelegateTask 委派任务
func (r *TaskRepository) DelegateTask(taskID uint, fromUserID uint, toUserID uint) error {
	result := r.db.Model(&model.TaskInstance{}).
		Where("id = ? AND assignee_id = ?", taskID, fromUserID).
		Updates(map[string]interface{}{
			"assignee_id": toUserID,
			"status":      model.TaskStatusAssigned,
			"claimed_by":  nil,
			"claim_time":  nil,
		})

	if result.Error != nil {
		r.logger.Error("Failed to delegate task",
			zap.Uint("task_id", taskID),
			zap.Uint("from_user", fromUserID),
			zap.Uint("to_user", toUserID),
			zap.Error(result.Error),
		)
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("任务不存在或用户没有权限委派")
	}

	return nil
}

// GetTaskStatistics 获取任务统计信息
func (r *TaskRepository) GetTaskStatistics() (*TaskStatistics, error) {
	var stats TaskStatistics

	// 统计各状态任务数量
	statusCounts := []struct {
		Status string
		Count  int64
	}{}

	err := r.db.Model(&model.TaskInstance{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Find(&statusCounts).Error

	if err != nil {
		return nil, err
	}

	// 填充统计数据
	for _, sc := range statusCounts {
		switch sc.Status {
		case model.TaskStatusCreated:
			stats.CreatedCount = int(sc.Count)
		case model.TaskStatusAssigned:
			stats.AssignedCount = int(sc.Count)
		case model.TaskStatusClaimed:
			stats.ClaimedCount = int(sc.Count)
		case model.TaskStatusInProgress:
			stats.InProgressCount = int(sc.Count)
		case model.TaskStatusCompleted:
			stats.CompletedCount = int(sc.Count)
		case model.TaskStatusFailed:
			stats.FailedCount = int(sc.Count)
		}
	}

	// 计算总数
	stats.TotalCount = stats.CreatedCount + stats.AssignedCount + stats.ClaimedCount +
		stats.InProgressCount + stats.CompletedCount + stats.FailedCount

	return &stats, nil
}

// TaskStatistics 任务统计信息
type TaskStatistics struct {
	TotalCount      int `json:"total_count"`
	CreatedCount    int `json:"created_count"`
	AssignedCount   int `json:"assigned_count"`
	ClaimedCount    int `json:"claimed_count"`
	InProgressCount int `json:"in_progress_count"`
	CompletedCount  int `json:"completed_count"`
	FailedCount     int `json:"failed_count"`
}
