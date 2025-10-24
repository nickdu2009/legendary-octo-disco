package model

import (
	"encoding/json"
	"time"
)

// ProcessDefinition represents a process definition in the system
type ProcessDefinition struct {
	BaseModel
	Key            string `gorm:"type:varchar(100);not null;uniqueIndex:idx_key_version,composite:key" json:"key"`
	Name           string `gorm:"type:varchar(255);not null;index" json:"name"`
	Version        int    `gorm:"not null;default:1;uniqueIndex:idx_key_version,composite:version" json:"version"`
	Description    string `gorm:"type:text" json:"description"`
	Category       string `gorm:"type:varchar(50);index" json:"category"`
	DefinitionJSON string `gorm:"type:json;not null" json:"definition_json"`
	Status         string `gorm:"type:varchar(20);not null;default:draft;index" json:"status"`
	CreatedBy      uint   `gorm:"not null;index;constraint:OnDelete:RESTRICT" json:"created_by"`

	// 关联关系
	Creator   User              `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Instances []ProcessInstance `gorm:"foreignKey:DefinitionID;constraint:OnDelete:CASCADE" json:"instances,omitempty"`
}

// TableName returns the table name for ProcessDefinition model
func (ProcessDefinition) TableName() string {
	return "process_definitions"
}

// ProcessNode represents a node in the process definition
type ProcessNode struct {
	ID    string                 `json:"id"`
	Type  string                 `json:"type"` // start, end, userTask, serviceTask, gateway
	Name  string                 `json:"name"`
	X     float64                `json:"x"`
	Y     float64                `json:"y"`
	Props map[string]interface{} `json:"props,omitempty"`
}

// ProcessFlow represents a flow/connection between nodes
type ProcessFlow struct {
	ID        string `json:"id"`
	From      string `json:"from"`
	To        string `json:"to"`
	Condition string `json:"condition,omitempty"`
	Label     string `json:"label,omitempty"`
}

// ProcessDefinitionData represents the complete process definition structure
type ProcessDefinitionData struct {
	Nodes []ProcessNode `json:"nodes"`
	Flows []ProcessFlow `json:"flows"`
}

// ProcessInstance represents a running instance of a process
type ProcessInstance struct {
	BaseModel
	DefinitionID uint       `gorm:"not null;index:idx_def_status,composite:definition_id;constraint:OnDelete:CASCADE" json:"definition_id"`
	BusinessKey  string     `gorm:"type:varchar(255);index" json:"business_key"`
	CurrentNode  string     `gorm:"type:varchar(64);index" json:"current_node"`
	Status       string     `gorm:"type:varchar(20);not null;default:running;index:idx_def_status,composite:status;index" json:"status"`
	Variables    string     `gorm:"type:json" json:"variables"`
	StartTime    time.Time  `gorm:"not null;index" json:"start_time"`
	EndTime      *time.Time `gorm:"index" json:"end_time"`
	StarterID    uint       `gorm:"not null;index;constraint:OnDelete:RESTRICT" json:"starter_id"`

	// 关联关系
	Definition ProcessDefinition `gorm:"foreignKey:DefinitionID" json:"definition,omitempty"`
	Starter    User              `gorm:"foreignKey:StarterID" json:"starter,omitempty"`
	Tasks      []TaskInstance    `gorm:"foreignKey:InstanceID;constraint:OnDelete:CASCADE" json:"tasks,omitempty"`
}

// TableName returns the table name for ProcessInstance model
func (ProcessInstance) TableName() string {
	return "process_instances"
}

// TaskInstance represents a task within a process instance
type TaskInstance struct {
	BaseModel
	InstanceID   uint       `gorm:"not null;index:idx_instance_status,composite:instance_id;constraint:OnDelete:CASCADE" json:"instance_id"`
	NodeID       string     `gorm:"type:varchar(64);not null;index" json:"node_id"`
	Name         string     `gorm:"type:varchar(255);not null" json:"name"`
	AssigneeID   *uint      `gorm:"index:idx_assignee_status,composite:assignee_id;constraint:OnDelete:SET NULL" json:"assignee_id"`
	Status       string     `gorm:"type:varchar(20);not null;default:created;index:idx_instance_status,composite:status;index:idx_assignee_status,composite:status;index" json:"status"`
	Priority     int        `gorm:"not null;default:50;index" json:"priority"`
	DueDate      *time.Time `gorm:"index" json:"due_date"`
	ClaimTime    *time.Time `json:"claim_time"`
	CompleteTime *time.Time `json:"complete_time"`
	Comment      string     `gorm:"type:text" json:"comment"`
	FormData     string     `gorm:"type:json" json:"form_data"`

	// 关联关系
	Instance ProcessInstance `gorm:"foreignKey:InstanceID" json:"instance,omitempty"`
	Assignee *User           `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
}

// TableName returns the table name for TaskInstance model
func (TaskInstance) TableName() string {
	return "task_instances"
}

// GetDefinitionData parses the JSON definition into ProcessDefinitionData
func (p *ProcessDefinition) GetDefinitionData() (*ProcessDefinitionData, error) {
	var data ProcessDefinitionData
	if err := json.Unmarshal([]byte(p.DefinitionJSON), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

// SetDefinitionData sets the process definition from ProcessDefinitionData
func (p *ProcessDefinition) SetDefinitionData(data *ProcessDefinitionData) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	p.DefinitionJSON = string(jsonData)
	return nil
}

// IsLatestVersion checks if this is the latest version of the process
func (p *ProcessDefinition) IsLatestVersion() bool {
	// This would need to be implemented with a repository query
	// For now, return true as a placeholder
	return true
}

// CanEdit checks if the process can be edited
func (p *ProcessDefinition) CanEdit() bool {
	return p.Status == "draft"
}

// CanDelete checks if the process can be deleted
func (p *ProcessDefinition) CanDelete() bool {
	return p.Status == "draft" || p.Status == "archived"
}

// ProcessStatus constants
const (
	ProcessStatusDraft     = "draft"
	ProcessStatusPublished = "published"
	ProcessStatusArchived  = "archived"
)

// ProcessNodeType constants
const (
	NodeTypeStart       = "start"
	NodeTypeEnd         = "end"
	NodeTypeUserTask    = "userTask"
	NodeTypeServiceTask = "serviceTask"
	NodeTypeGateway     = "gateway"
)

// ProcessInstanceStatus constants
const (
	InstanceStatusRunning   = "running"
	InstanceStatusCompleted = "completed"
	InstanceStatusSuspended = "suspended"
	InstanceStatusAborted   = "aborted"
)

// TaskInstanceStatus constants
const (
	TaskStatusCreated   = "created"
	TaskStatusClaimed   = "claimed"
	TaskStatusCompleted = "completed"
	TaskStatusSkipped   = "skipped"
)
