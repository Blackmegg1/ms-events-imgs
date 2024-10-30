import { Card } from 'antd';
import * as echarts from 'echarts';
import React, { useEffect, useRef } from 'react';

// 定义事件数据类型
interface EventData {
  event_key: number;
  project_id: number;
  loc_x: number;
  loc_y: number;
  loc_z: number;
  energy: number;
  magnitude: number;
  time: string;
}

// 组件 props 类型定义
interface DailyFrequencyChartProps {
  events: EventData[];
}

const DailyFrequencyChart: React.FC<DailyFrequencyChartProps> = ({
  events,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  let chartInstance: echarts.ECharts | null = null;

  // 处理数据，计算每日事件频次
  const processData = () => {
    const dailyCount = events.reduce(
      (acc, event) => {
        const date = event.time.split('T')[0]; // 提取日期部分
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 转换为图表所需的数据格式
    const dates = Object.keys(dailyCount).sort();
    const frequencies = dates.map((date) => dailyCount[date]);

    return { dates, frequencies };
  };

  useEffect(() => {
    if (chartRef.current) {
      // 初始化图表
      chartInstance = echarts.init(chartRef.current);

      // 获取处理后的数据
      const { dates, frequencies } = processData();

      // 配置图表选项
      const option: echarts.EChartsOption = {
        title: {
          text: '每日微震频次统计',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const param = params[0];
            return `${param.name}<br/>事件次数: ${param.value}次`;
          },
        },
        xAxis: {
          type: 'category',
          data: dates,
          name: '日期',
          axisLabel: {
            rotate: 45,
          },
        },
        yAxis: {
          type: 'value',
          name: '日频次/次',
          minInterval: 1, // 确保y轴刻度为整数
          axisLabel: {
            formatter: '{value}',
          },
        },
        series: [
          {
            name: '日频次',
            type: 'bar',
            data: frequencies,
            itemStyle: {
              color: '#91cc75', // 使用不同的颜色区分能量图
            },
          },
        ],
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        toolbox: {
          feature: {
            dataZoom: {
              yAxisIndex: 'none',
            },
            restore: {},
            saveAsImage: {},
          },
          right: 10,
        },
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0],
            start: 0,
            end: 100,
          },
        ],
      };

      // 设置图表配置
      chartInstance.setOption(option);
    }

    // 清理函数
    return () => {
      if (chartInstance) {
        chartInstance.dispose();
      }
    };
  }, [events]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance) {
        chartInstance.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <Card>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    </Card>
  );
};

export default DailyFrequencyChart;
