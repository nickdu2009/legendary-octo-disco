package engine

import (
	"time"

	"miniflow/internal/model"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// ServiceExecutor 服务任务执行器
type ServiceExecutor struct {
	db     *database.Database
	logger *logger.Logger
}

// NewServiceExecutor 创建服务任务执行器
func NewServiceExecutor(db *database.Database, logger *logger.Logger) *ServiceExecutor {
	return &ServiceExecutor{
		db:     db,
		logger: logger,
	}
}

// ExecuteService 执行服务任务
func (e *ServiceExecutor) ExecuteService(task *model.TaskInstance) error {
	e.logger.Info("Executing service task", zap.Uint("task_id", task.ID))

	// 简单的占位符实现
	// 实际使用时可以根据需要扩展
	time.Sleep(100 * time.Millisecond) // 模拟执行时间

	e.logger.Info("Service task completed successfully",
		zap.Uint("task_id", task.ID),
		zap.String("task_type", task.TaskType),
	)

	return nil
}
