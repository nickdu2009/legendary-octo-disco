package engine

import (
	"errors"
	"fmt"
	"math/rand"
	"sort"
	"time"

	"miniflow/internal/model"
	"miniflow/internal/repository"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// TaskAssignmentStrategy 任务分配策略接口
type TaskAssignmentStrategy interface {
	AssignTask(task *model.TaskInstance, availableUsers []*model.User, repo *repository.TaskRepository) (*model.User, error)
	GetStrategyName() string
}

// DirectAssignmentStrategy 直接分配策略
type DirectAssignmentStrategy struct {
	logger *logger.Logger
}

func NewDirectAssignmentStrategy(logger *logger.Logger) *DirectAssignmentStrategy {
	return &DirectAssignmentStrategy{logger: logger}
}

func (s *DirectAssignmentStrategy) GetStrategyName() string {
	return "direct"
}

func (s *DirectAssignmentStrategy) AssignTask(task *model.TaskInstance, users []*model.User, repo *repository.TaskRepository) (*model.User, error) {
	if len(users) == 0 {
		return nil, errors.New("没有可分配的用户")
	}

	// 如果任务已经指定了分配人，直接返回
	if task.AssigneeID != nil {
		for _, user := range users {
			if user.ID == *task.AssigneeID {
				return user, nil
			}
		}
	}

	// 否则分配给第一个可用用户
	return users[0], nil
}

// RoundRobinStrategy 轮询分配策略
type RoundRobinStrategy struct {
	logger    *logger.Logger
	lastIndex map[string]int // 记录每个节点的最后分配索引
}

func NewRoundRobinStrategy(logger *logger.Logger) *RoundRobinStrategy {
	return &RoundRobinStrategy{
		logger:    logger,
		lastIndex: make(map[string]int),
	}
}

func (s *RoundRobinStrategy) GetStrategyName() string {
	return "round_robin"
}

func (s *RoundRobinStrategy) AssignTask(task *model.TaskInstance, users []*model.User, repo *repository.TaskRepository) (*model.User, error) {
	if len(users) == 0 {
		return nil, errors.New("没有可分配的用户")
	}

	// 获取当前节点的轮询索引
	nodeKey := fmt.Sprintf("%d_%s", task.InstanceID, task.NodeID)
	currentIndex := s.lastIndex[nodeKey]
	
	// 轮询到下一个用户
	nextIndex := (currentIndex + 1) % len(users)
	s.lastIndex[nodeKey] = nextIndex

	selectedUser := users[nextIndex]
	
	s.logger.Info("Round robin assignment",
		zap.String("node_key", nodeKey),
		zap.Int("selected_index", nextIndex),
		zap.Uint("user_id", selectedUser.ID),
	)

	return selectedUser, nil
}

// LoadBalancingStrategy 负载均衡分配策略
type LoadBalancingStrategy struct {
	logger *logger.Logger
}

func NewLoadBalancingStrategy(logger *logger.Logger) *LoadBalancingStrategy {
	return &LoadBalancingStrategy{logger: logger}
}

func (s *LoadBalancingStrategy) GetStrategyName() string {
	return "load_balancing"
}

func (s *LoadBalancingStrategy) AssignTask(task *model.TaskInstance, users []*model.User, repo *repository.TaskRepository) (*model.User, error) {
	if len(users) == 0 {
		return nil, errors.New("没有可分配的用户")
	}

	// 获取每个用户的当前任务负载
	userLoads := make(map[uint]int)
	for _, user := range users {
		activeTasks, err := repo.CountUserActiveTasks(user.ID)
		if err != nil {
			s.logger.Warn("Failed to get user task count", zap.Uint("user_id", user.ID), zap.Error(err))
			activeTasks = 0
		}
		userLoads[user.ID] = activeTasks
	}

	// 找到负载最小的用户
	var selectedUser *model.User
	minLoad := int(^uint(0) >> 1) // 最大整数值

	for _, user := range users {
		if load := userLoads[user.ID]; load < minLoad {
			minLoad = load
			selectedUser = user
		}
	}

	if selectedUser == nil {
		return users[0], nil // 兜底方案
	}

	s.logger.Info("Load balancing assignment",
		zap.Uint("user_id", selectedUser.ID),
		zap.Int("current_load", minLoad),
	)

	return selectedUser, nil
}

// PriorityBasedStrategy 基于优先级的分配策略
type PriorityBasedStrategy struct {
	logger *logger.Logger
}

func NewPriorityBasedStrategy(logger *logger.Logger) *PriorityBasedStrategy {
	return &PriorityBasedStrategy{logger: logger}
}

func (s *PriorityBasedStrategy) GetStrategyName() string {
	return "priority_based"
}

func (s *PriorityBasedStrategy) AssignTask(task *model.TaskInstance, users []*model.User, repo *repository.TaskRepository) (*model.User, error) {
	if len(users) == 0 {
		return nil, errors.New("没有可分配的用户")
	}

	// 根据用户角色和任务优先级进行分配
	type userScore struct {
		user  *model.User
		score int
	}

	var candidates []userScore

	for _, user := range users {
		score := s.calculateUserScore(user, task)
		candidates = append(candidates, userScore{user: user, score: score})
	}

	// 按分数排序，分数高的优先
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].score > candidates[j].score
	})

	selectedUser := candidates[0].user

	s.logger.Info("Priority based assignment",
		zap.Uint("user_id", selectedUser.ID),
		zap.String("user_role", selectedUser.Role),
		zap.Int("score", candidates[0].score),
		zap.Int("task_priority", task.Priority),
	)

	return selectedUser, nil
}

// calculateUserScore 计算用户分配分数
func (s *PriorityBasedStrategy) calculateUserScore(user *model.User, task *model.TaskInstance) int {
	score := 0

	// 根据用户角色给分
	switch user.Role {
	case "admin":
		score += 100
	case "manager":
		score += 80
	case "user":
		score += 60
	default:
		score += 40
	}

	// 根据任务优先级调整分数
	if task.Priority >= 80 {
		score += 30 // 高优先级任务
	} else if task.Priority >= 60 {
		score += 20 // 中优先级任务
	} else {
		score += 10 // 低优先级任务
	}

	// 如果用户状态不活跃，降低分数
	if user.Status != "active" {
		score -= 50
	}

	return score
}

// RandomAssignmentStrategy 随机分配策略
type RandomAssignmentStrategy struct {
	logger *logger.Logger
	rand   *rand.Rand
}

func NewRandomAssignmentStrategy(logger *logger.Logger) *RandomAssignmentStrategy {
	return &RandomAssignmentStrategy{
		logger: logger,
		rand:   rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (s *RandomAssignmentStrategy) GetStrategyName() string {
	return "random"
}

func (s *RandomAssignmentStrategy) AssignTask(task *model.TaskInstance, users []*model.User, repo *repository.TaskRepository) (*model.User, error) {
	if len(users) == 0 {
		return nil, errors.New("没有可分配的用户")
	}

	// 随机选择用户
	index := s.rand.Intn(len(users))
	selectedUser := users[index]

	s.logger.Info("Random assignment",
		zap.Uint("user_id", selectedUser.ID),
		zap.Int("selected_index", index),
		zap.Int("total_users", len(users)),
	)

	return selectedUser, nil
}

// TaskAssignmentManager 任务分配管理器
type TaskAssignmentManager struct {
	strategies map[string]TaskAssignmentStrategy
	userRepo   *repository.UserRepository
	taskRepo   *repository.TaskRepository
	logger     *logger.Logger
}

// NewTaskAssignmentManager 创建任务分配管理器
func NewTaskAssignmentManager(
	userRepo *repository.UserRepository,
	taskRepo *repository.TaskRepository,
	logger *logger.Logger,
) *TaskAssignmentManager {
	manager := &TaskAssignmentManager{
		strategies: make(map[string]TaskAssignmentStrategy),
		userRepo:   userRepo,
		taskRepo:   taskRepo,
		logger:     logger,
	}

	// 注册默认策略
	manager.RegisterStrategy(NewDirectAssignmentStrategy(logger))
	manager.RegisterStrategy(NewRoundRobinStrategy(logger))
	manager.RegisterStrategy(NewLoadBalancingStrategy(logger))
	manager.RegisterStrategy(NewPriorityBasedStrategy(logger))
	manager.RegisterStrategy(NewRandomAssignmentStrategy(logger))

	return manager
}

// RegisterStrategy 注册分配策略
func (m *TaskAssignmentManager) RegisterStrategy(strategy TaskAssignmentStrategy) {
	m.strategies[strategy.GetStrategyName()] = strategy
	m.logger.Info("Task assignment strategy registered", zap.String("strategy", strategy.GetStrategyName()))
}

// AssignTask 分配任务
func (m *TaskAssignmentManager) AssignTask(task *model.TaskInstance, strategyName string) error {
	strategy, exists := m.strategies[strategyName]
	if !exists {
		strategy = m.strategies["direct"] // 默认策略
		m.logger.Warn("Unknown assignment strategy, using default",
			zap.String("requested", strategyName),
			zap.String("using", "direct"),
		)
	}

	// 获取可分配的用户
	availableUsers, err := m.getAvailableUsers(task)
	if err != nil {
		return fmt.Errorf("获取可分配用户失败: %v", err)
	}

	if len(availableUsers) == 0 {
		return errors.New("没有可分配的用户")
	}

	// 使用策略分配任务
	selectedUser, err := strategy.AssignTask(task, availableUsers, m.taskRepo)
	if err != nil {
		return fmt.Errorf("任务分配失败: %v", err)
	}

	// 更新任务分配信息
	task.AssigneeID = &selectedUser.ID
	task.Status = model.TaskStatusAssigned
	
	if err := m.taskRepo.Update(task); err != nil {
		return fmt.Errorf("更新任务分配失败: %v", err)
	}

	m.logger.Info("Task assigned successfully",
		zap.Uint("task_id", task.ID),
		zap.Uint("assignee_id", selectedUser.ID),
		zap.String("strategy", strategyName),
	)

	return nil
}

// getAvailableUsers 获取可分配的用户
func (m *TaskAssignmentManager) getAvailableUsers(task *model.TaskInstance) ([]*model.User, error) {
	// 获取所有活跃用户
	users, err := m.userRepo.GetActiveUsers()
	if err != nil {
		return nil, err
	}

	// TODO: 根据任务要求过滤用户
	// 例如：角色要求、技能要求、工作组等

	var availableUsers []*model.User
	for i := range users {
		if m.isUserAvailable(&users[i], task) {
			availableUsers = append(availableUsers, &users[i])
		}
	}

	return availableUsers, nil
}

// isUserAvailable 检查用户是否可分配
func (m *TaskAssignmentManager) isUserAvailable(user *model.User, task *model.TaskInstance) bool {
	// 检查用户状态
	if user.Status != "active" {
		return false
	}

	// 检查用户角色权限
	// TODO: 实现更复杂的权限检查

	return true
}

// GetAvailableStrategies 获取可用的分配策略
func (m *TaskAssignmentManager) GetAvailableStrategies() []string {
	var strategies []string
	for name := range m.strategies {
		strategies = append(strategies, name)
	}
	sort.Strings(strategies)
	return strategies
}

// GetStrategyDescription 获取策略描述
func (m *TaskAssignmentManager) GetStrategyDescription(strategyName string) string {
	descriptions := map[string]string{
		"direct":         "直接分配 - 分配给指定用户或第一个可用用户",
		"round_robin":    "轮询分配 - 按顺序轮流分配给用户",
		"load_balancing": "负载均衡 - 分配给当前任务最少的用户",
		"priority_based": "优先级分配 - 根据用户角色和任务优先级分配",
		"random":         "随机分配 - 随机选择可用用户",
	}
	
	if desc, exists := descriptions[strategyName]; exists {
		return desc
	}
	return "未知策略"
}
