/**
 * 统计卡片组件
 * 统一的统计数据展示组件
 */

import React from 'react';
import { Card, Statistic, StatisticProps } from 'antd';

interface StatisticCardProps extends StatisticProps {
  size?: 'small' | 'default' | 'large';
  loading?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

const StatisticCard: React.FC<StatisticCardProps> = ({
  size = 'small',
  loading = false,
  bordered = false,
  hoverable = false,
  onClick,
  ...statisticProps
}) => {
  return (
    <Card 
      size={size}
      loading={loading}
      bordered={bordered}
      hoverable={hoverable}
      onClick={onClick}
      style={{ 
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        ...statisticProps.style
      }}
    >
      <Statistic {...statisticProps} />
    </Card>
  );
};

export default StatisticCard;
