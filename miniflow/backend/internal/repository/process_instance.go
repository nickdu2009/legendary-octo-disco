package repository

import (
	"miniflow/internal/model"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"
	"time"

	"go.uber.org/zap"
)

// ProcessInstanceRepository 流程实例数据访问层
type ProcessInstanceRepository struct {
	db     *database.Database
	logger *logger.Logger
}

// NewProcessInstanceRepository 创建新的流程实例仓库
func NewProcessInstanceRepository(db *database.Database, logger *logger.Logger) *ProcessInstanceRepository {
	return &ProcessInstanceRepository{
		db:     db,
		logger: logger,
	}
}

// Create 创建流程实例
func (r *ProcessInstanceRepository) Create(instance *model.ProcessInstance) error {
	if err := r.db.Create(instance).Error; err != nil {
		r.logger.Error("Failed to create process instance", zap.Error(err))
		return err
	}
	return nil
}

// GetByID 根据ID获取流程实例
func (r *ProcessInstanceRepository) GetByID(id uint) (*model.ProcessInstance, error) {
	var instance model.ProcessInstance
	err := r.db.Preload("Definition").
		Preload("Starter").
		Preload("Tasks").
		Preload("Tasks.Assignee").
		First(&instance, id).Error
	
	if err != nil {
		r.logger.Error("Failed to get process instance by ID", zap.Uint("id", id), zap.Error(err))
		return nil, err
	}
	
	return &instance, nil
}

// Update 更新流程实例
func (r *ProcessInstanceRepository) Update(instance *model.ProcessInstance) error {
	if err := r.db.Save(instance).Error; err != nil {
		r.logger.Error("Failed to update process instance", zap.Uint("id", instance.ID), zap.Error(err))
		return err
	}
	return nil
}

// Delete 删除流程实例
func (r *ProcessInstanceRepository) Delete(id uint) error {
	if err := r.db.Delete(&model.ProcessInstance{}, id).Error; err != nil {
		r.logger.Error("Failed to delete process instance", zap.Uint("id", id), zap.Error(err))
		return err
	}
	return nil
}

// GetByBusinessKey 根据业务键获取流程实例
func (r *ProcessInstanceRepository) GetByBusinessKey(businessKey string) (*model.ProcessInstance, error) {
	var instance model.ProcessInstance
	err := r.db.Preload("Definition").
		Preload("Starter").
		Where("business_key = ?", businessKey).
		First(&instance).Error
	
	if err != nil {
		r.logger.Error("Failed to get process instance by business key", 
			zap.String("business_key", businessKey), zap.Error(err))
		return nil, err
	}
	
	return &instance, nil
}

// List 获取流程实例列表
func (r *ProcessInstanceRepository) List(offset, limit int, filters map[string]interface{}) ([]model.ProcessInstance, int64, error) {
	var instances []model.ProcessInstance
	var total int64

	query := r.db.Preload("Definition").Preload("Starter")

	// 应用过滤条件
	for key, value := range filters {
		switch key {
		case "status":
			query = query.Where("status = ?", value)
		case "definition_id":
			query = query.Where("definition_id = ?", value)
		case "starter_id":
			query = query.Where("starter_id = ?", value)
		case "priority":
			query = query.Where("priority = ?", value)
		case "start_date_from":
			query = query.Where("start_time >= ?", value)
		case "start_date_to":
			query = query.Where("start_time <= ?", value)
		}
	}

	// 获取总数
	if err := query.Model(&model.ProcessInstance{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err := query.Offset(offset).
		Limit(limit).
		Order("start_time DESC").
		Find(&instances).Error

	if err != nil {
		r.logger.Error("Failed to list process instances", zap.Error(err))
		return nil, 0, err
	}

	return instances, total, nil
}

// GetByStatus 根据状态获取流程实例
func (r *ProcessInstanceRepository) GetByStatus(status string) ([]model.ProcessInstance, error) {
	var instances []model.ProcessInstance
	err := r.db.Preload("Definition").
		Preload("Starter").
		Where("status = ?", status).
		Order("start_time DESC").
		Find(&instances).Error
	
	if err != nil {
		r.logger.Error("Failed to get instances by status", zap.String("status", status), zap.Error(err))
		return nil, err
	}
	
	return instances, nil
}

// GetRunningInstances 获取运行中的流程实例
func (r *ProcessInstanceRepository) GetRunningInstances() ([]model.ProcessInstance, error) {
	return r.GetByStatus(model.InstanceStatusRunning)
}

// GetUserInstances 获取用户启动的流程实例
func (r *ProcessInstanceRepository) GetUserInstances(userID uint, offset, limit int) ([]model.ProcessInstance, int64, error) {
	var instances []model.ProcessInstance
	var total int64

	query := r.db.Preload("Definition").
		Where("starter_id = ?", userID)

	// 获取总数
	if err := query.Model(&model.ProcessInstance{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err := query.Offset(offset).
		Limit(limit).
		Order("start_time DESC").
		Find(&instances).Error

	if err != nil {
		r.logger.Error("Failed to get user instances", zap.Uint("user_id", userID), zap.Error(err))
		return nil, 0, err
	}

	return instances, total, nil
}

// GetInstanceStatistics 获取流程实例统计信息
func (r *ProcessInstanceRepository) GetInstanceStatistics() (*InstanceStatistics, error) {
	var stats InstanceStatistics

	// 统计各状态实例数量
	statusCounts := []struct {
		Status string
		Count  int64
	}{}

	err := r.db.Model(&model.ProcessInstance{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Find(&statusCounts).Error

	if err != nil {
		return nil, err
	}

	// 填充统计数据
	for _, sc := range statusCounts {
		switch sc.Status {
		case model.InstanceStatusRunning:
			stats.RunningCount = int(sc.Count)
		case model.InstanceStatusSuspended:
			stats.SuspendedCount = int(sc.Count)
		case model.InstanceStatusCompleted:
			stats.CompletedCount = int(sc.Count)
		case model.InstanceStatusFailed:
			stats.FailedCount = int(sc.Count)
		case model.InstanceStatusCancelled:
			stats.CancelledCount = int(sc.Count)
		}
	}

	// 计算总数
	stats.TotalCount = stats.RunningCount + stats.SuspendedCount + 
		stats.CompletedCount + stats.FailedCount + stats.CancelledCount

	// 统计今日启动的实例数
	today := time.Now().Truncate(24 * time.Hour)
	if err := r.db.Model(&model.ProcessInstance{}).
		Where("start_time >= ?", today).
		Count(&stats.TodayStarted).Error; err != nil {
		r.logger.Warn("Failed to count today started instances", zap.Error(err))
	}

	return &stats, nil
}

// GetInstancesByDateRange 根据时间范围获取流程实例
func (r *ProcessInstanceRepository) GetInstancesByDateRange(startDate, endDate time.Time) ([]model.ProcessInstance, error) {
	var instances []model.ProcessInstance
	err := r.db.Preload("Definition").
		Preload("Starter").
		Where("start_time BETWEEN ? AND ?", startDate, endDate).
		Order("start_time DESC").
		Find(&instances).Error
	
	if err != nil {
		r.logger.Error("Failed to get instances by date range", 
			zap.Time("start_date", startDate),
			zap.Time("end_date", endDate),
			zap.Error(err),
		)
		return nil, err
	}
	
	return instances, nil
}

// InstanceStatistics 流程实例统计信息
type InstanceStatistics struct {
	TotalCount     int   `json:"total_count"`
	RunningCount   int   `json:"running_count"`
	SuspendedCount int   `json:"suspended_count"`
	CompletedCount int   `json:"completed_count"`
	FailedCount    int   `json:"failed_count"`
	CancelledCount int   `json:"cancelled_count"`
	TodayStarted   int64 `json:"today_started"`
}
