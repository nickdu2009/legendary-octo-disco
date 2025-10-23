package service

import (
	"errors"
	"time"

	"miniflow/internal/model"
	"miniflow/internal/repository"
	"miniflow/pkg/logger"
	"miniflow/pkg/utils"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// UserService handles user business logic
type UserService struct {
	userRepo   *repository.UserRepository
	jwtManager *utils.JWTManager
	logger     *logger.Logger
}

// NewUserService creates a new user service
func NewUserService(userRepo *repository.UserRepository, jwtManager *utils.JWTManager, logger *logger.Logger) *UserService {
	return &UserService{
		userRepo:   userRepo,
		jwtManager: jwtManager,
		logger:     logger,
	}
}

// RegisterRequest represents user registration request
type RegisterRequest struct {
	Username    string `json:"username" validate:"required,min=3,max=50"`
	Password    string `json:"password" validate:"required,min=6"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email" validate:"email"`
	Phone       string `json:"phone"`
}

// LoginRequest represents user login request
type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

// UpdateProfileRequest represents user profile update request
type UpdateProfileRequest struct {
	DisplayName string `json:"display_name"`
	Email       string `json:"email" validate:"omitempty,email"`
	Phone       string `json:"phone"`
	Avatar      string `json:"avatar"`
}

// UserResponse represents user response data
type UserResponse struct {
	ID          uint       `json:"id"`
	Username    string     `json:"username"`
	DisplayName string     `json:"display_name"`
	Email       string     `json:"email"`
	Phone       string     `json:"phone"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	Avatar      string     `json:"avatar"`
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

// LoginResponse represents login response data
type LoginResponse struct {
	User  *UserResponse `json:"user"`
	Token string        `json:"token"`
}

// Register registers a new user
func (s *UserService) Register(req *RegisterRequest) (*UserResponse, error) {
	s.logger.Info("User registration attempt", zap.String("username", req.Username))

	// Check if username already exists
	exists, err := s.userRepo.ExistsByUsername(req.Username)
	if err != nil {
		s.logger.Error("Failed to check username existence", zap.Error(err))
		return nil, errors.New("系统错误，请稍后重试")
	}
	if exists {
		s.logger.Warn("Registration failed: username already exists", zap.String("username", req.Username))
		return nil, errors.New("用户名已存在")
	}

	// Check if email already exists (if provided)
	if req.Email != "" {
		exists, err := s.userRepo.ExistsByEmail(req.Email)
		if err != nil {
			s.logger.Error("Failed to check email existence", zap.Error(err))
			return nil, errors.New("系统错误，请稍后重试")
		}
		if exists {
			s.logger.Warn("Registration failed: email already exists", zap.String("email", req.Email))
			return nil, errors.New("邮箱已存在")
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		s.logger.Error("Failed to hash password", zap.Error(err))
		return nil, errors.New("密码加密失败")
	}

	// Create user
	user := &model.User{
		Username:    req.Username,
		Password:    string(hashedPassword),
		DisplayName: req.DisplayName,
		Email:       req.Email,
		Phone:       req.Phone,
		Role:        "user",
		Status:      "active",
	}

	if err := s.userRepo.Create(user); err != nil {
		s.logger.Error("Failed to create user", zap.Error(err))
		return nil, errors.New("创建用户失败")
	}

	s.logger.Info("User registered successfully",
		zap.Uint("user_id", user.ID),
		zap.String("username", user.Username),
	)

	return s.toUserResponse(user), nil
}

// Login authenticates a user and returns a JWT token
func (s *UserService) Login(req *LoginRequest) (*LoginResponse, error) {
	s.logger.Info("User login attempt", zap.String("username", req.Username))

	// Get user by username
	user, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		s.logger.Warn("Login failed: user not found", zap.String("username", req.Username))
		return nil, errors.New("用户名或密码错误")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		s.logger.Warn("Login failed: invalid password", zap.String("username", req.Username))
		return nil, errors.New("用户名或密码错误")
	}

	// Generate JWT token
	token, err := s.jwtManager.GenerateToken(user.ID, user.Username)
	if err != nil {
		s.logger.Error("Failed to generate JWT token", zap.Error(err))
		return nil, errors.New("生成登录凭证失败")
	}

	// Update last login time
	if err := s.userRepo.UpdateLastLoginTime(user.ID); err != nil {
		s.logger.Warn("Failed to update last login time", zap.Error(err))
		// Don't fail login for this
	}

	s.logger.Info("User logged in successfully",
		zap.Uint("user_id", user.ID),
		zap.String("username", user.Username),
	)

	return &LoginResponse{
		User:  s.toUserResponse(user),
		Token: token,
	}, nil
}

// GetProfile retrieves user profile by ID
func (s *UserService) GetProfile(userID uint) (*UserResponse, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		s.logger.Error("Failed to get user profile", zap.Uint("user_id", userID), zap.Error(err))
		return nil, err
	}

	return s.toUserResponse(user), nil
}

// UpdateProfile updates user profile
func (s *UserService) UpdateProfile(userID uint, req *UpdateProfileRequest) (*UserResponse, error) {
	s.logger.Info("Updating user profile", zap.Uint("user_id", userID))

	// Get existing user
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	// Check if email is being changed and if it already exists
	if req.Email != "" && req.Email != user.Email {
		exists, err := s.userRepo.ExistsByEmail(req.Email)
		if err != nil {
			s.logger.Error("Failed to check email existence", zap.Error(err))
			return nil, errors.New("系统错误，请稍后重试")
		}
		if exists {
			return nil, errors.New("邮箱已存在")
		}
	}

	// Update user fields
	if req.DisplayName != "" {
		user.DisplayName = req.DisplayName
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}

	// Save changes
	if err := s.userRepo.Update(user); err != nil {
		s.logger.Error("Failed to update user profile", zap.Error(err))
		return nil, errors.New("更新用户资料失败")
	}

	s.logger.Info("User profile updated successfully", zap.Uint("user_id", userID))

	return s.toUserResponse(user), nil
}

// GetUsers retrieves users with pagination
func (s *UserService) GetUsers(page, pageSize int) ([]*UserResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize
	users, total, err := s.userRepo.List(offset, pageSize)
	if err != nil {
		s.logger.Error("Failed to get users list", zap.Error(err))
		return nil, 0, err
	}

	userResponses := make([]*UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = s.toUserResponse(user)
	}

	return userResponses, total, nil
}

// ChangePassword changes user password
func (s *UserService) ChangePassword(userID uint, oldPassword, newPassword string) error {
	s.logger.Info("Changing user password", zap.Uint("user_id", userID))

	// Get user
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}

	// Verify old password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword))
	if err != nil {
		s.logger.Warn("Password change failed: invalid old password", zap.Uint("user_id", userID))
		return errors.New("原密码错误")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		s.logger.Error("Failed to hash new password", zap.Error(err))
		return errors.New("密码加密失败")
	}

	// Update password
	user.Password = string(hashedPassword)
	if err := s.userRepo.Update(user); err != nil {
		s.logger.Error("Failed to update password", zap.Error(err))
		return errors.New("密码更新失败")
	}

	s.logger.Info("Password changed successfully", zap.Uint("user_id", userID))
	return nil
}

// DeactivateUser deactivates a user
func (s *UserService) DeactivateUser(userID uint) error {
	s.logger.Info("Deactivating user", zap.Uint("user_id", userID))

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}

	user.Status = "inactive"
	if err := s.userRepo.Update(user); err != nil {
		s.logger.Error("Failed to deactivate user", zap.Error(err))
		return errors.New("停用用户失败")
	}

	s.logger.Info("User deactivated successfully", zap.Uint("user_id", userID))
	return nil
}

// GetUserStats returns user statistics
func (s *UserService) GetUserStats() (map[string]int64, error) {
	stats := make(map[string]int64)

	// Count total active users
	activeUsers, err := s.userRepo.CountByRole("")
	if err != nil {
		return nil, err
	}
	stats["total_active"] = activeUsers

	// Count by roles
	adminCount, err := s.userRepo.CountByRole("admin")
	if err != nil {
		return nil, err
	}
	stats["admin_count"] = adminCount

	userCount, err := s.userRepo.CountByRole("user")
	if err != nil {
		return nil, err
	}
	stats["user_count"] = userCount

	return stats, nil
}

// toUserResponse converts User model to UserResponse
func (s *UserService) toUserResponse(user *model.User) *UserResponse {
	return &UserResponse{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Phone:       user.Phone,
		Role:        user.Role,
		Status:      user.Status,
		Avatar:      user.Avatar,
		LastLoginAt: user.LastLoginAt,
		CreatedAt:   user.CreatedAt,
	}
}
