package engine

import (
	"fmt"

	"miniflow/internal/model"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// ProcessStateMachine 流程实例状态机
type ProcessStateMachine struct {
	engine *ProcessEngine
	logger *logger.Logger
}

// NewProcessStateMachine 创建流程实例状态机
func NewProcessStateMachine(engine *ProcessEngine, logger *logger.Logger) *ProcessStateMachine {
	return &ProcessStateMachine{
		engine: engine,
		logger: logger,
	}
}

// TransitionTo 转换流程实例状态
func (sm *ProcessStateMachine) TransitionTo(instance *model.ProcessInstance, newStatus string, reason string) error {
	// 验证状态转换是否有效
	if !sm.CanTransition(instance.Status, newStatus) {
		return fmt.Errorf("无效的状态转换: %s -> %s", instance.Status, newStatus)
	}

	oldStatus := instance.Status
	instance.Status = newStatus

	// 根据新状态执行特定处理
	switch newStatus {
	case model.InstanceStatusRunning:
		return sm.handleRunningState(instance)
	case model.InstanceStatusSuspended:
		return sm.handleSuspendedState(instance, reason)
	case model.InstanceStatusCompleted:
		return sm.handleCompletedState(instance)
	case model.InstanceStatusFailed:
		return sm.handleFailedState(instance, reason)
	case model.InstanceStatusCancelled:
		return sm.handleCancelledState(instance, reason)
	}

	// 更新实例状态
	if err := sm.engine.instanceRepo.Update(instance); err != nil {
		return fmt.Errorf("更新流程实例状态失败: %v", err)
	}

	// 记录状态转换日志
	sm.logger.Info("Process instance status transition",
		zap.Uint("instance_id", instance.ID),
		zap.String("old_status", oldStatus),
		zap.String("new_status", newStatus),
		zap.String("reason", reason),
	)

	return nil
}

// CanTransition 检查是否可以进行状态转换
func (sm *ProcessStateMachine) CanTransition(from, to string) bool {
	// 定义允许的状态转换
	allowedTransitions := map[string][]string{
		model.InstanceStatusRunning: {
			model.InstanceStatusSuspended,
			model.InstanceStatusCompleted,
			model.InstanceStatusFailed,
			model.InstanceStatusCancelled,
		},
		model.InstanceStatusSuspended: {
			model.InstanceStatusRunning,
			model.InstanceStatusCancelled,
		},
		model.InstanceStatusCompleted: {},
		model.InstanceStatusFailed: {
			model.InstanceStatusRunning,
		},
		model.InstanceStatusCancelled: {},
	}

	// 允许转换到自身状态
	if from == to {
		return true
	}

	// 检查目标状态是否在允许列表中
	if allowed, exists := allowedTransitions[from]; exists {
		for _, status := range allowed {
			if status == to {
				return true
			}
		}
	}

	return false
}

// GetAvailableTransitions 获取可用的状态转换
func (sm *ProcessStateMachine) GetAvailableTransitions(currentStatus string) []string {
	allowedTransitions := map[string][]string{
		model.InstanceStatusRunning: {
			model.InstanceStatusSuspended,
			model.InstanceStatusCompleted,
			model.InstanceStatusFailed,
			model.InstanceStatusCancelled,
		},
		model.InstanceStatusSuspended: {
			model.InstanceStatusRunning,
			model.InstanceStatusCancelled,
		},
		model.InstanceStatusCompleted: {},
		model.InstanceStatusFailed: {
			model.InstanceStatusRunning,
		},
		model.InstanceStatusCancelled: {},
	}

	if transitions, exists := allowedTransitions[currentStatus]; exists {
		return transitions
	}

	return []string{}
}

// handleRunningState 处理运行中状态
func (sm *ProcessStateMachine) handleRunningState(instance *model.ProcessInstance) error {
	sm.logger.Info("Handling process instance running state",
		zap.Uint("instance_id", instance.ID),
	)

	// 清除暂停原因
	instance.SuspendReason = ""

	return nil
}

// handleSuspendedState 处理暂停状态
func (sm *ProcessStateMachine) handleSuspendedState(instance *model.ProcessInstance, reason string) error {
	sm.logger.Info("Handling process instance suspended state",
		zap.Uint("instance_id", instance.ID),
		zap.String("reason", reason),
	)

	// 设置暂停原因
	instance.SuspendReason = reason

	return nil
}

// handleCompletedState 处理已完成状态
func (sm *ProcessStateMachine) handleCompletedState(instance *model.ProcessInstance) error {
	sm.logger.Info("Handling process instance completed state",
		zap.Uint("instance_id", instance.ID),
	)

	// 设置结束时间
	if instance.EndTime == nil {
		now := instance.UpdatedAt
		instance.EndTime = &now
	}

	return nil
}

// handleFailedState 处理失败状态
func (sm *ProcessStateMachine) handleFailedState(instance *model.ProcessInstance, reason string) error {
	sm.logger.Info("Handling process instance failed state",
		zap.Uint("instance_id", instance.ID),
		zap.String("reason", reason),
	)

	// 设置失败原因
	instance.SuspendReason = reason

	return nil
}

// handleCancelledState 处理已取消状态
func (sm *ProcessStateMachine) handleCancelledState(instance *model.ProcessInstance, reason string) error {
	sm.logger.Info("Handling process instance cancelled state",
		zap.Uint("instance_id", instance.ID),
		zap.String("reason", reason),
	)

	// 设置取消原因
	instance.SuspendReason = reason

	// 设置结束时间
	if instance.EndTime == nil {
		now := instance.UpdatedAt
		instance.EndTime = &now
	}

	return nil
}

// ValidateTransition 验证状态转换
func (sm *ProcessStateMachine) ValidateTransition(from, to string) error {
	if !sm.CanTransition(from, to) {
		return fmt.Errorf("无效的状态转换: %s -> %s", from, to)
	}
	return nil
}
