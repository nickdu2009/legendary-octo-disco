package handler

import (
	"net/http"
	"strconv"
	"time"

	"miniflow/internal/engine"
	"miniflow/internal/model"
	"miniflow/pkg/logger"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

// ProcessExecutionHandler 流程执行API处理器
type ProcessExecutionHandler struct {
	engine *engine.ProcessEngine
	logger *logger.Logger
}

// NewProcessExecutionHandler 创建流程执行处理器
func NewProcessExecutionHandler(engine *engine.ProcessEngine, logger *logger.Logger) *ProcessExecutionHandler {
	return &ProcessExecutionHandler{
		engine: engine,
		logger: logger,
	}
}

// StartProcessRequest 启动流程请求
type StartProcessRequest struct {
	BusinessKey  string                 `json:"business_key" validate:"required,min=1,max=255"`
	Title        string                 `json:"title" validate:"max=255"`
	Description  string                 `json:"description"`
	Variables    map[string]interface{} `json:"variables"`
	Priority     int                    `json:"priority" validate:"min=1,max=100"`
	DueDate      *time.Time             `json:"due_date"`
	Tags         []string               `json:"tags"`
}

// StartProcess 启动流程实例
// POST /api/v1/process/:id/start
func (h *ProcessExecutionHandler) StartProcess(c echo.Context) error {
	h.logger.Info("Starting process execution API call")

	// 解析流程定义ID
	processIDStr := c.Param("id")
	processID, err := strconv.ParseUint(processIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid process ID", zap.String("id", processIDStr), zap.Error(err))
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid process ID")
	}

	// 解析请求体
	var req StartProcessRequest
	if err := c.Bind(&req); err != nil {
		h.logger.Error("Failed to bind request", zap.Error(err))
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// 验证请求参数
	if err := c.Validate(&req); err != nil {
		h.logger.Error("Request validation failed", zap.Error(err))
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// 获取当前用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		h.logger.Error("User ID not found in context")
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	// 构建启动请求
	startReq := &engine.StartProcessRequest{
		DefinitionID: uint(processID),
		BusinessKey:  req.BusinessKey,
		Title:        req.Title,
		Description:  req.Description,
		Variables:    req.Variables,
		Priority:     req.Priority,
		DueDate:      req.DueDate,
		Tags:         req.Tags,
	}

	// 启动流程实例
	instance, err := h.engine.StartProcess(startReq, userID)
	if err != nil {
		h.logger.Error("Failed to start process", 
			zap.Uint("process_id", uint(processID)),
			zap.Uint("user_id", userID),
			zap.Error(err),
		)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to start process: "+err.Error())
	}

	h.logger.Info("Process started successfully",
		zap.Uint("instance_id", instance.ID),
		zap.Uint("process_id", uint(processID)),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"message": "Process started successfully",
		"data":    instance,
	})
}

// GetInstance 获取流程实例详情
// GET /api/v1/instance/:id
func (h *ProcessExecutionHandler) GetInstance(c echo.Context) error {
	// 解析实例ID
	instanceIDStr := c.Param("id")
	instanceID, err := strconv.ParseUint(instanceIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid instance ID", zap.String("id", instanceIDStr), zap.Error(err))
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid instance ID")
	}

	// 获取流程实例
	instance, err := h.engine.GetInstance(uint(instanceID))
	if err != nil {
		h.logger.Error("Failed to get instance", zap.Uint("instance_id", uint(instanceID)), zap.Error(err))
		return echo.NewHTTPError(http.StatusNotFound, "Instance not found")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    instance,
	})
}

// GetInstancesRequest 获取实例列表请求
type GetInstancesRequest struct {
	Page         int    `query:"page" validate:"min=1"`
	PageSize     int    `query:"page_size" validate:"min=1,max=100"`
	Status       string `query:"status"`
	DefinitionID uint   `query:"definition_id"`
	StarterID    uint   `query:"starter_id"`
	StartDate    string `query:"start_date"`
	EndDate      string `query:"end_date"`
}

// GetInstances 获取流程实例列表
// GET /api/v1/instances
func (h *ProcessExecutionHandler) GetInstances(c echo.Context) error {
	var req GetInstancesRequest
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

	// 构建过滤条件
	filters := make(map[string]interface{})
	if req.Status != "" {
		filters["status"] = req.Status
	}
	if req.DefinitionID != 0 {
		filters["definition_id"] = req.DefinitionID
	}
	if req.StarterID != 0 {
		filters["starter_id"] = req.StarterID
	}

	// 处理日期过滤
	if req.StartDate != "" {
		if startDate, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			filters["start_date_from"] = startDate
		}
	}
	if req.EndDate != "" {
		if endDate, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			filters["start_date_to"] = endDate
		}
	}

	// 获取实例列表
	instances, total, err := h.engine.GetInstances((req.Page-1)*req.PageSize, req.PageSize, filters)
	if err != nil {
		h.logger.Error("Failed to get instances", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get instances")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"instances":    instances,
			"total":        total,
			"page":         req.Page,
			"page_size":    req.PageSize,
			"total_pages":  (total + int64(req.PageSize) - 1) / int64(req.PageSize),
		},
	})
}

// SuspendInstanceRequest 暂停实例请求
type SuspendInstanceRequest struct {
	Reason string `json:"reason" validate:"required,max=255"`
}

// SuspendInstance 暂停流程实例
// POST /api/v1/instance/:id/suspend
func (h *ProcessExecutionHandler) SuspendInstance(c echo.Context) error {
	// 解析实例ID
	instanceIDStr := c.Param("id")
	instanceID, err := strconv.ParseUint(instanceIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid instance ID")
	}

	// 解析请求体
	var req SuspendInstanceRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// 暂停流程实例
	if err := h.engine.SuspendInstance(uint(instanceID), req.Reason); err != nil {
		h.logger.Error("Failed to suspend instance", zap.Uint("instance_id", uint(instanceID)), zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to suspend instance: "+err.Error())
	}

	h.logger.Info("Instance suspended successfully", zap.Uint("instance_id", uint(instanceID)))

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Instance suspended successfully",
	})
}

// ResumeInstance 恢复流程实例
// POST /api/v1/instance/:id/resume
func (h *ProcessExecutionHandler) ResumeInstance(c echo.Context) error {
	// 解析实例ID
	instanceIDStr := c.Param("id")
	instanceID, err := strconv.ParseUint(instanceIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid instance ID")
	}

	// 恢复流程实例
	if err := h.engine.ResumeInstance(uint(instanceID)); err != nil {
		h.logger.Error("Failed to resume instance", zap.Uint("instance_id", uint(instanceID)), zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to resume instance: "+err.Error())
	}

	h.logger.Info("Instance resumed successfully", zap.Uint("instance_id", uint(instanceID)))

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Instance resumed successfully",
	})
}

// CancelInstanceRequest 取消实例请求
type CancelInstanceRequest struct {
	Reason string `json:"reason" validate:"required,max=255"`
}

// CancelInstance 取消流程实例
// POST /api/v1/instance/:id/cancel
func (h *ProcessExecutionHandler) CancelInstance(c echo.Context) error {
	// 解析实例ID
	instanceIDStr := c.Param("id")
	instanceID, err := strconv.ParseUint(instanceIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid instance ID")
	}

	// 解析请求体
	var req CancelInstanceRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// 取消流程实例
	if err := h.engine.CancelInstance(uint(instanceID), req.Reason); err != nil {
		h.logger.Error("Failed to cancel instance", zap.Uint("instance_id", uint(instanceID)), zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to cancel instance: "+err.Error())
	}

	h.logger.Info("Instance cancelled successfully", zap.Uint("instance_id", uint(instanceID)))

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Instance cancelled successfully",
	})
}

// GetInstanceHistory 获取流程执行历史
// GET /api/v1/instance/:id/history
func (h *ProcessExecutionHandler) GetInstanceHistory(c echo.Context) error {
	// 解析实例ID
	instanceIDStr := c.Param("id")
	instanceID, err := strconv.ParseUint(instanceIDStr, 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid instance ID")
	}

	// 获取执行历史
	history, err := h.engine.GetInstanceHistory(uint(instanceID))
	if err != nil {
		h.logger.Error("Failed to get instance history", zap.Uint("instance_id", uint(instanceID)), zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get instance history")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    history,
	})
}

// 辅助函数：从上下文获取用户ID
func getUserIDFromContext(c echo.Context) uint {
	if user := c.Get("user"); user != nil {
		if userClaims, ok := user.(*model.User); ok {
			return userClaims.ID
		}
	}
	return 0
}
