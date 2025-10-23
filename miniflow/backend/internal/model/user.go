package model

import "time"

// User represents a user in the system
type User struct {
	BaseModel
	Username    string     `gorm:"type:varchar(100);not null;uniqueIndex" json:"username"`
	Password    string     `gorm:"type:varchar(255);not null" json:"-"` // Don't serialize to JSON
	DisplayName string     `gorm:"type:varchar(255)" json:"display_name"`
	Email       string     `gorm:"type:varchar(255);uniqueIndex" json:"email"`
	Phone       string     `gorm:"type:varchar(50)" json:"phone"`
	Role        string     `gorm:"type:varchar(50);not null;default:user;index" json:"role"`
	Status      string     `gorm:"type:varchar(20);not null;default:active;index" json:"status"`
	Avatar      string     `gorm:"type:varchar(500)" json:"avatar"`
	LastLoginAt *time.Time `json:"last_login_at"`
}

// TableName returns the table name for User model
func (User) TableName() string {
	return "users"
}
