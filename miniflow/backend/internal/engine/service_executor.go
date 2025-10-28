package engine

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/smtp"
	"strings"
	"sync"
	"time"

	"miniflow/internal/model"
	"miniflow/pkg/database"
	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// ServiceExecutor 服务任务执行器
type ServiceExecutor struct {
	httpClient *http.Client
	db         *database.Database
	logger     *logger.Logger

	// 异步执行结果存储
	executionResults map[uint]*ExecutionResult
	resultMutex      sync.RWMutex
}

// ExecutionResult 执行结果
type ExecutionResult struct {
	TaskID    uint        `json:"task_id"`
	Status    string      `json:"status"` // success, failed, running
	Result    interface{} `json:"result"`
	Error     string      `json:"error,omitempty"`
	StartTime time.Time   `json:"start_time"`
	EndTime   *time.Time  `json:"end_time,omitempty"`
	Duration  int64       `json:"duration"` // 毫秒
}

// NewServiceExecutor 创建服务任务执行器
func NewServiceExecutor(db *database.Database, logger *logger.Logger) *ServiceExecutor {
	return &ServiceExecutor{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		db:               db,
		logger:           logger,
		executionResults: make(map[uint]*ExecutionResult),
	}
}

// ExecuteHTTPService 执行HTTP服务任务
func (e *ServiceExecutor) ExecuteHTTPService(task *model.TaskInstance) error {
	e.logger.Info("Executing HTTP service task", zap.Uint("task_id", task.ID))

	// 解析执行数据
	var config HTTPServiceConfig
	if err := json.Unmarshal([]byte(task.ExecutionData), &config); err != nil {
		return fmt.Errorf("解析HTTP服务配置失败: %v", err)
	}

	// 验证配置
	if err := e.validateHTTPConfig(&config); err != nil {
		return fmt.Errorf("HTTP服务配置无效: %v", err)
	}

	// 创建HTTP请求
	req, err := e.createHTTPRequest(&config)
	if err != nil {
		return fmt.Errorf("创建HTTP请求失败: %v", err)
	}

	// 执行请求
	startTime := time.Now()
	resp, err := e.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("HTTP请求执行失败: %v", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("读取HTTP响应失败: %v", err)
	}

	// 检查响应状态
	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP请求失败，状态码: %d, 响应: %s", resp.StatusCode, string(body))
	}

	// 保存执行结果
	result := &ExecutionResult{
		TaskID: task.ID,
		Status: "success",
		Result: map[string]interface{}{
			"status_code": resp.StatusCode,
			"headers":     resp.Header,
			"body":        string(body),
		},
		StartTime: startTime,
		EndTime:   &[]time.Time{time.Now()}[0],
		Duration:  time.Since(startTime).Milliseconds(),
	}

	e.storeExecutionResult(task.ID, result)

	e.logger.Info("HTTP service task completed successfully",
		zap.Uint("task_id", task.ID),
		zap.Int("status_code", resp.StatusCode),
		zap.Int64("duration_ms", result.Duration),
	)

	return nil
}

// ExecuteDatabaseService 执行数据库服务任务
func (e *ServiceExecutor) ExecuteDatabaseService(task *model.TaskInstance) error {
	e.logger.Info("Executing database service task", zap.Uint("task_id", task.ID))

	// 解析执行数据
	var config DatabaseServiceConfig
	if err := json.Unmarshal([]byte(task.ExecutionData), &config); err != nil {
		return fmt.Errorf("解析数据库服务配置失败: %v", err)
	}

	// 验证配置
	if err := e.validateDatabaseConfig(&config); err != nil {
		return fmt.Errorf("数据库服务配置无效: %v", err)
	}

	startTime := time.Now()
	var result interface{}
	var execErr error

	// 根据操作类型执行
	switch strings.ToLower(config.Operation) {
	case "select", "query":
		result, execErr = e.executeSelectQuery(&config)
	case "insert", "update", "delete":
		result, execErr = e.executeModifyQuery(&config)
	default:
		execErr = fmt.Errorf("不支持的数据库操作: %s", config.Operation)
	}

	// 保存执行结果
	executionResult := &ExecutionResult{
		TaskID:    task.ID,
		StartTime: startTime,
		EndTime:   &[]time.Time{time.Now()}[0],
		Duration:  time.Since(startTime).Milliseconds(),
	}

	if execErr != nil {
		executionResult.Status = "failed"
		executionResult.Error = execErr.Error()
		e.storeExecutionResult(task.ID, executionResult)
		return execErr
	}

	executionResult.Status = "success"
	executionResult.Result = result
	e.storeExecutionResult(task.ID, executionResult)

	e.logger.Info("Database service task completed successfully",
		zap.Uint("task_id", task.ID),
		zap.String("operation", config.Operation),
		zap.Int64("duration_ms", executionResult.Duration),
	)

	return nil
}

// ExecuteEmailService 执行邮件服务任务
func (e *ServiceExecutor) ExecuteEmailService(task *model.TaskInstance) error {
	e.logger.Info("Executing email service task", zap.Uint("task_id", task.ID))

	// 解析执行数据
	var config EmailServiceConfig
	if err := json.Unmarshal([]byte(task.ExecutionData), &config); err != nil {
		return fmt.Errorf("解析邮件服务配置失败: %v", err)
	}

	// 验证配置
	if err := e.validateEmailConfig(&config); err != nil {
		return fmt.Errorf("邮件服务配置无效: %v", err)
	}

	startTime := time.Now()

	// 构建邮件内容
	message := e.buildEmailMessage(&config)

	// 发送邮件
	err := e.sendEmail(&config, message)

	// 保存执行结果
	executionResult := &ExecutionResult{
		TaskID:    task.ID,
		StartTime: startTime,
		EndTime:   &[]time.Time{time.Now()}[0],
		Duration:  time.Since(startTime).Milliseconds(),
	}

	if err != nil {
		executionResult.Status = "failed"
		executionResult.Error = err.Error()
		e.storeExecutionResult(task.ID, executionResult)
		return fmt.Errorf("邮件发送失败: %v", err)
	}

	executionResult.Status = "success"
	executionResult.Result = map[string]interface{}{
		"to":      config.To,
		"subject": config.Subject,
		"sent_at": time.Now(),
	}
	e.storeExecutionResult(task.ID, executionResult)

	e.logger.Info("Email service task completed successfully",
		zap.Uint("task_id", task.ID),
		zap.Strings("to", config.To),
		zap.Int64("duration_ms", executionResult.Duration),
	)

	return nil
}

// ExecuteScriptService 执行脚本任务
func (e *ServiceExecutor) ExecuteScriptService(task *model.TaskInstance) error {
	e.logger.Info("Executing script service task", zap.Uint("task_id", task.ID))

	// 解析执行数据
	var config ScriptServiceConfig
	if err := json.Unmarshal([]byte(task.ExecutionData), &config); err != nil {
		return fmt.Errorf("解析脚本服务配置失败: %v", err)
	}

	// 验证配置
	if err := e.validateScriptConfig(&config); err != nil {
		return fmt.Errorf("脚本服务配置无效: %v", err)
	}

	startTime := time.Now()

	// 执行脚本（这里简化实现，实际应该在沙箱环境中执行）
	result, err := e.executeScript(&config)

	// 保存执行结果
	executionResult := &ExecutionResult{
		TaskID:    task.ID,
		StartTime: startTime,
		EndTime:   &[]time.Time{time.Now()}[0],
		Duration:  time.Since(startTime).Milliseconds(),
	}

	if err != nil {
		executionResult.Status = "failed"
		executionResult.Error = err.Error()
		e.storeExecutionResult(task.ID, executionResult)
		return fmt.Errorf("脚本执行失败: %v", err)
	}

	executionResult.Status = "success"
	executionResult.Result = result
	e.storeExecutionResult(task.ID, executionResult)

	e.logger.Info("Script service task completed successfully",
		zap.Uint("task_id", task.ID),
		zap.String("script_type", config.ScriptType),
		zap.Int64("duration_ms", executionResult.Duration),
	)

	return nil
}

// ExecuteAsync 异步执行服务任务
func (e *ServiceExecutor) ExecuteAsync(task *model.TaskInstance, callback func(result interface{}, err error)) error {
	go func() {
		var err error

		// 根据任务类型执行
		switch task.TaskType {
		case "httpService":
			err = e.ExecuteHTTPService(task)
		case "databaseService":
			err = e.ExecuteDatabaseService(task)
		case "emailService":
			err = e.ExecuteEmailService(task)
		case "scriptService":
			err = e.ExecuteScriptService(task)
		default:
			err = fmt.Errorf("不支持的服务任务类型: %s", task.TaskType)
		}

		// 获取执行结果
		result := e.getExecutionResult(task.ID)

		// 调用回调函数
		if callback != nil {
			callback(result, err)
		}
	}()

	return nil
}

// GetExecutionResult 获取执行结果
func (e *ServiceExecutor) GetExecutionResult(taskID uint) (*ExecutionResult, error) {
	result := e.getExecutionResult(taskID)
	if result == nil {
		return nil, fmt.Errorf("未找到任务执行结果: %d", taskID)
	}
	return result, nil
}

// 私有方法

// 存储执行结果
func (e *ServiceExecutor) storeExecutionResult(taskID uint, result *ExecutionResult) {
	e.resultMutex.Lock()
	defer e.resultMutex.Unlock()
	e.executionResults[taskID] = result
}

// 获取执行结果
func (e *ServiceExecutor) getExecutionResult(taskID uint) *ExecutionResult {
	e.resultMutex.RLock()
	defer e.resultMutex.RUnlock()
	return e.executionResults[taskID]
}

// 配置结构体定义

// HTTPServiceConfig HTTP服务配置
type HTTPServiceConfig struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    string            `json:"body,omitempty"`
	Timeout int               `json:"timeout,omitempty"` // 秒
}

// DatabaseServiceConfig 数据库服务配置
type DatabaseServiceConfig struct {
	Operation  string                 `json:"operation"` // select, insert, update, delete
	Table      string                 `json:"table,omitempty"`
	SQL        string                 `json:"sql,omitempty"`
	Parameters map[string]interface{} `json:"parameters,omitempty"`
}

// EmailServiceConfig 邮件服务配置
type EmailServiceConfig struct {
	To       []string `json:"to"`
	CC       []string `json:"cc,omitempty"`
	BCC      []string `json:"bcc,omitempty"`
	Subject  string   `json:"subject"`
	Body     string   `json:"body"`
	IsHTML   bool     `json:"is_html,omitempty"`
	SMTPHost string   `json:"smtp_host"`
	SMTPPort int      `json:"smtp_port"`
	Username string   `json:"username"`
	Password string   `json:"password"`
}

// ScriptServiceConfig 脚本服务配置
type ScriptServiceConfig struct {
	ScriptType string                 `json:"script_type"` // javascript, python, shell
	Script     string                 `json:"script"`
	Parameters map[string]interface{} `json:"parameters,omitempty"`
	Timeout    int                    `json:"timeout,omitempty"` // 秒
}

// 配置验证方法

func (e *ServiceExecutor) validateHTTPConfig(config *HTTPServiceConfig) error {
	if config.URL == "" {
		return errors.New("URL不能为空")
	}
	if config.Method == "" {
		config.Method = "GET"
	}
	if config.Timeout == 0 {
		config.Timeout = 30
	}
	return nil
}

func (e *ServiceExecutor) validateDatabaseConfig(config *DatabaseServiceConfig) error {
	if config.Operation == "" {
		return errors.New("操作类型不能为空")
	}
	if config.SQL == "" && config.Table == "" {
		return errors.New("SQL语句或表名不能为空")
	}
	return nil
}

func (e *ServiceExecutor) validateEmailConfig(config *EmailServiceConfig) error {
	if len(config.To) == 0 {
		return errors.New("收件人不能为空")
	}
	if config.Subject == "" {
		return errors.New("邮件主题不能为空")
	}
	if config.SMTPHost == "" {
		return errors.New("SMTP主机不能为空")
	}
	if config.SMTPPort == 0 {
		config.SMTPPort = 587
	}
	return nil
}

func (e *ServiceExecutor) validateScriptConfig(config *ScriptServiceConfig) error {
	if config.ScriptType == "" {
		return errors.New("脚本类型不能为空")
	}
	if config.Script == "" {
		return errors.New("脚本内容不能为空")
	}
	if config.Timeout == 0 {
		config.Timeout = 60
	}
	return nil
}

// HTTP服务执行方法

func (e *ServiceExecutor) createHTTPRequest(config *HTTPServiceConfig) (*http.Request, error) {
	var body io.Reader
	if config.Body != "" {
		body = strings.NewReader(config.Body)
	}

	req, err := http.NewRequest(config.Method, config.URL, body)
	if err != nil {
		return nil, err
	}

	// 设置请求头
	for key, value := range config.Headers {
		req.Header.Set(key, value)
	}

	// 设置默认Content-Type
	if req.Header.Get("Content-Type") == "" && config.Body != "" {
		req.Header.Set("Content-Type", "application/json")
	}

	return req, nil
}

// 数据库服务执行方法

func (e *ServiceExecutor) executeSelectQuery(config *DatabaseServiceConfig) (interface{}, error) {
	var results []map[string]interface{}

	sql := config.SQL
	if sql == "" && config.Table != "" {
		sql = fmt.Sprintf("SELECT * FROM %s", config.Table)
	}

	rows, err := e.db.Raw(sql, e.convertParameters(config.Parameters)...).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}

		row := make(map[string]interface{})
		for i, col := range columns {
			row[col] = values[i]
		}
		results = append(results, row)
	}

	return results, nil
}

func (e *ServiceExecutor) executeModifyQuery(config *DatabaseServiceConfig) (interface{}, error) {
	result := e.db.Exec(config.SQL, e.convertParameters(config.Parameters)...)
	if result.Error != nil {
		return nil, result.Error
	}

	return map[string]interface{}{
		"rows_affected": result.RowsAffected,
	}, nil
}

func (e *ServiceExecutor) convertParameters(params map[string]interface{}) []interface{} {
	var values []interface{}
	for _, v := range params {
		values = append(values, v)
	}
	return values
}

// 邮件服务执行方法

func (e *ServiceExecutor) buildEmailMessage(config *EmailServiceConfig) string {
	var buffer bytes.Buffer

	buffer.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(config.To, ",")))
	if len(config.CC) > 0 {
		buffer.WriteString(fmt.Sprintf("CC: %s\r\n", strings.Join(config.CC, ",")))
	}
	buffer.WriteString(fmt.Sprintf("Subject: %s\r\n", config.Subject))

	if config.IsHTML {
		buffer.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	} else {
		buffer.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	}

	buffer.WriteString("\r\n")
	buffer.WriteString(config.Body)

	return buffer.String()
}

func (e *ServiceExecutor) sendEmail(config *EmailServiceConfig, message string) error {
	auth := smtp.PlainAuth("", config.Username, config.Password, config.SMTPHost)

	// 收集所有收件人
	recipients := append(config.To, config.CC...)
	recipients = append(recipients, config.BCC...)

	addr := fmt.Sprintf("%s:%d", config.SMTPHost, config.SMTPPort)
	return smtp.SendMail(addr, auth, config.Username, recipients, []byte(message))
}

// 脚本执行方法（简化实现）

func (e *ServiceExecutor) executeScript(config *ScriptServiceConfig) (interface{}, error) {
	// 这里是简化实现，实际应该在安全的沙箱环境中执行脚本
	// 可以集成JavaScript引擎、Python解释器等

	switch strings.ToLower(config.ScriptType) {
	case "javascript", "js":
		return e.executeJavaScript(config)
	case "python":
		return nil, errors.New("Python脚本执行暂未实现")
	case "shell", "bash":
		return nil, errors.New("Shell脚本执行暂未实现，出于安全考虑")
	default:
		return nil, fmt.Errorf("不支持的脚本类型: %s", config.ScriptType)
	}
}

func (e *ServiceExecutor) executeJavaScript(config *ScriptServiceConfig) (interface{}, error) {
	// 简化的JavaScript执行，实际应该使用V8或其他JS引擎
	// 这里只是示例实现

	e.logger.Warn("JavaScript execution is simplified for demo purposes",
		zap.String("script", config.Script),
	)

	// 模拟脚本执行结果
	return map[string]interface{}{
		"message":    "JavaScript execution completed (demo)",
		"script":     config.Script,
		"parameters": config.Parameters,
	}, nil
}

