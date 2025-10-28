package repository

import (
	"errors"
	"miniflow/internal/model"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// UserRepository handles user data access
type UserRepository struct {
	db     *database.Database
	logger *logger.Logger
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *database.Database, logger *logger.Logger) *UserRepository {
	return &UserRepository{
		db:     db,
		logger: logger,
	}
}

// Create creates a new user
func (r *UserRepository) Create(user *model.User) error {
	return r.db.Create(user).Error
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(id uint) (*model.User, error) {
	var user model.User
	err := r.db.First(&user, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}
	return &user, nil
}

// GetByUsername retrieves a user by username
func (r *UserRepository) GetByUsername(username string) (*model.User, error) {
	var user model.User
	err := r.db.Where("username = ? AND status = ?", username, "active").First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}
	return &user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(email string) (*model.User, error) {
	var user model.User
	err := r.db.Where("email = ? AND status = ?", email, "active").First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}
	return &user, nil
}

// Update updates a user
func (r *UserRepository) Update(user *model.User) error {
	return r.db.Save(user).Error
}

// Delete soft deletes a user
func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&model.User{}, id).Error
}

// List retrieves users with pagination
func (r *UserRepository) List(offset, limit int) ([]*model.User, int64, error) {
	var users []*model.User
	var total int64

	// Count total records
	if err := r.db.Model(&model.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated records
	err := r.db.Offset(offset).Limit(limit).Find(&users).Error
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// ExistsByUsername checks if username already exists
func (r *UserRepository) ExistsByUsername(username string) (bool, error) {
	var count int64
	err := r.db.Model(&model.User{}).Where("username = ?", username).Count(&count).Error
	return count > 0, err
}

// ExistsByEmail checks if email already exists
func (r *UserRepository) ExistsByEmail(email string) (bool, error) {
	var count int64
	err := r.db.Model(&model.User{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}

// UpdateLastLoginTime updates user's last login time
func (r *UserRepository) UpdateLastLoginTime(id uint) error {
	return r.db.Model(&model.User{}).Where("id = ?", id).Update("last_login_at", gorm.Expr("NOW()")).Error
}

// GetActiveUsers retrieves all active users
func (r *UserRepository) GetActiveUsers() ([]model.User, error) {
	var users []model.User
	err := r.db.Where("status = ?", "active").
		Order("username ASC").
		Find(&users).Error
	
	if err != nil {
		r.logger.Error("Failed to get active users", zap.Error(err))
		return nil, err
	}
	
	return users, err
}

// GetUsersByRole 根据角色获取用户
func (r *UserRepository) GetUsersByRole(role string) ([]model.User, error) {
	var users []model.User
	err := r.db.Where("role = ? AND status = ?", role, "active").
		Order("username ASC").
		Find(&users).Error
	
	if err != nil {
		r.logger.Error("Failed to get users by role", zap.String("role", role), zap.Error(err))
		return nil, err
	}
	
	return users, nil
}

// CountByRole counts users by role
func (r *UserRepository) CountByRole(role string) (int64, error) {
	var count int64
	err := r.db.Model(&model.User{}).Where("role = ? AND status = ?", role, "active").Count(&count).Error
	return count, err
}
