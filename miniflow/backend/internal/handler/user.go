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

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	userService *service.UserService
	logger      *logger.Logger
	validator   *utils.CustomValidator
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *service.UserService, logger *logger.Logger) *UserHandler {
	return &UserHandler{
		userService: userService,
		logger:      logger,
		validator:   utils.NewCustomValidator(),
	}
}

// Register handles user registration
func (h *UserHandler) Register(c echo.Context) error {
	var req service.RegisterRequest

	// Bind request data
	if err := c.Bind(&req); err != nil {
		h.logger.Warn("Invalid request body for registration", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
		})
	}

	// Validate request data
	if err := h.validator.Validate(&req); err != nil {
		h.logger.Warn("Registration validation failed", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数验证失败",
			"code":  "VALIDATION_FAILED",
		})
	}

	// Call service to register user
	user, err := h.userService.Register(&req)
	if err != nil {
		h.logger.Error("Registration failed", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "REGISTRATION_FAILED",
		})
	}

	h.logger.Info("User registered successfully via API",
		zap.Uint("user_id", user.ID),
		zap.String("username", user.Username),
	)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "注册成功",
		"user":    user,
	})
}

// Login handles user authentication
func (h *UserHandler) Login(c echo.Context) error {
	var req service.LoginRequest

	// Bind request data
	if err := c.Bind(&req); err != nil {
		h.logger.Warn("Invalid request body for login", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
		})
	}

	// Validate request data
	if err := h.validator.Validate(&req); err != nil {
		h.logger.Warn("Login validation failed", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数验证失败",
			"code":  "VALIDATION_FAILED",
		})
	}

	// Call service to authenticate user
	loginResp, err := h.userService.Login(&req)
	if err != nil {
		h.logger.Warn("Login failed",
			zap.String("username", req.Username),
			zap.Error(err),
		)
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": err.Error(),
			"code":  "LOGIN_FAILED",
		})
	}

	h.logger.Info("User logged in successfully via API",
		zap.Uint("user_id", loginResp.User.ID),
		zap.String("username", loginResp.User.Username),
	)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "登录成功",
		"data":    loginResp,
	})
}

// GetProfile handles getting user profile
func (h *UserHandler) GetProfile(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	user, err := h.userService.GetProfile(userID)
	if err != nil {
		h.logger.Error("Failed to get user profile",
			zap.Uint("user_id", userID),
			zap.Error(err),
		)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "获取用户资料失败",
			"code":  "GET_PROFILE_FAILED",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "获取用户资料成功",
		"data":    user,
	})
}

// UpdateProfile handles updating user profile
func (h *UserHandler) UpdateProfile(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	var req service.UpdateProfileRequest

	// Bind request data
	if err := c.Bind(&req); err != nil {
		h.logger.Warn("Invalid request body for profile update", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
		})
	}

	// Validate request data
	if err := h.validator.Validate(&req); err != nil {
		h.logger.Warn("Profile update validation failed", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数验证失败",
			"code":  "VALIDATION_FAILED",
		})
	}

	// Call service to update profile
	user, err := h.userService.UpdateProfile(userID, &req)
	if err != nil {
		h.logger.Error("Failed to update user profile",
			zap.Uint("user_id", userID),
			zap.Error(err),
		)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "UPDATE_PROFILE_FAILED",
		})
	}

	h.logger.Info("User profile updated successfully",
		zap.Uint("user_id", userID),
	)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "更新用户资料成功",
		"data":    user,
	})
}

// ChangePassword handles password change
func (h *UserHandler) ChangePassword(c echo.Context) error {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "用户认证信息无效",
			"code":  "INVALID_USER_CONTEXT",
		})
	}

	var req struct {
		OldPassword string `json:"old_password" validate:"required"`
		NewPassword string `json:"new_password" validate:"required,min=6"`
	}

	// Bind and validate request data
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "密码格式验证失败",
			"code":  "VALIDATION_FAILED",
		})
	}

	// Call service to change password
	err := h.userService.ChangePassword(userID, req.OldPassword, req.NewPassword)
	if err != nil {
		h.logger.Warn("Password change failed",
			zap.Uint("user_id", userID),
			zap.Error(err),
		)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "CHANGE_PASSWORD_FAILED",
		})
	}

	h.logger.Info("Password changed successfully", zap.Uint("user_id", userID))

	return c.JSON(http.StatusOK, map[string]string{
		"message": "密码修改成功",
	})
}

// GetUsers handles getting users list (admin only)
func (h *UserHandler) GetUsers(c echo.Context) error {
	// Get pagination parameters
	page, _ := strconv.Atoi(c.QueryParam("page"))
	pageSize, _ := strconv.Atoi(c.QueryParam("page_size"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Call service to get users
	users, total, err := h.userService.GetUsers(page, pageSize)
	if err != nil {
		h.logger.Error("Failed to get users list", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "获取用户列表失败",
			"code":  "GET_USERS_FAILED",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "获取用户列表成功",
		"data": map[string]interface{}{
			"users":     users,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// DeactivateUser handles user deactivation (admin only)
func (h *UserHandler) DeactivateUser(c echo.Context) error {
	// Get user ID from path parameter
	userIDStr := c.Param("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "无效的用户ID",
			"code":  "INVALID_USER_ID",
		})
	}

	// Call service to deactivate user
	err = h.userService.DeactivateUser(uint(userID))
	if err != nil {
		h.logger.Error("Failed to deactivate user",
			zap.Uint("target_user_id", uint(userID)),
			zap.Error(err),
		)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
			"code":  "DEACTIVATE_USER_FAILED",
		})
	}

	h.logger.Info("User deactivated successfully",
		zap.Uint("target_user_id", uint(userID)),
	)

	return c.JSON(http.StatusOK, map[string]string{
		"message": "用户停用成功",
	})
}

// GetUserStats handles getting user statistics (admin only)
func (h *UserHandler) GetUserStats(c echo.Context) error {
	stats, err := h.userService.GetUserStats()
	if err != nil {
		h.logger.Error("Failed to get user stats", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "获取用户统计失败",
			"code":  "GET_STATS_FAILED",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "获取用户统计成功",
		"data":    stats,
	})
}
