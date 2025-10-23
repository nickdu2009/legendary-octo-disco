package handler

import (
	"miniflow/internal/middleware"
	"miniflow/internal/service"
	"miniflow/pkg/logger"
	"miniflow/pkg/utils"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
)

// Router handles HTTP routing setup
type Router struct {
	userHandler    *UserHandler
	authMiddleware *middleware.AuthMiddleware
	logger         *logger.Logger
}

// NewRouter creates a new router
func NewRouter(
	userService *service.UserService,
	jwtManager *utils.JWTManager,
	logger *logger.Logger,
) *Router {
	userHandler := NewUserHandler(userService, logger)
	authMiddleware := middleware.NewAuthMiddleware(jwtManager, logger)

	return &Router{
		userHandler:    userHandler,
		authMiddleware: authMiddleware,
		logger:         logger,
	}
}

// SetupRoutes configures all application routes
func (r *Router) SetupRoutes(e *echo.Echo) {
	// Basic middleware
	e.Use(echomiddleware.Logger())
	e.Use(echomiddleware.Recover())
	e.Use(echomiddleware.CORS())

	// Request ID middleware for tracing
	e.Use(echomiddleware.RequestID())

	// Security headers
	e.Use(echomiddleware.Secure())

	// API versioning
	api := e.Group("/api/v1")

	// Health check endpoint (no authentication required)
	e.GET("/health", r.healthCheck)
	api.GET("/health", r.healthCheck)

	// Public routes (no authentication required)
	auth := api.Group("/auth")
	{
		auth.POST("/register", r.userHandler.Register)
		auth.POST("/login", r.userHandler.Login)
	}

	// Protected routes (authentication required)
	protected := api.Group("/user")
	protected.Use(r.authMiddleware.JWTAuth())
	{
		protected.GET("/profile", r.userHandler.GetProfile)
		protected.PUT("/profile", r.userHandler.UpdateProfile)
		protected.POST("/change-password", r.userHandler.ChangePassword)
	}

	// Admin routes (authentication + admin role required)
	admin := api.Group("/admin")
	admin.Use(r.authMiddleware.JWTAuth())
	// admin.Use(r.authMiddleware.RequireRole("admin")) // TODO: Implement role check
	{
		admin.GET("/users", r.userHandler.GetUsers)
		admin.POST("/users/:id/deactivate", r.userHandler.DeactivateUser)
		admin.GET("/stats/users", r.userHandler.GetUserStats)
	}

	// API documentation route (development only)
	// TODO: Add Swagger documentation endpoint
	
	r.logger.Info("Routes configured successfully")
}

// healthCheck handles health check requests
func (r *Router) healthCheck(c echo.Context) error {
	return c.JSON(200, map[string]interface{}{
		"status":    "healthy",
		"service":   "miniflow",
		"version":   "1.0.0",
		"timestamp": "2024-10-23T17:00:00Z", // TODO: Use actual timestamp
	})
}
