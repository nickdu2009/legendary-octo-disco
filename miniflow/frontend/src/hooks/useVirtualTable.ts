/**
 * 虚拟化表格Hook
 * 优化大数据量表格渲染性能
 */

import { useState, useEffect, useMemo } from 'react';

interface UseVirtualTableOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const useVirtualTable = <T>(
  data: T[],
  options: UseVirtualTableOptions
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + overscan, data.length - 1);
    
    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      visibleCount
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, data.length]);

  // 可见数据
  const visibleData = useMemo(() => {
    return data.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [data, visibleRange]);

  // 滚动处理
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // 总高度
  const totalHeight = data.length * itemHeight;

  // 偏移量
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleData,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  };
};

// 虚拟化列表组件
interface VirtualListProps<T> {
  data: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualList<T>({
  data,
  itemHeight,
  height,
  renderItem,
  className
}: VirtualListProps<T>) {
  const {
    visibleData,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  } = useVirtualTable(data, { itemHeight, containerHeight: height });

  return (
    <div
      className={className}
      style={{
        height,
        overflow: 'auto'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleData.map((item, index) => 
            renderItem(item, visibleRange.startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
}
