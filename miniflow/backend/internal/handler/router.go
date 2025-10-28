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
	userHandler           *UserHandler
	processHandler        *ProcessHandler
	processExecutionHandler *ProcessExecutionHandler
	taskManagementHandler *TaskManagementHandler
	authMiddleware        *middleware.AuthMiddleware
	logger                *logger.Logger
}

// NewRouter creates a new router
func NewRouter(
	userService *service.UserService,
	processService *service.ProcessService,
	processExecutionHandler *ProcessExecutionHandler,
	taskManagementHandler *TaskManagementHandler,
	jwtManager *utils.JWTManager,
	logger *logger.Logger,
) *Router {
	userHandler := NewUserHandler(userService, logger)
	processHandler := NewProcessHandler(processService, logger)
	authMiddleware := middleware.NewAuthMiddleware(jwtManager, logger)

	return &Router{
		userHandler:             userHandler,
		processHandler:          processHandler,
		processExecutionHandler: processExecutionHandler,
		taskManagementHandler:   taskManagementHandler,
		authMiddleware:          authMiddleware,
		logger:                  logger,
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

	// Process routes (authentication required)
	process := api.Group("/process")
	process.Use(r.authMiddleware.JWTAuth())
	{
		process.GET("", r.processHandler.GetProcesses)
		process.POST("", r.processHandler.CreateProcess)
		process.GET("/:id", r.processHandler.GetProcess)
		process.PUT("/:id", r.processHandler.UpdateProcess)
		process.DELETE("/:id", r.processHandler.DeleteProcess)
		process.POST("/:id/copy", r.processHandler.CopyProcess)
		process.POST("/:id/publish", r.processHandler.PublishProcess)
		process.GET("/stats", r.processHandler.GetProcessStats)
		
		// 流程执行API (新增)
		process.POST("/:id/start", r.processExecutionHandler.StartProcess)
	}

	// 流程实例管理API (新增)
	instance := api.Group("/instance")
	instance.Use(r.authMiddleware.JWTAuth())
	{
		instance.GET("/:id", r.processExecutionHandler.GetInstance)
		instance.POST("/:id/suspend", r.processExecutionHandler.SuspendInstance)
		instance.POST("/:id/resume", r.processExecutionHandler.ResumeInstance)
		instance.POST("/:id/cancel", r.processExecutionHandler.CancelInstance)
		instance.GET("/:id/history", r.processExecutionHandler.GetInstanceHistory)
	}

	// 流程实例列表API (新增)
	instances := api.Group("/instances")
	instances.Use(r.authMiddleware.JWTAuth())
	{
		instances.GET("", r.processExecutionHandler.GetInstances)
	}

	// 任务管理API (新增)
	task := api.Group("/task")
	task.Use(r.authMiddleware.JWTAuth())
	{
		task.GET("/:id", r.taskManagementHandler.GetTask)
		task.POST("/:id/claim", r.taskManagementHandler.ClaimTask)
		task.POST("/:id/complete", r.taskManagementHandler.CompleteTask)
		task.POST("/:id/release", r.taskManagementHandler.ReleaseTask)
		task.POST("/:id/delegate", r.taskManagementHandler.DelegateTask)
		task.GET("/:id/form", r.taskManagementHandler.GetTaskForm)
		task.POST("/:id/form", r.taskManagementHandler.SubmitTaskForm)
	}

	// 用户任务API (新增)
	user := api.Group("/user")
	user.Use(r.authMiddleware.JWTAuth())
	{
		user.GET("/tasks", r.taskManagementHandler.GetUserTasks)
	}

	// 任务状态API (管理员功能，新增)
	tasks := api.Group("/tasks")
	tasks.Use(r.authMiddleware.JWTAuth())
	{
		tasks.GET("/status/:status", r.taskManagementHandler.GetTasksByStatus)
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
		"timestamp": "2025-10-23T17:00:00Z", // TODO: Use actual timestamp
	})
}
