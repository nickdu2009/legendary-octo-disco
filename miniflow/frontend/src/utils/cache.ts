/**
 * 前端缓存工具
 * 优化API调用和数据缓存
 */

// 缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// 缓存管理器
export class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  
  // 设置缓存
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };
    this.cache.set(key, item);
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // 删除缓存
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // 获取缓存统计
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount
    };
  }
}

// 全局缓存实例
export const appCache = new CacheManager();

// 自动清理过期缓存
setInterval(() => {
  appCache.cleanup();
}, 5 * 60 * 1000); // 每5分钟清理一次

// 缓存装饰器Hook
export const useCachedData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async (forceRefresh = false) => {
    // 检查缓存
    if (!forceRefresh) {
      const cachedData = appCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        return cachedData;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      appCache.set(key, result, ttl);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchData();
  }, [key]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    invalidate: () => appCache.delete(key)
  };
};

// API缓存键生成器
export const generateCacheKey = (
  endpoint: string, 
  params?: Record<string, any>
): string => {
  const paramStr = params ? JSON.stringify(params) : '';
  return `api:${endpoint}:${btoa(paramStr)}`;
};
