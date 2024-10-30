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
interface DailyEnergyChartProps {
  events: EventData[];
}

const DailyEnergyChart: React.FC<DailyEnergyChartProps> = ({ events }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  let chartInstance: echarts.ECharts | null = null;

  // 处理数据，按日期汇总能量
  const processData = () => {
    const dailyEnergy = events.reduce(
      (acc, event) => {
        const date = event.time.split('T')[0]; // 提取日期部分
        acc[date] = (acc[date] || 0) + event.energy;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 转换为图表所需的数据格式
    const dates = Object.keys(dailyEnergy).sort();
    const energyValues = dates.map((date) => dailyEnergy[date]);

    return { dates, energyValues };
  };

  useEffect(() => {
    if (chartRef.current) {
      // 初始化图表
      chartInstance = echarts.init(chartRef.current);

      // 获取处理后的数据
      const { dates, energyValues } = processData();

      // 配置图表选项
      const option: echarts.EChartsOption = {
        title: {
          text: '每日微震事件总能量',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const param = params[0];
            return `${param.name}<br/>日总能量: ${param.value.toFixed(3)}KJ`;
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
          name: '日总能量/KJ',
          axisLabel: {
            formatter: (value: number) => value.toFixed(4),
          },
        },
        series: [
          {
            name: '日总能量',
            type: 'bar',
            data: energyValues,
            itemStyle: {
              color: '#5470c6',
            },
          },
        ],
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true,
        },
        toolbox: {
          feature: {
            saveAsImage: {},
          },
          right: 10,
        },
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

export default DailyEnergyChart;
