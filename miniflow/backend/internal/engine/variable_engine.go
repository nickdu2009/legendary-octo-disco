package engine

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strconv"
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

	// TODO: 实际实现中应该将变量存储到数据库
	// 这里先返回成功，后续会与ProcessInstance的Variables字段集成
	return nil
}

// GetVariable 获取单个流程变量
func (e *VariableEngine) GetVariable(instanceID uint, key string) (interface{}, error) {
	// TODO: 从数据库获取变量
	// 这里先返回nil，后续会与ProcessInstance的Variables字段集成
	return nil, nil
}

// GetAllVariables 获取流程实例的所有变量
func (e *VariableEngine) GetAllVariables(instanceID uint) (map[string]interface{}, error) {
	// TODO: 从数据库获取所有变量
	// 这里先返回空map，后续会与ProcessInstance的Variables字段集成
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

	// 解析并评估表达式
	result, err := e.evaluateExpression(processedCondition)
	if err != nil {
		e.logger.Error("Expression evaluation failed",
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

// evaluateExpression 评估处理后的表达式
func (e *VariableEngine) evaluateExpression(expression string) (bool, error) {
	// 去除首尾空格
	expression = strings.TrimSpace(expression)

	// 处理简单的比较表达式
	if result, err := e.evaluateComparison(expression); err == nil {
		return result, nil
	}

	// 处理逻辑表达式
	if result, err := e.evaluateLogical(expression); err == nil {
		return result, nil
	}

	// 处理in操作
	if result, err := e.evaluateInOperation(expression); err == nil {
		return result, nil
	}

	// 如果无法解析，尝试作为布尔值处理
	if result, err := e.parseBooleanValue(expression); err == nil {
		return result, nil
	}

	return false, fmt.Errorf("无法解析表达式: %s", expression)
}

// evaluateComparison 评估比较表达式
func (e *VariableEngine) evaluateComparison(expression string) (bool, error) {
	// 支持的比较操作符
	operators := []string{"==", "!=", ">=", "<=", ">", "<"}

	for _, op := range operators {
		if strings.Contains(expression, op) {
			parts := strings.SplitN(expression, op, 2)
			if len(parts) != 2 {
				continue
			}

			left := strings.TrimSpace(parts[0])
			right := strings.TrimSpace(parts[1])

			leftVal, err := e.parseValue(left)
			if err != nil {
				continue
			}

			rightVal, err := e.parseValue(right)
			if err != nil {
				continue
			}

			return e.compareValues(leftVal, rightVal, op)
		}
	}

	return false, errors.New("不是比较表达式")
}

// evaluateLogical 评估逻辑表达式
func (e *VariableEngine) evaluateLogical(expression string) (bool, error) {
	// 处理 AND 操作
	if strings.Contains(expression, "&&") || strings.Contains(expression, " and ") {
		var separator string
		if strings.Contains(expression, "&&") {
			separator = "&&"
		} else {
			separator = " and "
		}

		parts := strings.Split(expression, separator)
		for _, part := range parts {
			result, err := e.evaluateExpression(strings.TrimSpace(part))
			if err != nil {
				return false, err
			}
			if !result {
				return false, nil // AND操作，任一为false则结果为false
			}
		}
		return true, nil
	}

	// 处理 OR 操作
	if strings.Contains(expression, "||") || strings.Contains(expression, " or ") {
		var separator string
		if strings.Contains(expression, "||") {
			separator = "||"
		} else {
			separator = " or "
		}

		parts := strings.Split(expression, separator)
		for _, part := range parts {
			result, err := e.evaluateExpression(strings.TrimSpace(part))
			if err != nil {
				continue // OR操作，忽略错误继续尝试其他部分
			}
			if result {
				return true, nil // OR操作，任一为true则结果为true
			}
		}
		return false, nil
	}

	return false, errors.New("不是逻辑表达式")
}

// evaluateInOperation 评估in操作
func (e *VariableEngine) evaluateInOperation(expression string) (bool, error) {
	if !strings.Contains(expression, " in ") {
		return false, errors.New("不是in操作")
	}

	parts := strings.SplitN(expression, " in ", 2)
	if len(parts) != 2 {
		return false, errors.New("in操作格式错误")
	}

	value := strings.TrimSpace(parts[0])
	listStr := strings.TrimSpace(parts[1])

	// 解析值
	val, err := e.parseValue(value)
	if err != nil {
		return false, err
	}

	// 解析列表 [item1, item2, item3]
	if !strings.HasPrefix(listStr, "[") || !strings.HasSuffix(listStr, "]") {
		return false, errors.New("in操作列表格式错误")
	}

	listContent := strings.Trim(listStr[1:len(listStr)-1], " ")
	if listContent == "" {
		return false, nil // 空列表
	}

	items := strings.Split(listContent, ",")
	for _, item := range items {
		itemVal, err := e.parseValue(strings.TrimSpace(item))
		if err != nil {
			continue
		}

		if e.valuesEqual(val, itemVal) {
			return true, nil
		}
	}

	return false, nil
}

// parseValue 解析值
func (e *VariableEngine) parseValue(valueStr string) (interface{}, error) {
	valueStr = strings.TrimSpace(valueStr)

	// 布尔值
	if valueStr == "true" {
		return true, nil
	}
	if valueStr == "false" {
		return false, nil
	}

	// null值
	if valueStr == "null" {
		return nil, nil
	}

	// 字符串值（被单引号或双引号包围）
	if (strings.HasPrefix(valueStr, "'") && strings.HasSuffix(valueStr, "'")) ||
		(strings.HasPrefix(valueStr, "\"") && strings.HasSuffix(valueStr, "\"")) {
		return valueStr[1 : len(valueStr)-1], nil
	}

	// 数字值
	if intVal, err := strconv.ParseInt(valueStr, 10, 64); err == nil {
		return intVal, nil
	}
	if floatVal, err := strconv.ParseFloat(valueStr, 64); err == nil {
		return floatVal, nil
	}

	// 其他情况作为字符串处理
	return valueStr, nil
}

// compareValues 比较两个值
func (e *VariableEngine) compareValues(left, right interface{}, operator string) (bool, error) {
	switch operator {
	case "==":
		return e.valuesEqual(left, right), nil
	case "!=":
		return !e.valuesEqual(left, right), nil
	case ">", ">=", "<", "<=":
		return e.compareNumeric(left, right, operator)
	default:
		return false, fmt.Errorf("不支持的比较操作符: %s", operator)
	}
}

// valuesEqual 判断两个值是否相等
func (e *VariableEngine) valuesEqual(left, right interface{}) bool {
	// 处理nil值
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}

	// 类型转换后比较
	leftStr := fmt.Sprintf("%v", left)
	rightStr := fmt.Sprintf("%v", right)

	return leftStr == rightStr
}

// compareNumeric 数值比较
func (e *VariableEngine) compareNumeric(left, right interface{}, operator string) (bool, error) {
	leftNum, err := e.toFloat64(left)
	if err != nil {
		return false, fmt.Errorf("左操作数不是数字: %v", left)
	}

	rightNum, err := e.toFloat64(right)
	if err != nil {
		return false, fmt.Errorf("右操作数不是数字: %v", right)
	}

	switch operator {
	case ">":
		return leftNum > rightNum, nil
	case ">=":
		return leftNum >= rightNum, nil
	case "<":
		return leftNum < rightNum, nil
	case "<=":
		return leftNum <= rightNum, nil
	default:
		return false, fmt.Errorf("不支持的数值比较操作符: %s", operator)
	}
}

// toFloat64 转换值为float64
func (e *VariableEngine) toFloat64(value interface{}) (float64, error) {
	switch v := value.(type) {
	case int:
		return float64(v), nil
	case int8:
		return float64(v), nil
	case int16:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case uint:
		return float64(v), nil
	case uint8:
		return float64(v), nil
	case uint16:
		return float64(v), nil
	case uint32:
		return float64(v), nil
	case uint64:
		return float64(v), nil
	case float32:
		return float64(v), nil
	case float64:
		return v, nil
	case string:
		return strconv.ParseFloat(v, 64)
	default:
		return 0, fmt.Errorf("无法转换为数字: %v (类型: %s)", value, reflect.TypeOf(value))
	}
}

// parseBooleanValue 解析布尔值
func (e *VariableEngine) parseBooleanValue(expression string) (bool, error) {
	expression = strings.ToLower(strings.TrimSpace(expression))

	switch expression {
	case "true", "1", "yes", "on":
		return true, nil
	case "false", "0", "no", "off":
		return false, nil
	default:
		return false, fmt.Errorf("无法解析为布尔值: %s", expression)
	}
}

// ValidateExpression 验证条件表达式的语法
func (e *VariableEngine) ValidateExpression(expression string) error {
	if expression == "" {
		return nil // 空表达式是有效的
	}

	// 检查括号匹配
	if err := e.validateBrackets(expression); err != nil {
		return err
	}

	// 检查基本语法
	if err := e.validateBasicSyntax(expression); err != nil {
		return err
	}

	return nil
}

// validateBrackets 验证括号匹配
func (e *VariableEngine) validateBrackets(expression string) error {
	stack := 0
	for _, char := range expression {
		switch char {
		case '(':
			stack++
		case ')':
			stack--
			if stack < 0 {
				return errors.New("括号不匹配：多余的右括号")
			}
		}
	}

	if stack > 0 {
		return errors.New("括号不匹配：缺少右括号")
	}

	return nil
}

// validateBasicSyntax 验证基本语法
func (e *VariableEngine) validateBasicSyntax(expression string) error {
	// 检查是否包含无效字符
	invalidChars := []string{";;", "//", "/*", "*/", "--"}
	for _, invalid := range invalidChars {
		if strings.Contains(expression, invalid) {
			return fmt.Errorf("表达式包含无效字符: %s", invalid)
		}
	}

	return nil
}

