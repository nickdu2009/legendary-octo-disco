package repository

import (
	"errors"
	"fmt"
	"strings"

	"miniflow/internal/model"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"

	"gorm.io/gorm"
)

// ProcessRepository handles process definition data access
type ProcessRepository struct {
	db     *database.Database
	logger *logger.Logger
}

// NewProcessRepository creates a new process repository
func NewProcessRepository(db *database.Database, logger *logger.Logger) *ProcessRepository {
	return &ProcessRepository{
		db:     db,
		logger: logger,
	}
}

// Create creates a new process definition
func (r *ProcessRepository) Create(process *model.ProcessDefinition) error {
	// Check if key already exists
	var count int64
	if err := r.db.Model(&model.ProcessDefinition{}).
		Where("key = ?", process.Key).
		Count(&count).Error; err != nil {
		return err
	}
	
	if count > 0 {
		// Get the latest version for this key
		var latestVersion int
		if err := r.db.Model(&model.ProcessDefinition{}).
			Where("key = ?", process.Key).
			Select("COALESCE(MAX(version), 0)").
			Scan(&latestVersion).Error; err != nil {
			return err
		}
		process.Version = latestVersion + 1
	}

	return r.db.Create(process).Error
}

// GetByID retrieves a process definition by ID
func (r *ProcessRepository) GetByID(id uint) (*model.ProcessDefinition, error) {
	var process model.ProcessDefinition
	err := r.db.Preload("Creator").First(&process, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("流程定义不存在")
		}
		return nil, err
	}
	return &process, nil
}

// GetByKey retrieves a process definition by key (latest version)
func (r *ProcessRepository) GetByKey(key string) (*model.ProcessDefinition, error) {
	var process model.ProcessDefinition
	err := r.db.Preload("Creator").
		Where("key = ?", key).
		Order("version DESC").
		First(&process).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("流程定义不存在")
		}
		return nil, err
	}
	return &process, nil
}

// GetByKeyAndVersion retrieves a specific version of a process definition
func (r *ProcessRepository) GetByKeyAndVersion(key string, version int) (*model.ProcessDefinition, error) {
	var process model.ProcessDefinition
	err := r.db.Preload("Creator").
		Where("key = ? AND version = ?", key, version).
		First(&process).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("流程定义版本不存在")
		}
		return nil, err
	}
	return &process, nil
}

// Update updates a process definition
func (r *ProcessRepository) Update(process *model.ProcessDefinition) error {
	return r.db.Save(process).Error
}

// Delete soft deletes a process definition
func (r *ProcessRepository) Delete(id uint) error {
	return r.db.Delete(&model.ProcessDefinition{}, id).Error
}

// List retrieves process definitions with pagination and filters
func (r *ProcessRepository) List(offset, limit int, filters map[string]interface{}) ([]*model.ProcessDefinition, int64, error) {
	var processes []*model.ProcessDefinition
	var total int64

	query := r.db.Model(&model.ProcessDefinition{}).Preload("Creator")

	// Apply filters
	if createdBy, ok := filters["created_by"]; ok {
		query = query.Where("created_by = ?", createdBy)
	}
	if category, ok := filters["category"]; ok && category != "" {
		query = query.Where("category = ?", category)
	}
	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if search, ok := filters["search"]; ok && search != "" {
		searchTerm := fmt.Sprintf("%%%s%%", strings.ToLower(search.(string)))
		query = query.Where("LOWER(name) LIKE ? OR LOWER(key) LIKE ? OR LOWER(description) LIKE ?", 
			searchTerm, searchTerm, searchTerm)
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated records
	err := query.Offset(offset).
		Limit(limit).
		Order("updated_at DESC").
		Find(&processes).Error
	if err != nil {
		return nil, 0, err
	}

	return processes, total, nil
}

// GetLatestVersion gets the latest version of a process by key
func (r *ProcessRepository) GetLatestVersion(key string) (*model.ProcessDefinition, error) {
	var process model.ProcessDefinition
	err := r.db.Preload("Creator").
		Where("key = ?", key).
		Order("version DESC").
		First(&process).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("流程定义不存在")
		}
		return nil, err
	}
	return &process, nil
}

// GetVersions gets all versions of a process by key
func (r *ProcessRepository) GetVersions(key string) ([]*model.ProcessDefinition, error) {
	var processes []*model.ProcessDefinition
	err := r.db.Preload("Creator").
		Where("key = ?", key).
		Order("version DESC").
		Find(&processes).Error
	return processes, err
}

// GetByCategory retrieves processes by category
func (r *ProcessRepository) GetByCategory(category string) ([]*model.ProcessDefinition, error) {
	var processes []*model.ProcessDefinition
	err := r.db.Preload("Creator").
		Where("category = ?", category).
		Order("updated_at DESC").
		Find(&processes).Error
	return processes, err
}

// GetByCreator retrieves processes created by a specific user
func (r *ProcessRepository) GetByCreator(createdBy uint) ([]*model.ProcessDefinition, error) {
	var processes []*model.ProcessDefinition
	err := r.db.Preload("Creator").
		Where("created_by = ?", createdBy).
		Order("updated_at DESC").
		Find(&processes).Error
	return processes, err
}

// Search searches processes by keyword
func (r *ProcessRepository) Search(keyword string) ([]*model.ProcessDefinition, error) {
	var processes []*model.ProcessDefinition
	searchTerm := fmt.Sprintf("%%%s%%", strings.ToLower(keyword))
	
	err := r.db.Preload("Creator").
		Where("LOWER(name) LIKE ? OR LOWER(key) LIKE ? OR LOWER(description) LIKE ?", 
			searchTerm, searchTerm, searchTerm).
		Order("updated_at DESC").
		Find(&processes).Error
	return processes, err
}

// ExistsByKey checks if a process with the given key exists
func (r *ProcessRepository) ExistsByKey(key string) (bool, error) {
	var count int64
	err := r.db.Model(&model.ProcessDefinition{}).
		Where("key = ?", key).
		Count(&count).Error
	return count > 0, err
}

// GetMaxVersion gets the maximum version number for a process key
func (r *ProcessRepository) GetMaxVersion(key string) (int, error) {
	var maxVersion int
	err := r.db.Model(&model.ProcessDefinition{}).
		Where("key = ?", key).
		Select("COALESCE(MAX(version), 0)").
		Scan(&maxVersion).Error
	return maxVersion, err
}

// UpdateStatus updates the status of a process definition
func (r *ProcessRepository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.ProcessDefinition{}).
		Where("id = ?", id).
		Update("status", status).Error
}

// GetPublishedProcesses gets all published process definitions
func (r *ProcessRepository) GetPublishedProcesses() ([]*model.ProcessDefinition, error) {
	var processes []*model.ProcessDefinition
	err := r.db.Preload("Creator").
		Where("status = ?", model.ProcessStatusPublished).
		Order("updated_at DESC").
		Find(&processes).Error
	return processes, err
}

// CountByStatus counts processes by status
func (r *ProcessRepository) CountByStatus(status string) (int64, error) {
	var count int64
	err := r.db.Model(&model.ProcessDefinition{}).
		Where("status = ?", status).
		Count(&count).Error
	return count, err
}

// CountByCreator counts processes by creator
func (r *ProcessRepository) CountByCreator(createdBy uint) (int64, error) {
	var count int64
	err := r.db.Model(&model.ProcessDefinition{}).
		Where("created_by = ?", createdBy).
		Count(&count).Error
	return count, err
}
