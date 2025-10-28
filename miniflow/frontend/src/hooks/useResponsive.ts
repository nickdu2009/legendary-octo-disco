/**
 * 响应式设计Hook
 * 优化不同屏幕尺寸的用户体验
 */

import { useState, useEffect } from 'react';

// 断点定义
export const BREAKPOINTS = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

// 响应式状态
export interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  currentBreakpoint: BreakpointKey;
}

// 获取当前断点
const getCurrentBreakpoint = (width: number): BreakpointKey => {
  if (width >= BREAKPOINTS.xxl) return 'xxl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

// 响应式Hook
export const useResponsive = (): ResponsiveState => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentBreakpoint = getCurrentBreakpoint(windowSize.width);

  return {
    width: windowSize.width,
    height: windowSize.height,
    isMobile: windowSize.width < BREAKPOINTS.md,
    isTablet: windowSize.width >= BREAKPOINTS.md && windowSize.width < BREAKPOINTS.lg,
    isDesktop: windowSize.width >= BREAKPOINTS.lg,
    isLargeDesktop: windowSize.width >= BREAKPOINTS.xl,
    currentBreakpoint
  };
};

// 响应式表格配置Hook
export const useResponsiveTable = () => {
  const responsive = useResponsive();

  const getTableScroll = () => {
    if (responsive.isMobile) {
      return { x: 800, y: 400 };
    }
    if (responsive.isTablet) {
      return { x: 1000, y: 500 };
    }
    return { x: 1200, y: 600 };
  };

  const getPageSize = () => {
    if (responsive.isMobile) return 10;
    if (responsive.isTablet) return 15;
    return 20;
  };

  const getColumnWidth = (baseWidth: number) => {
    if (responsive.isMobile) return Math.max(baseWidth * 0.8, 80);
    if (responsive.isTablet) return Math.max(baseWidth * 0.9, 100);
    return baseWidth;
  };

  return {
    responsive,
    tableScroll: getTableScroll(),
    pageSize: getPageSize(),
    getColumnWidth
  };
};

// 响应式栅格配置Hook
export const useResponsiveGrid = () => {
  const responsive = useResponsive();

  const getColSpan = (desktop: number, tablet?: number, mobile?: number) => {
    if (responsive.isMobile) return mobile || 24;
    if (responsive.isTablet) return tablet || Math.min(desktop * 2, 24);
    return desktop;
  };

  const getGutter = (): [number, number] => {
    if (responsive.isMobile) return [8, 8];
    if (responsive.isTablet) return [12, 12];
    return [16, 16];
  };

  return {
    responsive,
    getColSpan,
    gutter: getGutter()
  };
};
