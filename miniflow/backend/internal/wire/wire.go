//go:build wireinject
// +build wireinject

package wire

import (
	"miniflow/internal/engine"
	"miniflow/internal/handler"
	"miniflow/internal/middleware"
	"miniflow/internal/repository"
	"miniflow/internal/server"
	"miniflow/internal/service"
	"miniflow/pkg/config"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"
	"miniflow/pkg/utils"

	"github.com/google/wire"
)

// LoggerConfig holds logger configuration
type LoggerConfig struct {
	Level  string
	Format string
	Output string
}

// ProviderSet is the Wire provider set for the application
var ProviderSet = wire.NewSet(
	// Config providers
	ProvideLoggerConfig,
	ProvideDatabaseConfig,
	ProvideJWTConfig,

	// Infrastructure providers
	ProvideLogger,
	database.NewDatabase,
	utils.NewJWTManager,

	// Repository providers
	repository.NewUserRepository,
	repository.NewProcessRepository,
	repository.NewTaskRepository,
	repository.NewProcessInstanceRepository,

	// Engine providers (新增)
	engine.NewProcessEngine,
	engine.NewTaskAssignmentManager,

	// Service providers
	service.NewUserService,
	service.NewProcessService,

	// Handler providers
	handler.NewProcessExecutionHandler,
	handler.NewTaskManagementHandler,
	handler.NewRouter,
	
	// Middleware providers
	middleware.NewAuthMiddleware,

	// Server provider
	server.NewServer,
)

// ProvideLoggerConfig provides logger configuration
func ProvideLoggerConfig(cfg *config.Config) *LoggerConfig {
	return &LoggerConfig{
		Level:  cfg.Log.Level,
		Format: cfg.Log.Format,
		Output: cfg.Log.Output,
	}
}

// ProvideLogger provides logger instance
func ProvideLogger(cfg *LoggerConfig) (*logger.Logger, error) {
	return logger.NewLogger(cfg.Level, cfg.Format, cfg.Output)
}

// ProvideDatabaseConfig provides database configuration
func ProvideDatabaseConfig(cfg *config.Config) *config.DatabaseConfig {
	return &cfg.Database
}

// ProvideJWTConfig provides JWT configuration
func ProvideJWTConfig(cfg *config.Config) *config.JWTConfig {
	return &cfg.JWT
}

// InitializeServer initializes the server with all dependencies
func InitializeServer(cfg *config.Config) (*server.Server, error) {
	wire.Build(ProviderSet)
	return &server.Server{}, nil
}
