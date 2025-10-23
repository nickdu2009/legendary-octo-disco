package middleware

import (
	"net/http"
	"strings"

	"miniflow/pkg/logger"
	"miniflow/pkg/utils"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

// AuthMiddleware handles JWT authentication
type AuthMiddleware struct {
	jwtManager *utils.JWTManager
	logger     *logger.Logger
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(jwtManager *utils.JWTManager, logger *logger.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		jwtManager: jwtManager,
		logger:     logger,
	}
}

// JWTAuth returns JWT authentication middleware
func (m *AuthMiddleware) JWTAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Get Authorization header
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				m.logger.Warn("Missing authorization header", 
					zap.String("path", c.Request().URL.Path),
					zap.String("method", c.Request().Method),
				)
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "缺少认证信息",
					"code":  "MISSING_AUTH_HEADER",
				})
			}

			// Extract token from "Bearer <token>"
			const bearerPrefix = "Bearer "
			if !strings.HasPrefix(authHeader, bearerPrefix) {
				m.logger.Warn("Invalid authorization header format", 
					zap.String("header", authHeader),
				)
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "认证格式错误",
					"code":  "INVALID_AUTH_FORMAT",
				})
			}

			tokenString := strings.TrimPrefix(authHeader, bearerPrefix)
			if tokenString == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "认证信息为空",
					"code":  "EMPTY_TOKEN",
				})
			}

			// Validate token
			userID, username, err := m.jwtManager.ValidateToken(tokenString)
			if err != nil {
				m.logger.Warn("Invalid JWT token", 
					zap.String("error", err.Error()),
					zap.String("path", c.Request().URL.Path),
				)
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "认证信息无效",
					"code":  "INVALID_TOKEN",
				})
			}

			// Set user info in context
			c.Set("user_id", userID)
			c.Set("username", username)

			m.logger.Debug("User authenticated successfully", 
				zap.Uint("user_id", userID),
				zap.String("username", username),
				zap.String("path", c.Request().URL.Path),
			)

			return next(c)
		}
	}
}

// OptionalJWTAuth returns optional JWT authentication middleware
// If token is provided, it validates it, but doesn't require it
func (m *AuthMiddleware) OptionalJWTAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				// No auth header, continue without authentication
				return next(c)
			}

			const bearerPrefix = "Bearer "
			if !strings.HasPrefix(authHeader, bearerPrefix) {
				return next(c)
			}

			tokenString := strings.TrimPrefix(authHeader, bearerPrefix)
			if tokenString == "" {
				return next(c)
			}

			// Try to validate token
			userID, username, err := m.jwtManager.ValidateToken(tokenString)
			if err != nil {
				// Invalid token, but continue without authentication
				m.logger.Debug("Optional auth failed", zap.Error(err))
				return next(c)
			}

			// Set user info in context if token is valid
			c.Set("user_id", userID)
			c.Set("username", username)

			return next(c)
		}
	}
}

// RequireRole returns role-based authorization middleware
func (m *AuthMiddleware) RequireRole(requiredRole string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// This middleware should be used after JWTAuth
			userID := c.Get("user_id")
			if userID == nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "需要认证",
					"code":  "AUTHENTICATION_REQUIRED",
				})
			}

			// TODO: Get user role from database or JWT claims
			// For now, we'll implement this when we have user service in handlers
			// This is a placeholder for role-based access control

			return next(c)
		}
	}
}

// GetUserIDFromContext extracts user ID from Echo context
func GetUserIDFromContext(c echo.Context) (uint, bool) {
	userID := c.Get("user_id")
	if userID == nil {
		return 0, false
	}
	
	if id, ok := userID.(uint); ok {
		return id, true
	}
	
	return 0, false
}

// GetUsernameFromContext extracts username from Echo context
func GetUsernameFromContext(c echo.Context) (string, bool) {
	username := c.Get("username")
	if username == nil {
		return "", false
	}
	
	if name, ok := username.(string); ok {
		return name, true
	}
	
	return "", false
}
