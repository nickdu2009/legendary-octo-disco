//go:build wireinject
// +build wireinject

package wire

import (
	"miniflow/internal/server"
	"miniflow/pkg/config"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"

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

	// Infrastructure providers
	ProvideLogger,
	database.NewDatabase,

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

// InitializeServer initializes the server with all dependencies
func InitializeServer(cfg *config.Config) (*server.Server, error) {
	wire.Build(ProviderSet)
	return &server.Server{}, nil
}
