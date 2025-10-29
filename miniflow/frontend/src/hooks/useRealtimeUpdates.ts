import { useState, useEffect, useCallback } from 'react';

interface RealtimeEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

interface UseRealtimeUpdatesReturn<T = unknown> {
  isConnected: boolean;
  events: RealtimeEvent<T>[];
  subscribe: (eventType: string, handler: (data: T) => void) => void;
  unsubscribe: (eventType: string, handler: (data: T) => void) => void;
}

const useRealtimeUpdates = <T = unknown>(): UseRealtimeUpdatesReturn<T> => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent<T>[]>([]);
  const [, setSocket] = useState<WebSocket | null>(null);
  const [handlers, setHandlers] = useState<Record<string, Array<(data: T) => void>>>({});

  // 订阅事件
  const subscribe = useCallback((eventType: string, handler: (data: T) => void) => {
    setHandlers(prev => ({
      ...prev,
      [eventType]: [...(prev[eventType] || []), handler]
    }));
  }, []);

  // 取消订阅事件
  const unsubscribe = useCallback((eventType: string, handler: (data: T) => void) => {
    setHandlers(prev => ({
      ...prev,
      [eventType]: (prev[eventType] || []).filter(h => h !== handler)
    }));
  }, []);

  // 处理接收到的消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      const realtimeEvent: RealtimeEvent<T> = {
        type: data.type,
        data: data.data,
        timestamp: Date.now()
      };

      // 添加到事件列表
      setEvents(prev => [realtimeEvent, ...prev.slice(0, 99)]); // 限制最多100个事件

      // 调用对应的处理器
      if (handlers[data.type]) {
        handlers[data.type].forEach(handler => handler(data.data));
      }

      // 调用全局处理器
      if (handlers['*']) {
        handlers['*'].forEach(handler => handler(data));
      }
    } catch (error) {
      console.error('解析实时消息失败:', error);
    }
  }, [handlers]);

  // 建立WebSocket连接
  useEffect(() => {
    // 在开发环境中连接到本地WebSocket服务器
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:8080/ws/updates' 
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/updates`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket连接已建立');
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket连接已关闭');
      // 尝试重新连接
      setTimeout(() => {
        setSocket(new WebSocket(wsUrl));
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
    };

    setSocket(ws);

    // 清理函数
    return () => {
      ws.close();
    };
  }, [handleMessage]);

  return {
    isConnected,
    events,
    subscribe,
    unsubscribe
  };
};

export default useRealtimeUpdates;