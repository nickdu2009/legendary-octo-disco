package database

import (
	"fmt"

	"miniflow/pkg/config"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

// Database wraps gorm.DB to avoid global instance
type Database struct {
	*gorm.DB
	logger *logger.Logger
}

// NewDatabase creates a new database instance
func NewDatabase(cfg *config.DatabaseConfig, log *logger.Logger) (*Database, error) {
	var err error

	// Configure GORM logger
	var logLevel gormLogger.LogLevel
	logLevel = gormLogger.Info // Default to info level, will be configurable later

	gormConfig := &gorm.Config{
		Logger: gormLogger.Default.LogMode(logLevel),
		NamingStrategy: schema.NamingStrategy{
			TablePrefix:   "",    // table name prefix
			SingularTable: false, // use singular table name
			NoLowerCase:   false, // use lowercase
		},
		PrepareStmt:                              true,  // prepares and caches statements
		DisableForeignKeyConstraintWhenMigrating: false, // enable foreign key constraints
	}

	// Connect to database
	db, err := gorm.Open(mysql.Open(cfg.GetDSN()), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying sql.DB
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(cfg.GetConnMaxLifetime())

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info("Database connected successfully",
		zap.String("host", cfg.Host),
		zap.Int("port", cfg.Port),
		zap.String("database", cfg.Database),
	)

	return &Database{DB: db, logger: log}, nil
}

// Close closes the database connection
func (d *Database) Close() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// AutoMigrate runs database migrations
func (d *Database) AutoMigrate(models ...interface{}) error {
	d.logger.Info("Starting database migration...")

	for _, model := range models {
		if err := d.DB.AutoMigrate(model); err != nil {
			return fmt.Errorf("failed to migrate model %T: %w", model, err)
		}
	}

	d.logger.Info("Database migration completed successfully")
	return nil
}

// CreateIndexes creates additional database indexes
func (d *Database) CreateIndexes() error {
	d.logger.Info("Creating additional database indexes...")

	// Add custom indexes here as needed
	// Example:
	// if err := d.DB.Exec("CREATE INDEX IF NOT EXISTS idx_custom ON table_name(column_name)").Error; err != nil {
	//     return fmt.Errorf("failed to create custom index: %w", err)
	// }

	d.logger.Info("Database indexes created successfully")
	return nil
}

// HealthCheck checks if database is healthy
func (d *Database) HealthCheck() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	return sqlDB.Ping()
}
