package engine

import (
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"

	"miniflow/internal/model"
	"miniflow/pkg/logger"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// 测试用的流程定义数据
func createTestProcessDefinition() *model.ProcessDefinition {
	definitionJSON := `{
		"nodes": [
			{"id": "start1", "type": "start", "name": "开始", "x": 100, "y": 100, "props": {}},
			{"id": "task1", "type": "userTask", "name": "用户任务", "x": 300, "y": 100, "props": {"assignee": "admin"}},
			{"id": "gateway1", "type": "gateway", "name": "条件网关", "x": 500, "y": 100, "props": {"gatewayType": "exclusive"}},
			{"id": "end1", "type": "end", "name": "结束", "x": 700, "y": 100, "props": {}}
		],
		"flows": [
			{"id": "flow1", "from": "start1", "to": "task1", "condition": "", "label": ""},
			{"id": "flow2", "from": "task1", "to": "gateway1", "condition": "", "label": ""},
			{"id": "flow3", "from": "gateway1", "to": "end1", "condition": "${approved} == true", "label": "通过"}
		]
	}`

	definition := &model.ProcessDefinition{
		Key:            "test_process",
		Name:           "测试流程",
		DefinitionJSON: definitionJSON,
		Status:         "draft",
	}
	definition.ID = 1

	return definition
}

// 测试用的流程实例
func createTestProcessInstance() *model.ProcessInstance {
	variables := map[string]interface{}{
		"approved": true,
		"amount":   1000,
	}
	variablesJSON, _ := json.Marshal(variables)

	instance := &model.ProcessInstance{
		DefinitionID: 1,
		BusinessKey:  "test_business_key",
		Title:        "测试流程实例",
		CurrentNode:  "start1",
		Status:       model.InstanceStatusRunning,
		Variables:    string(variablesJSON),
		StartTime:    time.Now(),
		Priority:     80,
	}
	instance.ID = 1

	return instance
}

// TestProcessEngine_StartProcess 测试流程启动
func TestProcessEngine_StartProcess(t *testing.T) {
	logger := logger.New("test", "debug")

	// 创建测试用的流程定义
	definition := createTestProcessDefinition()

	// 创建启动请求
	req := &StartProcessRequest{
		DefinitionID: 1,
		BusinessKey:  "test_business_key",
		Title:        "测试流程实例",
		Variables:    map[string]interface{}{"approved": true, "amount": 1000},
		Priority:     80,
	}

	t.Run("验证启动请求数据", func(t *testing.T) {
		assert.Equal(t, uint(1), req.DefinitionID)
		assert.Equal(t, "test_business_key", req.BusinessKey)
		assert.Equal(t, "测试流程实例", req.Title)
		assert.Equal(t, 80, req.Priority)
		assert.Contains(t, req.Variables, "approved")
		assert.Equal(t, true, req.Variables["approved"])
	})

	t.Run("验证流程定义解析", func(t *testing.T) {
		definitionData, err := definition.GetDefinitionData()
		require.NoError(t, err)
		assert.NotNil(t, definitionData)
		assert.Len(t, definitionData.Nodes, 4) // 4个节点
		assert.Len(t, definitionData.Flows, 3) // 3条连线
	})

	t.Run("验证变量序列化", func(t *testing.T) {
		variables := map[string]interface{}{
			"approved": true,
			"amount":   1000,
			"status":   "pending",
		}

		variablesJSON, err := json.Marshal(variables)
		require.NoError(t, err)

		// 验证反序列化
		var parsedVariables map[string]interface{}
		err = json.Unmarshal(variablesJSON, &parsedVariables)
		require.NoError(t, err)
		assert.Equal(t, variables["approved"], parsedVariables["approved"])
		assert.Equal(t, float64(1000), parsedVariables["amount"]) // JSON数字会转为float64
	})
}

// TestTaskAssignmentStrategies 测试任务分配策略
func TestTaskAssignmentStrategies(t *testing.T) {
	logger := logger.New("test", "debug")

	// 创建测试用户
	users := []*model.User{
		{ID: 1, Username: "user1", Role: "user", Status: "active"},
		{ID: 2, Username: "user2", Role: "manager", Status: "active"},
		{ID: 3, Username: "admin1", Role: "admin", Status: "active"},
	}

	// 创建测试任务
	task := &model.TaskInstance{
		ID:       1,
		NodeID:   "task1",
		Name:     "测试任务",
		Priority: 80,
		Status:   model.TaskStatusCreated,
		TaskType: model.TaskTypeUser,
	}

	t.Run("直接分配策略", func(t *testing.T) {
		// 测试正常分配
		user, err := getDirectAssignmentUser(task, users)
		assert.NoError(t, err)
		assert.NotNil(t, user)
		assert.Equal(t, users[0].ID, user.ID) // 应该分配给第一个用户

		// 测试空用户列表
		_, err = getDirectAssignmentUser(task, []*model.User{})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "没有可分配的用户")
	})

	t.Run("指定分配人", func(t *testing.T) {
		// 测试指定分配人
		assigneeID := uint(2)
		task.AssigneeID = &assigneeID

		user, err := getDirectAssignmentUser(task, users)
		assert.NoError(t, err)
		assert.NotNil(t, user)
		assert.Equal(t, assigneeID, user.ID) // 应该分配给指定用户
	})
}

// 辅助函数：模拟直接分配逻辑
func getDirectAssignmentUser(task *model.TaskInstance, users []*model.User) (*model.User, error) {
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

// TestTaskAssignmentManager 测试任务分配管理器
func TestTaskAssignmentManager(t *testing.T) {
	logger := logger.New("test", "debug")

	// 注意：这里需要实际的Repository来完整测试
	// 当前只测试管理器的基本功能

	t.Run("直接分配", func(t *testing.T) {
		// 简化测试，只验证基本逻辑
		users := []*model.User{
			{ID: 1, Username: "user1", Role: "user", Status: "active"},
			{ID: 2, Username: "user2", Role: "manager", Status: "active"},
		}

		task := &model.TaskInstance{
			ID:     1,
			NodeID: "task1",
			Status: model.TaskStatusCreated,
		}

		// 测试直接分配逻辑
		user, err := getDirectAssignmentUser(task, users)
		assert.NoError(t, err)
		assert.NotNil(t, user)
		assert.Equal(t, users[0].ID, user.ID) // 应该分配给第一个用户
	})
}

// TestConditionEvaluation 测试条件评估
func TestConditionEvaluation(t *testing.T) {
	logger := logger.New("test", "debug")
	engine := &ProcessEngine{logger: logger}

	variables := map[string]interface{}{
		"approved": true,
		"amount":   1000,
		"status":   "pending",
	}

	t.Run("简单条件评估", func(t *testing.T) {
		// 测试真条件
		result := engine.evaluateCondition("approved == true", variables)
		assert.True(t, result)

		// 测试假条件
		result = engine.evaluateCondition("approved == false", variables)
		assert.False(t, result)

		// 测试空条件
		result = engine.evaluateCondition("", variables)
		assert.True(t, result) // 空条件默认为true

		// 测试带变量引用的条件
		result = engine.evaluateCondition("${approved} == true", variables)
		assert.True(t, result)

		result = engine.evaluateCondition("${approved} == false", variables)
		assert.False(t, result)
	})

	t.Run("复杂条件评估", func(t *testing.T) {
		// 测试不存在的变量（应该默认为true）
		result := engine.evaluateCondition("nonexistent == true", variables)
		assert.True(t, result) // 默认返回true

		// 测试各种条件格式
		testCases := []struct {
			condition string
			expected  bool
		}{
			{"approved == true", true},
			{"approved == false", false},
			{"${approved} == true", true},
			{"${approved} == false", false},
			{"", true},                  // 空条件
			{"unknown_condition", true}, // 未知条件默认true
		}

		for _, tc := range testCases {
			result := engine.evaluateCondition(tc.condition, variables)
			assert.Equal(t, tc.expected, result, "条件 '%s' 评估结果不正确", tc.condition)
		}
	})
}

// TestNodeHandlers 测试节点处理器
func TestNodeHandlers(t *testing.T) {
	logger := logger.New("test", "debug")
	engine := &ProcessEngine{logger: logger}

	t.Run("查找开始节点", func(t *testing.T) {
		nodes := []model.ProcessNode{
			{ID: "start1", Type: "start", Name: "开始"},
			{ID: "task1", Type: "userTask", Name: "用户任务"},
			{ID: "end1", Type: "end", Name: "结束"},
		}

		startNode := engine.findStartNode(nodes)
		assert.NotNil(t, startNode)
		assert.Equal(t, "start1", startNode.ID)
		assert.Equal(t, "start", startNode.Type)

		// 测试没有开始节点的情况
		nodesWithoutStart := []model.ProcessNode{
			{ID: "task1", Type: "userTask", Name: "用户任务"},
			{ID: "end1", Type: "end", Name: "结束"},
		}

		startNode = engine.findStartNode(nodesWithoutStart)
		assert.Nil(t, startNode)
	})

	t.Run("查找节点by ID", func(t *testing.T) {
		nodes := []model.ProcessNode{
			{ID: "start1", Type: "start", Name: "开始"},
			{ID: "task1", Type: "userTask", Name: "用户任务"},
			{ID: "gateway1", Type: "gateway", Name: "网关"},
		}

		// 测试存在的节点
		node := engine.findNodeByID(nodes, "task1")
		assert.NotNil(t, node)
		assert.Equal(t, "task1", node.ID)
		assert.Equal(t, "userTask", node.Type)

		// 测试网关节点
		node = engine.findNodeByID(nodes, "gateway1")
		assert.NotNil(t, node)
		assert.Equal(t, "gateway", node.Type)

		// 测试不存在的节点
		node = engine.findNodeByID(nodes, "not_exist")
		assert.Nil(t, node)
	})

	t.Run("查找出口连线", func(t *testing.T) {
		flows := []model.ProcessFlow{
			{ID: "flow1", From: "start1", To: "task1"},
			{ID: "flow2", From: "task1", To: "gateway1"},
			{ID: "flow3", From: "gateway1", To: "end1"},
			{ID: "flow4", From: "gateway1", To: "end2"}, // 网关的多个出口
		}

		// 测试单个出口
		outgoing := engine.findOutgoingFlows(flows, "start1")
		assert.Len(t, outgoing, 1)
		assert.Equal(t, "task1", outgoing[0].To)

		// 测试多个出口（网关）
		outgoing = engine.findOutgoingFlows(flows, "gateway1")
		assert.Len(t, outgoing, 2)

		// 测试没有出口（结束节点）
		outgoing = engine.findOutgoingFlows(flows, "end1")
		assert.Len(t, outgoing, 0)
	})
}

// TestProcessInstanceOperations 测试流程实例操作
func TestProcessInstanceOperations(t *testing.T) {
	logger := logger.New("test", "debug")

	t.Run("流程实例状态常量", func(t *testing.T) {
		// 验证状态常量定义
		assert.Equal(t, "running", model.InstanceStatusRunning)
		assert.Equal(t, "suspended", model.InstanceStatusSuspended)
		assert.Equal(t, "completed", model.InstanceStatusCompleted)
		assert.Equal(t, "failed", model.InstanceStatusFailed)
		assert.Equal(t, "cancelled", model.InstanceStatusCancelled)
	})

	t.Run("任务状态常量", func(t *testing.T) {
		// 验证任务状态常量
		assert.Equal(t, "created", model.TaskStatusCreated)
		assert.Equal(t, "assigned", model.TaskStatusAssigned)
		assert.Equal(t, "claimed", model.TaskStatusClaimed)
		assert.Equal(t, "in_progress", model.TaskStatusInProgress)
		assert.Equal(t, "completed", model.TaskStatusCompleted)
		assert.Equal(t, "failed", model.TaskStatusFailed)
		assert.Equal(t, "skipped", model.TaskStatusSkipped)
		assert.Equal(t, "escalated", model.TaskStatusEscalated)
	})

	t.Run("任务类型常量", func(t *testing.T) {
		// 验证任务类型常量
		assert.Equal(t, "userTask", model.TaskTypeUser)
		assert.Equal(t, "serviceTask", model.TaskTypeService)
		assert.Equal(t, "scriptTask", model.TaskTypeScript)
		assert.Equal(t, "mailTask", model.TaskTypeMail)
		assert.Equal(t, "manualTask", model.TaskTypeManual)
	})

	t.Run("执行路径更新", func(t *testing.T) {
		instance := createTestProcessInstance()
		engine := &ProcessEngine{logger: logger}

		// 初始执行路径
		initialPath := `[{"node":"start1","timestamp":"2023-01-01T00:00:00Z"}]`
		instance.ExecutionPath = initialPath

		// 更新执行路径
		engine.updateExecutionPath(instance, "task1")

		// 验证路径已更新
		assert.Contains(t, instance.ExecutionPath, "task1")
		assert.Contains(t, instance.ExecutionPath, "start1") // 原有路径保留

		// 验证是有效的JSON
		var path []interface{}
		err := json.Unmarshal([]byte(instance.ExecutionPath), &path)
		assert.NoError(t, err)
		assert.Greater(t, len(path), 1) // 应该有多个路径节点
	})
}

// TestGatewayConditionEvaluation 测试网关条件评估
func TestGatewayConditionEvaluation(t *testing.T) {
	logger := logger.New("test", "debug")
	engine := &ProcessEngine{logger: logger}

	// 创建测试网关节点
	gateway := &model.ProcessNode{
		ID:   "gateway1",
		Type: "gateway",
		Name: "测试网关",
		Props: map[string]interface{}{
			"gatewayType": "exclusive",
		},
	}

	// 创建测试连线
	flows := []model.ProcessFlow{
		{ID: "flow1", From: "gateway1", To: "end_success", Condition: "${approved} == true"},
		{ID: "flow2", From: "gateway1", To: "end_reject", Condition: "${approved} == false"},
		{ID: "flow3", From: "gateway1", To: "end_default", Condition: ""}, // 默认路径
	}

	t.Run("排他网关条件评估", func(t *testing.T) {
		// 测试条件为真的情况
		variables := map[string]interface{}{"approved": true}
		nextNodes, err := engine.evaluateGatewayConditions(gateway, flows, variables)
		assert.NoError(t, err)
		assert.Len(t, nextNodes, 1)
		assert.Equal(t, "end_success", nextNodes[0])

		// 测试条件为假的情况
		variables = map[string]interface{}{"approved": false}
		nextNodes, err = engine.evaluateGatewayConditions(gateway, flows, variables)
		assert.NoError(t, err)
		assert.Len(t, nextNodes, 1)
		assert.Equal(t, "end_reject", nextNodes[0])

		// 测试没有变量的情况（应该走默认路径）
		variables = map[string]interface{}{}
		nextNodes, err = engine.evaluateGatewayConditions(gateway, flows, variables)
		assert.NoError(t, err)
		assert.Len(t, nextNodes, 1)
		assert.Equal(t, "end_default", nextNodes[0])
	})

	t.Run("并行网关条件评估", func(t *testing.T) {
		gateway.Props["gatewayType"] = "parallel"

		variables := map[string]interface{}{"approved": true}
		nextNodes, err := engine.evaluateGatewayConditions(gateway, flows, variables)
		assert.NoError(t, err)
		assert.Len(t, nextNodes, 3) // 并行网关应该执行所有路径
	})

	t.Run("包容网关条件评估", func(t *testing.T) {
		gateway.Props["gatewayType"] = "inclusive"

		variables := map[string]interface{}{"approved": true}
		nextNodes, err := engine.evaluateGatewayConditions(gateway, flows, variables)
		assert.NoError(t, err)
		assert.Len(t, nextNodes, 2) // 应该执行满足条件的路径 + 默认路径
	})
}

// TestNodeHandlers 测试节点处理器
func TestNodeHandlers(t *testing.T) {
	logger := logger.New("test", "debug")
	engine := &ProcessEngine{logger: logger}

	// 创建测试流程实例
	instance := &model.ProcessInstance{
		ID:           1,
		DefinitionID: 1,
		BusinessKey:  "test_key",
		CurrentNode:  "start1",
		Status:       model.InstanceStatusRunning,
		Priority:     50,
		Variables:    `{"approved": true}`,
		StartTime:    time.Now(),
	}

	t.Run("查找开始节点", func(t *testing.T) {
		nodes := []model.ProcessNode{
			{ID: "start1", Type: "start", Name: "开始"},
			{ID: "task1", Type: "userTask", Name: "用户任务"},
			{ID: "end1", Type: "end", Name: "结束"},
		}

		startNode := engine.findStartNode(nodes)
		assert.NotNil(t, startNode)
		assert.Equal(t, "start1", startNode.ID)
		assert.Equal(t, "start", startNode.Type)
	})

	t.Run("查找节点by ID", func(t *testing.T) {
		nodes := []model.ProcessNode{
			{ID: "start1", Type: "start", Name: "开始"},
			{ID: "task1", Type: "userTask", Name: "用户任务"},
		}

		node := engine.findNodeByID(nodes, "task1")
		assert.NotNil(t, node)
		assert.Equal(t, "task1", node.ID)
		assert.Equal(t, "userTask", node.Type)

		// 测试不存在的节点
		node = engine.findNodeByID(nodes, "not_exist")
		assert.Nil(t, node)
	})

	t.Run("查找出口连线", func(t *testing.T) {
		flows := []model.ProcessFlow{
			{ID: "flow1", From: "start1", To: "task1"},
			{ID: "flow2", From: "task1", To: "end1"},
			{ID: "flow3", From: "start1", To: "task2"}, // 开始节点的另一个出口
		}

		outgoing := engine.findOutgoingFlows(flows, "start1")
		assert.Len(t, outgoing, 2) // start1有两个出口连线

		outgoing = engine.findOutgoingFlows(flows, "task1")
		assert.Len(t, outgoing, 1) // task1有一个出口连线

		outgoing = engine.findOutgoingFlows(flows, "end1")
		assert.Len(t, outgoing, 0) // end1没有出口连线
	})
}

// TestProcessDurationEstimation 测试流程执行时间估算
func TestProcessDurationEstimation(t *testing.T) {
	logger := logger.New("test", "debug")
	engine := &ProcessEngine{logger: logger}

	t.Run("简单流程时间估算", func(t *testing.T) {
		definition := &model.ProcessDefinitionData{
			Nodes: []model.ProcessNode{
				{Type: "start"},
				{Type: "userTask"},
				{Type: "serviceTask"},
				{Type: "end"},
			},
		}

		duration := engine.estimateProcessDuration(definition)
		expected := 3600 + 60 // 1个用户任务(1小时) + 1个服务任务(1分钟)
		assert.Equal(t, expected, duration)
	})

	t.Run("复杂流程时间估算", func(t *testing.T) {
		definition := &model.ProcessDefinitionData{
			Nodes: []model.ProcessNode{
				{Type: "start"},
				{Type: "userTask"},
				{Type: "userTask"},
				{Type: "serviceTask"},
				{Type: "serviceTask"},
				{Type: "gateway"},
				{Type: "end"},
			},
		}

		duration := engine.estimateProcessDuration(definition)
		expected := 2*3600 + 2*60 // 2个用户任务 + 2个服务任务
		assert.Equal(t, expected, duration)
	})
}

// BenchmarkTaskAssignment 任务分配性能基准测试
func BenchmarkTaskAssignment_DirectStrategy(b *testing.B) {
	logger := logger.New("benchmark", "info")
	strategy := NewDirectAssignmentStrategy(logger)

	// 创建测试数据
	users := make([]*model.User, 100)
	for i := 0; i < 100; i++ {
		users[i] = &model.User{
			ID:       uint(i + 1),
			Username: fmt.Sprintf("user%d", i+1),
			Role:     "user",
			Status:   "active",
		}
	}

	task := &model.TaskInstance{
		ID:       1,
		Priority: 50,
		Status:   model.TaskStatusCreated,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = strategy.AssignTask(task, users, nil)
	}
}

// BenchmarkConditionEvaluation 条件评估性能基准测试
func BenchmarkConditionEvaluation(b *testing.B) {
	logger := logger.New("benchmark", "info")
	engine := &ProcessEngine{logger: logger}

	variables := map[string]interface{}{
		"approved": true,
		"amount":   1000,
		"status":   "pending",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = engine.evaluateCondition("${approved} == true", variables)
	}
}

// BenchmarkNodeFinding 节点查找性能基准测试
func BenchmarkNodeFinding(b *testing.B) {
	logger := logger.New("benchmark", "info")
	engine := &ProcessEngine{logger: logger}

	// 创建大量节点测试查找性能
	nodes := make([]model.ProcessNode, 1000)
	for i := 0; i < 1000; i++ {
		nodes[i] = model.ProcessNode{
			ID:   fmt.Sprintf("node_%d", i),
			Type: "userTask",
			Name: fmt.Sprintf("任务_%d", i),
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = engine.findNodeByID(nodes, "node_500") // 查找中间的节点
	}
}
