package engine

import (
	"sync"
	"time"

	"miniflow/pkg/logger"

	"go.uber.org/zap"
)

// Event 事件结构
type Event struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Source    string                 `json:"source"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// EventHandler 事件处理器接口
type EventHandler func(event *Event) error

// EventSystem 事件系统
type EventSystem struct {
	subscribers map[string][]EventHandler
	mutex       sync.RWMutex
	logger      *logger.Logger
}

// NewEventSystem 创建事件系统
func NewEventSystem(logger *logger.Logger) *EventSystem {
	return &EventSystem{
		subscribers: make(map[string][]EventHandler),
		logger:      logger,
	}
}

// 事件类型常量
const (
	EventProcessStarted   = "process.started"
	EventProcessCompleted = "process.completed"
	EventProcessFailed    = "process.failed"
	EventProcessCancelled = "process.cancelled"
	EventProcessSuspended = "process.suspended"
	EventProcessResumed   = "process.resumed"

	EventTaskCreated   = "task.created"
	EventTaskAssigned  = "task.assigned"
	EventTaskClaimed   = "task.claimed"
	EventTaskCompleted = "task.completed"
	EventTaskFailed    = "task.failed"
	EventTaskSkipped   = "task.skipped"
	EventTaskOverdue   = "task.overdue"
	EventTaskEscalated = "task.escalated"

	EventUserAssigned = "user.assigned"
	EventUserNotified = "user.notified"
)

// Publish 发布事件
func (es *EventSystem) Publish(event *Event) error {
	es.mutex.RLock()
	defer es.mutex.RUnlock()

	es.logger.Info("Publishing event",
		zap.String("event_type", event.Type),
		zap.String("event_source", event.Source),
		zap.Time("timestamp", event.Timestamp),
	)

	// 通知所有订阅该事件类型的处理器
	if handlers, exists := es.subscribers[event.Type]; exists {
		for _, handler := range handlers {
			// 异步处理事件，避免阻塞
			go func(h EventHandler, e *Event) {
				if err := h(e); err != nil {
					es.logger.Error("Event handler failed",
						zap.String("event_type", e.Type),
						zap.Error(err),
					)
				}
			}(handler, event)
		}
	}

	// 通知全局事件处理器（订阅 "*" 事件类型）
	if handlers, exists := es.subscribers["*"]; exists {
		for _, handler := range handlers {
			go func(h EventHandler, e *Event) {
				if err := h(e); err != nil {
					es.logger.Error("Global event handler failed",
						zap.String("event_type", e.Type),
						zap.Error(err),
					)
				}
			}(handler, event)
		}
	}

	return nil
}

// Subscribe 订阅事件
func (es *EventSystem) Subscribe(eventType string, handler EventHandler) error {
	es.mutex.Lock()
	defer es.mutex.Unlock()

	es.logger.Info("Subscribing to event",
		zap.String("event_type", eventType),
	)

	if _, exists := es.subscribers[eventType]; !exists {
		es.subscribers[eventType] = make([]EventHandler, 0)
	}

	es.subscribers[eventType] = append(es.subscribers[eventType], handler)
	return nil
}

// Unsubscribe 取消订阅事件
func (es *EventSystem) Unsubscribe(eventType string, handler EventHandler) error {
	es.mutex.Lock()
	defer es.mutex.Unlock()

	es.logger.Info("Unsubscribing from event",
		zap.String("event_type", eventType),
	)

	if handlers, exists := es.subscribers[eventType]; exists {
		for i, h := range handlers {
			if &h == &handler {
				// 从切片中移除处理器
				es.subscribers[eventType] = append(handlers[:i], handlers[i+1:]...)
				break
			}
		}
	}

	return nil
}

// CreateEvent 创建事件
func (es *EventSystem) CreateEvent(eventType, source string, data map[string]interface{}) *Event {
	return &Event{
		Type:      eventType,
		Source:    source,
		Data:      data,
		Timestamp: time.Now(),
	}
}
