package service

import (
	"errors"
	"fmt"
	"time"

	"miniflow/internal/model"
	"miniflow/internal/repository"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// ProcessService handles process business logic
type ProcessService struct {
	processRepo *repository.ProcessRepository
	userRepo    *repository.UserRepository
	logger      *logger.Logger
}

// NewProcessService creates a new process service
func NewProcessService(
	processRepo *repository.ProcessRepository,
	userRepo *repository.UserRepository,
	logger *logger.Logger,
) *ProcessService {
	return &ProcessService{
		processRepo: processRepo,
		userRepo:    userRepo,
		logger:      logger,
	}
}

// CreateProcessRequest represents process creation request
type CreateProcessRequest struct {
	Key         string                      `json:"key" validate:"required,min=3,max=100,alphanum_underscore"`
	Name        string                      `json:"name" validate:"required,min=1,max=255"`
	Description string                      `json:"description"`
	Category    string                      `json:"category"`
	Definition  model.ProcessDefinitionData `json:"definition"`
}

// UpdateProcessRequest represents process update request
type UpdateProcessRequest struct {
	Name        string                      `json:"name" validate:"required,min=1,max=255"`
	Description string                      `json:"description"`
	Category    string                      `json:"category"`
	Definition  model.ProcessDefinitionData `json:"definition"`
}

// ProcessResponse represents process response data
type ProcessResponse struct {
	ID          uint                        `json:"id"`
	Key         string                      `json:"key"`
	Name        string                      `json:"name"`
	Version     int                         `json:"version"`
	Description string                      `json:"description"`
	Category    string                      `json:"category"`
	Status      string                      `json:"status"`
	Definition  model.ProcessDefinitionData `json:"definition"`
	CreatedBy   uint                        `json:"created_by"`
	CreatorName string                      `json:"creator_name"`
	CreatedAt   time.Time                   `json:"created_at"`
	UpdatedAt   time.Time                   `json:"updated_at"`
}

// ProcessListResponse represents process list response
type ProcessListResponse struct {
	Processes []*ProcessResponse `json:"processes"`
	Total     int64              `json:"total"`
	Page      int                `json:"page"`
	PageSize  int                `json:"page_size"`
}

// CreateProcess creates a new process definition
func (s *ProcessService) CreateProcess(userID uint, req *CreateProcessRequest) (*ProcessResponse, error) {
	s.logger.Info("Creating process definition",
		zap.String("key", req.Key),
		zap.String("name", req.Name),
		zap.Uint("user_id", userID),
	)

	// Validate process definition
	if err := s.validateProcessDefinition(&req.Definition); err != nil {
		s.logger.Warn("Process definition validation failed", zap.Error(err))
		return nil, fmt.Errorf("流程定义验证失败: %v", err)
	}

	// Check if key already exists
	exists, err := s.processRepo.ExistsByKey(req.Key)
	if err != nil {
		s.logger.Error("Failed to check process key existence", zap.Error(err))
		return nil, fmt.Errorf("检查流程标识失败: %v", err)
	}
	if exists {
		return nil, errors.New("流程标识已存在")
	}

	// Create process definition
	process := &model.ProcessDefinition{
		ProcessKey:  req.Key,
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		Status:      model.ProcessStatusDraft,
		CreatedBy:   userID,
		Version:     1,
	}

	// Set definition data
	if err := process.SetDefinitionData(&req.Definition); err != nil {
		s.logger.Error("Failed to set process definition data", zap.Error(err))
		return nil, errors.New("流程定义格式错误")
	}

	if err := s.processRepo.Create(process); err != nil {
		s.logger.Error("Failed to create process definition", zap.Error(err))
		return nil, fmt.Errorf("创建流程定义失败: %v", err)
	}

	s.logger.Info("Process definition created successfully",
		zap.Uint("process_id", process.ID),
		zap.String("key", process.Key),
	)

	return s.toProcessResponse(process), nil
}

// GetProcess retrieves a process definition by ID
func (s *ProcessService) GetProcess(processID uint) (*ProcessResponse, error) {
	process, err := s.processRepo.GetByID(processID)
	if err != nil {
		s.logger.Error("Failed to get process definition",
			zap.Uint("process_id", processID),
			zap.Error(err),
		)
		return nil, err
	}

	return s.toProcessResponse(process), nil
}

// UpdateProcess updates a process definition
func (s *ProcessService) UpdateProcess(processID uint, userID uint, req *UpdateProcessRequest) (*ProcessResponse, error) {
	s.logger.Info("Updating process definition",
		zap.Uint("process_id", processID),
		zap.Uint("user_id", userID),
	)

	// Get existing process
	process, err := s.processRepo.GetByID(processID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	if process.CreatedBy != userID {
		s.logger.Warn("User attempted to update process they don't own",
			zap.Uint("process_id", processID),
			zap.Uint("user_id", userID),
			zap.Uint("owner_id", process.CreatedBy),
		)
		return nil, errors.New("只能编辑自己创建的流程")
	}

	// Check if process can be edited
	if !process.CanEdit() {
		return nil, errors.New("已发布的流程不能直接编辑，请创建新版本")
	}

	// Validate process definition
	if err := s.validateProcessDefinition(&req.Definition); err != nil {
		s.logger.Warn("Process definition validation failed", zap.Error(err))
		return nil, fmt.Errorf("流程定义验证失败: %v", err)
	}

	// Update fields
	process.Name = req.Name
	process.Description = req.Description
	process.Category = req.Category

	// Set definition data
	if err := process.SetDefinitionData(&req.Definition); err != nil {
		s.logger.Error("Failed to set process definition data", zap.Error(err))
		return nil, errors.New("流程定义格式错误")
	}

	if err := s.processRepo.Update(process); err != nil {
		s.logger.Error("Failed to update process definition", zap.Error(err))
		return nil, errors.New("更新流程定义失败")
	}

	s.logger.Info("Process definition updated successfully", zap.Uint("process_id", processID))

	return s.toProcessResponse(process), nil
}

// DeleteProcess deletes a process definition
func (s *ProcessService) DeleteProcess(processID uint, userID uint) error {
	s.logger.Info("Deleting process definition",
		zap.Uint("process_id", processID),
		zap.Uint("user_id", userID),
	)

	// Get existing process
	process, err := s.processRepo.GetByID(processID)
	if err != nil {
		return err
	}

	// Check ownership
	if process.CreatedBy != userID {
		s.logger.Warn("User attempted to delete process they don't own",
			zap.Uint("process_id", processID),
			zap.Uint("user_id", userID),
			zap.Uint("owner_id", process.CreatedBy),
		)
		return errors.New("只能删除自己创建的流程")
	}

	// Check if process can be deleted
	if !process.CanDelete() {
		return errors.New("已发布的流程不能删除，请先归档")
	}

	if err := s.processRepo.Delete(processID); err != nil {
		s.logger.Error("Failed to delete process definition", zap.Error(err))
		return errors.New("删除流程定义失败")
	}

	s.logger.Info("Process definition deleted successfully", zap.Uint("process_id", processID))
	return nil
}

// GetUserProcesses retrieves processes created by a user with pagination
func (s *ProcessService) GetUserProcesses(userID uint, page, pageSize int) (*ProcessListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize
	filters := map[string]interface{}{
		"created_by": userID,
	}

	processes, total, err := s.processRepo.List(offset, pageSize, filters)
	if err != nil {
		s.logger.Error("Failed to get user processes", zap.Error(err))
		return nil, err
	}

	processResponses := make([]*ProcessResponse, len(processes))
	for i, process := range processes {
		processResponses[i] = s.toProcessResponse(process)
	}

	return &ProcessListResponse{
		Processes: processResponses,
		Total:     total,
		Page:      page,
		PageSize:  pageSize,
	}, nil
}

// GetProcesses retrieves all processes with pagination and filters
func (s *ProcessService) GetProcesses(page, pageSize int, filters map[string]interface{}) (*ProcessListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize
	processes, total, err := s.processRepo.List(offset, pageSize, filters)
	if err != nil {
		s.logger.Error("Failed to get processes", zap.Error(err))
		return nil, err
	}

	processResponses := make([]*ProcessResponse, len(processes))
	for i, process := range processes {
		processResponses[i] = s.toProcessResponse(process)
	}

	return &ProcessListResponse{
		Processes: processResponses,
		Total:     total,
		Page:      page,
		PageSize:  pageSize,
	}, nil
}

// CopyProcess creates a copy of an existing process
func (s *ProcessService) CopyProcess(processID uint, userID uint) (*ProcessResponse, error) {
	s.logger.Info("Copying process definition",
		zap.Uint("process_id", processID),
		zap.Uint("user_id", userID),
	)

	// Get original process
	originalProcess, err := s.processRepo.GetByID(processID)
	if err != nil {
		return nil, err
	}

	// Get definition data
	definitionData, err := originalProcess.GetDefinitionData()
	if err != nil {
		s.logger.Error("Failed to parse process definition", zap.Error(err))
		return nil, errors.New("流程定义格式错误")
	}

	// Create copy request
	copyReq := &CreateProcessRequest{
		Key:         fmt.Sprintf("%s_copy_%d", originalProcess.Key, time.Now().Unix()),
		Name:        fmt.Sprintf("%s (副本)", originalProcess.Name),
		Description: originalProcess.Description,
		Category:    originalProcess.Category,
		Definition:  *definitionData,
	}

	return s.CreateProcess(userID, copyReq)
}

// PublishProcess publishes a process definition
func (s *ProcessService) PublishProcess(processID uint, userID uint) error {
	s.logger.Info("Publishing process definition",
		zap.Uint("process_id", processID),
		zap.Uint("user_id", userID),
	)

	// Get process
	process, err := s.processRepo.GetByID(processID)
	if err != nil {
		return err
	}

	// Check ownership
	if process.CreatedBy != userID {
		return errors.New("只能发布自己创建的流程")
	}

	// Check current status
	if process.Status != model.ProcessStatusDraft {
		return errors.New("只能发布草稿状态的流程")
	}

	// Validate process definition
	definitionData, err := process.GetDefinitionData()
	if err != nil {
		return errors.New("流程定义格式错误")
	}

	if err := s.validateProcessDefinition(definitionData); err != nil {
		return fmt.Errorf("流程定义验证失败: %v", err)
	}

	// Update status
	if err := s.processRepo.UpdateStatus(processID, model.ProcessStatusPublished); err != nil {
		s.logger.Error("Failed to publish process", zap.Error(err))
		return errors.New("发布流程失败")
	}

	s.logger.Info("Process published successfully", zap.Uint("process_id", processID))
	return nil
}

// validateProcessDefinition validates a process definition
func (s *ProcessService) validateProcessDefinition(definition *model.ProcessDefinitionData) error {
	if len(definition.Nodes) == 0 {
		return errors.New("流程必须包含至少一个节点")
	}

	// Check for start nodes
	startNodes := 0
	endNodes := 0
	for _, node := range definition.Nodes {
		switch node.Type {
		case model.NodeTypeStart:
			startNodes++
		case model.NodeTypeEnd:
			endNodes++
		}
	}

	if startNodes == 0 {
		return errors.New("流程必须包含一个开始节点")
	}
	if startNodes > 1 {
		return errors.New("流程只能包含一个开始节点")
	}
	if endNodes == 0 {
		return errors.New("流程必须包含至少一个结束节点")
	}

	// Check node connections
	nodeMap := make(map[string]*model.ProcessNode)
	for i := range definition.Nodes {
		nodeMap[definition.Nodes[i].ID] = &definition.Nodes[i]
	}

	for _, node := range definition.Nodes {
		if node.Type != model.NodeTypeEnd {
			// Check outgoing flows
			hasOutgoing := false
			for _, flow := range definition.Flows {
				if flow.From == node.ID {
					hasOutgoing = true
					break
				}
			}
			if !hasOutgoing {
				return fmt.Errorf("节点 '%s' 缺少出口连线", node.Name)
			}
		}

		if node.Type != model.NodeTypeStart {
			// Check incoming flows
			hasIncoming := false
			for _, flow := range definition.Flows {
				if flow.To == node.ID {
					hasIncoming = true
					break
				}
			}
			if !hasIncoming {
				return fmt.Errorf("节点 '%s' 缺少入口连线", node.Name)
			}
		}
	}

	// Validate flows
	for _, flow := range definition.Flows {
		if _, exists := nodeMap[flow.From]; !exists {
			return fmt.Errorf("连线的源节点 '%s' 不存在", flow.From)
		}
		if _, exists := nodeMap[flow.To]; !exists {
			return fmt.Errorf("连线的目标节点 '%s' 不存在", flow.To)
		}
	}

	return nil
}

// toProcessResponse converts ProcessDefinition to ProcessResponse
func (s *ProcessService) toProcessResponse(process *model.ProcessDefinition) *ProcessResponse {
	definition, _ := process.GetDefinitionData()
	if definition == nil {
		definition = &model.ProcessDefinitionData{
			Nodes: []model.ProcessNode{},
			Flows: []model.ProcessFlow{},
		}
	}

	creatorName := ""
	if process.Creator.Username != "" {
		if process.Creator.DisplayName != "" {
			creatorName = process.Creator.DisplayName
		} else {
			creatorName = process.Creator.Username
		}
	}

	return &ProcessResponse{
		ID:          process.ID,
		Key:         process.ProcessKey,
		Name:        process.Name,
		Version:     process.Version,
		Description: process.Description,
		Category:    process.Category,
		Status:      process.Status,
		Definition:  *definition,
		CreatedBy:   process.CreatedBy,
		CreatorName: creatorName,
		CreatedAt:   process.CreatedAt,
		UpdatedAt:   process.UpdatedAt,
	}
}

// GetProcessStats returns process statistics
func (s *ProcessService) GetProcessStats() (map[string]int64, error) {
	stats := make(map[string]int64)

	// Count by status
	draftCount, err := s.processRepo.CountByStatus(model.ProcessStatusDraft)
	if err != nil {
		return nil, err
	}
	stats["draft_count"] = draftCount

	publishedCount, err := s.processRepo.CountByStatus(model.ProcessStatusPublished)
	if err != nil {
		return nil, err
	}
	stats["published_count"] = publishedCount

	archivedCount, err := s.processRepo.CountByStatus(model.ProcessStatusArchived)
	if err != nil {
		return nil, err
	}
	stats["archived_count"] = archivedCount

	stats["total_count"] = draftCount + publishedCount + archivedCount

	return stats, nil
}

// GetUserProcessStats returns user's process statistics
func (s *ProcessService) GetUserProcessStats(userID uint) (map[string]int64, error) {
	stats := make(map[string]int64)

	// Count user's processes
	userProcessCount, err := s.processRepo.CountByCreator(userID)
	if err != nil {
		return nil, err
	}
	stats["user_process_count"] = userProcessCount

	return stats, nil
}
