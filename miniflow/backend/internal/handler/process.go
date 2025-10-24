package handler

import (
	"net/http"
	"strconv"

	"miniflow/internal/middleware"
	"miniflow/internal/service"
	"miniflow/pkg/logger"
	"miniflow/pkg/utils"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

// ProcessHandler handles process-related HTTP requests
type ProcessHandler struct {
	processService *service.ProcessService
	logger         *logger.Logger
	validator      *utils.CustomValidator
}

// NewProcessHandler creates a new process handler
func NewProcessHandler(processService *service.ProcessService, logger *logger.Logger) *ProcessHandler {
	return &ProcessHandler{
		processService: processService,
		logger:         logger,
		validator:      utils.NewCustomValidator(),
	}
}

// CreateProcess handles process creation
func (h *ProcessHandler) CreateProcess(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	var req service.CreateProcessRequest
	
	// Bind request data
	if err := c.Bind(&req); err != nil {
		h.logger.Warn("Invalid request body for process creation", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
		})
	}

	// Validate request data
	if err := h.validator.Validate(&req); err != nil {
		h.logger.Warn("Process creation validation failed", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数验证失败",
			"code":  "VALIDATION_FAILED",
		})
	}

	// Call service to create process
	process, err := h.processService.CreateProcess(userID, &req)
	if err != nil {
		h.logger.Error("Process creation failed", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "PROCESS_CREATION_FAILED",
		})
	}

	h.logger.Info("Process created successfully via API", 
		zap.Uint("process_id", process.ID),
		zap.String("key", process.Key),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "流程创建成功",
		"data":    process,
	})
}

// GetProcess handles getting process details
func (h *ProcessHandler) GetProcess(c echo.Context) error {
	processIDStr := c.Param("id")
	processID, err := strconv.ParseUint(processIDStr, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "无效的流程ID",
			"code":  "INVALID_PROCESS_ID",
		})
	}

	process, err := h.processService.GetProcess(uint(processID))
	if err != nil {
		h.logger.Error("Failed to get process", 
			zap.Uint("process_id", uint(processID)),
			zap.Error(err),
		)
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": err.Error(),
			"code":  "PROCESS_NOT_FOUND",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "获取流程成功",
		"data":    process,
	})
}

// UpdateProcess handles process updates
func (h *ProcessHandler) UpdateProcess(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	processIDStr := c.Param("id")
	processID, err := strconv.ParseUint(processIDStr, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "无效的流程ID",
			"code":  "INVALID_PROCESS_ID",
		})
	}

	var req service.UpdateProcessRequest
	
	// Bind request data
	if err := c.Bind(&req); err != nil {
		h.logger.Warn("Invalid request body for process update", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
		})
	}

	// Validate request data
	if err := h.validator.Validate(&req); err != nil {
		h.logger.Warn("Process update validation failed", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数验证失败",
			"code":  "VALIDATION_FAILED",
		})
	}

	// Call service to update process
	process, err := h.processService.UpdateProcess(uint(processID), userID, &req)
	if err != nil {
		h.logger.Error("Process update failed", 
			zap.Uint("process_id", uint(processID)),
			zap.Error(err),
		)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "PROCESS_UPDATE_FAILED",
		})
	}

	h.logger.Info("Process updated successfully via API", 
		zap.Uint("process_id", uint(processID)),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "流程更新成功",
		"data":    process,
	})
}

// DeleteProcess handles process deletion
func (h *ProcessHandler) DeleteProcess(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	processIDStr := c.Param("id")
	processID, err := strconv.ParseUint(processIDStr, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "无效的流程ID",
			"code":  "INVALID_PROCESS_ID",
		})
	}

	err = h.processService.DeleteProcess(uint(processID), userID)
	if err != nil {
		h.logger.Error("Process deletion failed", 
			zap.Uint("process_id", uint(processID)),
			zap.Error(err),
		)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "PROCESS_DELETION_FAILED",
		})
	}

	h.logger.Info("Process deleted successfully via API", 
		zap.Uint("process_id", uint(processID)),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusOK, map[string]string{
		"message": "流程删除成功",
	})
}

// GetProcesses handles getting process list
func (h *ProcessHandler) GetProcesses(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(c.QueryParam("page"))
	pageSize, _ := strconv.Atoi(c.QueryParam("page_size"))
	
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Get filter parameters
	filters := make(map[string]interface{})
	if search := c.QueryParam("search"); search != "" {
		filters["search"] = search
	}
	if category := c.QueryParam("category"); category != "" {
		filters["category"] = category
	}
	if status := c.QueryParam("status"); status != "" {
		filters["status"] = status
	}
	
	// Filter by user's own processes unless admin
	// For now, show user's own processes
	filters["created_by"] = userID

	// Call service to get processes
	result, err := h.processService.GetProcesses(page, pageSize, filters)
	if err != nil {
		h.logger.Error("Failed to get processes", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "获取流程列表失败",
			"code":  "GET_PROCESSES_FAILED",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "获取流程列表成功",
		"data":    result,
	})
}

// CopyProcess handles process copying
func (h *ProcessHandler) CopyProcess(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	processIDStr := c.Param("id")
	processID, err := strconv.ParseUint(processIDStr, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "无效的流程ID",
			"code":  "INVALID_PROCESS_ID",
		})
	}

	process, err := h.processService.CopyProcess(uint(processID), userID)
	if err != nil {
		h.logger.Error("Process copy failed", 
			zap.Uint("process_id", uint(processID)),
			zap.Error(err),
		)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "PROCESS_COPY_FAILED",
		})
	}

	h.logger.Info("Process copied successfully via API", 
		zap.Uint("original_process_id", uint(processID)),
		zap.Uint("new_process_id", process.ID),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "流程复制成功",
		"data":    process,
	})
}

// PublishProcess handles process publishing
func (h *ProcessHandler) PublishProcess(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	processIDStr := c.Param("id")
	processID, err := strconv.ParseUint(processIDStr, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "无效的流程ID",
			"code":  "INVALID_PROCESS_ID",
		})
	}

	err = h.processService.PublishProcess(uint(processID), userID)
	if err != nil {
		h.logger.Error("Process publish failed", 
			zap.Uint("process_id", uint(processID)),
			zap.Error(err),
		)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "PROCESS_PUBLISH_FAILED",
		})
	}

	h.logger.Info("Process published successfully via API", 
		zap.Uint("process_id", uint(processID)),
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusOK, map[string]string{
		"message": "流程发布成功",
	})
}

// GetProcessStats handles getting process statistics
func (h *ProcessHandler) GetProcessStats(c echo.Context) error {
	stats, err := h.processService.GetProcessStats()
	if err != nil {
		h.logger.Error("Failed to get process stats", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "获取流程统计失败",
			"code":  "GET_STATS_FAILED",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "获取流程统计成功",
		"data":    stats,
	})
}
