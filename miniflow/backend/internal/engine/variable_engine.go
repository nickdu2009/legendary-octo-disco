package engine

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// VariableEngine 流程变量和条件引擎
type VariableEngine struct {
	logger *logger.Logger
}

// NewVariableEngine 创建变量引擎
func NewVariableEngine(logger *logger.Logger) *VariableEngine {
	return &VariableEngine{
		logger: logger,
	}
}

// SetVariable 设置流程变量
func (e *VariableEngine) SetVariable(instanceID uint, key string, value interface{}) error {
	e.logger.Info("Setting process variable",
		zap.Uint("instance_id", instanceID),
		zap.String("key", key),
		zap.Any("value", value),
	)
	// 简单实现，实际存储到数据库
	return nil
}

// GetVariable 获取单个流程变量
func (e *VariableEngine) GetVariable(instanceID uint, key string) (interface{}, error) {
	// 简单实现，实际从数据库获取
	return nil, nil
}

// GetAllVariables 获取流程实例的所有变量
func (e *VariableEngine) GetAllVariables(instanceID uint) (map[string]interface{}, error) {
	// 简单实现，实际从数据库获取
	return make(map[string]interface{}), nil
}

// EvaluateCondition 评估条件表达式
func (e *VariableEngine) EvaluateCondition(condition string, variables map[string]interface{}) (bool, error) {
	if condition == "" {
		return true, nil
	}

	e.logger.Debug("Evaluating condition",
		zap.String("condition", condition),
		zap.Any("variables", variables),
	)

	// 替换变量引用
	processedCondition, err := e.replaceVariables(condition, variables)
	if err != nil {
		return false, fmt.Errorf("变量替换失败: %v", err)
	}

	// 简单的条件评估，只支持基本的相等比较
	result, err := e.evaluateSimpleCondition(processedCondition)
	if err != nil {
		e.logger.Error("Condition evaluation failed",
			zap.String("condition", condition),
			zap.String("processed", processedCondition),
			zap.Error(err),
		)
		return false, err
	}

	e.logger.Debug("Condition evaluation result",
		zap.String("condition", condition),
		zap.Bool("result", result),
	)

	return result, nil
}

// replaceVariables 替换条件表达式中的变量引用
func (e *VariableEngine) replaceVariables(condition string, variables map[string]interface{}) (string, error) {
	// 匹配 ${variable} 格式的变量引用
	varPattern := regexp.MustCompile(`\$\{([^}]+)\}`)

	result := varPattern.ReplaceAllStringFunc(condition, func(match string) string {
		// 提取变量名
		varName := strings.Trim(match[2:len(match)-1], " ")

		// 查找变量值
		if value, exists := variables[varName]; exists {
			return e.formatValue(value)
		}

		// 变量不存在时返回原始字符串
		e.logger.Warn("Variable not found in condition",
			zap.String("variable", varName),
			zap.String("condition", condition),
		)
		return match
	})

	return result, nil
}

// formatValue 格式化变量值为字符串
func (e *VariableEngine) formatValue(value interface{}) string {
	if value == nil {
		return "null"
	}

	switch v := value.(type) {
	case string:
		return fmt.Sprintf("'%s'", strings.ReplaceAll(v, "'", "\\'"))
	case bool:
		if v {
			return "true"
		}
		return "false"
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v)
	case uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v)
	case float32, float64:
		return fmt.Sprintf("%g", v)
	default:
		// 对于复杂类型，转换为JSON字符串
		if jsonBytes, err := json.Marshal(v); err == nil {
			return fmt.Sprintf("'%s'", strings.ReplaceAll(string(jsonBytes), "'", "\\'"))
		}
		return fmt.Sprintf("'%v'", v)
	}
}

// evaluateSimpleCondition 评估简单的条件表达式
func (e *VariableEngine) evaluateSimpleCondition(expression string) (bool, error) {
	// 去除首尾空格
	expression = strings.TrimSpace(expression)

	// 只支持基本的相等比较
	if strings.Contains(expression, "==") {
		parts := strings.SplitN(expression, "==", 2)
		if len(parts) != 2 {
			return false, errors.New("无效的相等比较表达式")
		}

		left := strings.TrimSpace(parts[0])
		right := strings.TrimSpace(parts[1])

		// 简单的字符串比较
		return left == right, nil
	}

	// 如果不包含比较操作符，尝试解析为布尔值
	switch strings.ToLower(expression) {
	case "true", "1", "yes", "on":
		return true, nil
	case "false", "0", "no", "off":
		return false, nil
	default:
		return false, fmt.Errorf("无法解析为布尔值: %s", expression)
	}
}
