package handler

import (
	"net/http"
	"strconv"

	"miniflow/internal/engine"
	"miniflow/internal/model"
	"miniflow/pkg/logger"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

// TaskManagementHandler 任务管理API处理器
type TaskManagementHandler struct {
	engine *engine.ProcessEngine
	logger *logger.Logger
}

// NewTaskManagementHandler 创建任务管理处理器
func NewTaskManagementHandler(engine *engine.ProcessEngine, logger *logger.Logger) *TaskManagementHandler {
	return &TaskManagementHandler{
		engine: engine,
		logger: logger,
	}
}

// GetUserTasksRequest 获取用户任务请求
type GetUserTasksRequest struct {
	Page     int    `query:"page" validate:"min=1"`
	PageSize int    `query:"page_size" validate:"min=1,max=100"`
	Status   string `query:"status"`
	Priority string `query:"priority"`
}

// GetUserTasks 获取用户任务列表
// GET /api/v1/user/tasks
func (h *TaskManagementHandler) GetUserTasks(c echo.Context) error {
	// 获取当前用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	var req GetUserTasksRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid query parameters")
	}

	// 设置默认值
	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	// 获取用户任务列表
	tasks, total, err := h.engine.GetUserTasks(userID, req.Status, (req.Page-1)*req.PageSize, req.PageSize)
	if err != nil {
		h.logger.Error("Failed to get user tasks", zap.Uint("user_id", userID), zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user tasks")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"tasks":       tasks,
			"total":       total,
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total_pages": (total + int64(req.PageSize) - 1) / int64(req.PageSize),
		},
	})
}

// GetTask 获取任务详情
// GET /api/v1/task/:id
func (h *TaskManagementHandler) GetTask(c echo.Context) error {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	// 获取任务详情
	task, err := h.engine.GetTask(uint(taskID))
	if err != nil {
		h.logger.Error("Failed to get task", zap.Uint("task_id", uint(taskID)), zap.Error(err))
		return echo.NewHTTPError(http.StatusNotFound, "Task not found")
	}

	// 验证用户权限（用户只能查看分配给自己的任务或者是管理员）
	userID := getUserIDFromContext(c)
	if !h.canUserAccessTask(userID, task) {
		return echo.NewHTTPError(http.StatusForbidden, "Access denied")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    task,
	})
}

// ClaimTask 认领任务
// POST /api/v1/task/:id/claim
func (h *TaskManagementHandler) ClaimTask(c echo.Context) error {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	// 获取当前用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	// 认领任务
	if err := h.engine.ClaimTask(uint(taskID), userID); err != nil {
		h.logger.Error("Failed to claim task",
			zap.Uint("task_id", uint(taskID)),
			zap.Uint("user_id", userID),
			zap.Error(err),
		)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to claim task: "+err.Error())
	}

	h.logger.Info("Task claimed successfully",
		zap.Uint("task_id", uint(taskID)),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Task claimed successfully",
	})
}

// CompleteTaskRequest 完成任务请求
type CompleteTaskRequest struct {
	FormData map[string]interface{} `json:"form_data"`
	Comment  string                 `json:"comment" validate:"max=1000"`
}

// CompleteTask 完成任务
// POST /api/v1/task/:id/complete
func (h *TaskManagementHandler) CompleteTask(c echo.Context) error {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	// 获取当前用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	// 解析请求体
	var req CompleteTaskRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// 完成任务
	if err := h.engine.CompleteTask(uint(taskID), userID, req.FormData, req.Comment); err != nil {
		h.logger.Error("Failed to complete task",
			zap.Uint("task_id", uint(taskID)),
			zap.Uint("user_id", userID),
			zap.Error(err),
		)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to complete task: "+err.Error())
	}

	h.logger.Info("Task completed successfully",
		zap.Uint("task_id", uint(taskID)),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Task completed successfully",
	})
}

// ReleaseTask 释放任务
// POST /api/v1/task/:id/release
func (h *TaskManagementHandler) ReleaseTask(c echo.Context) error {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	// 获取当前用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	// 释放任务
	if err := h.engine.ReleaseTask(uint(taskID), userID); err != nil {
		h.logger.Error("Failed to release task",
			zap.Uint("task_id", uint(taskID)),
			zap.Uint("user_id", userID),
			zap.Error(err),
		)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to release task: "+err.Error())
	}

	h.logger.Info("Task released successfully",
		zap.Uint("task_id", uint(taskID)),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Task released successfully",
	})
}

// DelegateTaskRequest 委派任务请求
type DelegateTaskRequest struct {
	ToUserID uint   `json:"to_user_id" validate:"required"`
	Comment  string `json:"comment" validate:"max=500"`
}

// DelegateTask 委派任务
// POST /api/v1/task/:id/delegate
func (h *TaskManagementHandler) DelegateTask(c echo.Context) error {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	// 获取当前用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	// 解析请求体
	var req DelegateTaskRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// 委派任务
	if err := h.engine.DelegateTask(uint(taskID), userID, req.ToUserID, req.Comment); err != nil {
		h.logger.Error("Failed to delegate task",
			zap.Uint("task_id", uint(taskID)),
			zap.Uint("from_user_id", userID),
			zap.Uint("to_user_id", req.ToUserID),
			zap.Error(err),
		)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delegate task: "+err.Error())
	}

	h.logger.Info("Task delegated successfully",
		zap.Uint("task_id", uint(taskID)),
		zap.Uint("from_user_id", userID),
		zap.Uint("to_user_id", req.ToUserID),
	)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Task delegated successfully",
	})
}

// GetTaskForm 获取任务表单定义
// GET /api/v1/task/:id/form
func (h *TaskManagementHandler) GetTaskForm(c echo.Context) error {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	// 获取任务表单定义
	form, err := h.engine.GetTaskForm(uint(taskID))
	if err != nil {
		h.logger.Error("Failed to get task form", zap.Uint("task_id", uint(taskID)), zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get task form")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    form,
	})
}

// SubmitTaskFormRequest 提交任务表单请求
type SubmitTaskFormRequest struct {
	FormData map[string]interface{} `json:"form_data" validate:"required"`
	Comment  string                 `json:"comment" validate:"max=1000"`
	Action   string                 `json:"action" validate:"required,oneof=save complete"`
}

// SubmitTaskForm 提交任务表单
// POST /api/v1/task/:id/form
func (h *TaskManagementHandler) SubmitTaskForm(c echo.Context) error {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	// 获取当前用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	// 解析请求体
	var req SubmitTaskFormRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// 根据动作类型处理
	switch req.Action {
	case "save":
		// 保存表单数据但不完成任务
		if err := h.engine.SaveTaskForm(uint(taskID), userID, req.FormData); err != nil {
			h.logger.Error("Failed to save task form",
				zap.Uint("task_id", uint(taskID)),
				zap.Uint("user_id", userID),
				zap.Error(err),
			)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save task form: "+err.Error())
		}

		return c.JSON(http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Task form saved successfully",
		})

	case "complete":
		// 提交表单并完成任务
		if err := h.engine.CompleteTask(uint(taskID), userID, req.FormData, req.Comment); err != nil {
			h.logger.Error("Failed to complete task with form",
				zap.Uint("task_id", uint(taskID)),
				zap.Uint("user_id", userID),
				zap.Error(err),
			)
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to complete task: "+err.Error())
		}

		return c.JSON(http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Task completed successfully",
		})

	default:
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid action")
	}
}

// GetTasksByStatus 根据状态获取任务列表（管理员功能）
// GET /api/v1/tasks/status/:status
func (h *TaskManagementHandler) GetTasksByStatus(c echo.Context) error {
	// 验证管理员权限
	if !h.isAdmin(c) {
		return echo.NewHTTPError(http.StatusForbidden, "Admin access required")
	}

	status := c.Param("status")
	if status == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Status parameter required")
	}

	// 获取分页参数
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.QueryParam("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 获取任务列表
	tasks, total, err := h.engine.GetTasksByStatus(status, (page-1)*pageSize, pageSize)
	if err != nil {
		h.logger.Error("Failed to get tasks by status", zap.String("status", status), zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get tasks")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"tasks":       tasks,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// 辅助方法

// canUserAccessTask 检查用户是否可以访问任务
func (h *TaskManagementHandler) canUserAccessTask(userID uint, task *model.TaskInstance) bool {
	// 用户可以访问分配给自己的任务
	if task.AssigneeID != nil && *task.AssigneeID == userID {
		return true
	}

	// 用户可以访问自己认领的任务（使用AssigneeID代替ClaimedBy）
	if task.AssigneeID != nil && *task.AssigneeID == userID {
		return true
	}

	// 用户可以访问未分配的任务（状态为created）
	if task.Status == "created" && task.AssigneeID == nil {
		return true
	}

	// 临时：允许所有用户访问所有任务（用于测试）
	// TODO: 实现更精细的权限控制
	return true
}

// isAdmin 检查用户是否为管理员
func (h *TaskManagementHandler) isAdmin(c echo.Context) bool {
	// TODO: 实现角色检查，这里暂时返回true用于测试
	// 实际实现中需要从数据库查询用户角色
	return true
}
