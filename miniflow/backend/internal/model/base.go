package model

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel contains common columns for all tables
type BaseModel struct {
	ID        uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	CreatedAt time.Time      `gorm:"not null;index" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to set created_at and updated_at
func (base *BaseModel) BeforeCreate(tx *gorm.DB) error {
	now := time.Now()
	if base.CreatedAt.IsZero() {
		base.CreatedAt = now
	}
	if base.UpdatedAt.IsZero() {
		base.UpdatedAt = now
	}
	return nil
}

// BeforeUpdate hook to set updated_at
func (base *BaseModel) BeforeUpdate(tx *gorm.DB) error {
	base.UpdatedAt = time.Now()
	return nil
}
