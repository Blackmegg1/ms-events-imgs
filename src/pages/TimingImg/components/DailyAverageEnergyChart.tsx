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
interface DailyAverageEnergyChartProps {
  events: EventData[];
}

const DailyAverageEnergyChart: React.FC<DailyAverageEnergyChartProps> = ({
  events,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  let chartInstance: echarts.ECharts | null = null;

  // 处理数据，计算每日平均能量
  const processData = () => {
    const dailyEnergies: Record<string, { total: number; count: number }> = {};

    // 收集每日能量总和和事件数量
    events.forEach((event) => {
      const date = event.time.split('T')[0];
      if (!dailyEnergies[date]) {
        dailyEnergies[date] = { total: 0, count: 0 };
      }
      dailyEnergies[date].total += event.energy;
      dailyEnergies[date].count += 1;
    });

    // 计算平均值并整理数据
    const dates = Object.keys(dailyEnergies).sort();
    const averages = dates.map((date) => {
      const { total, count } = dailyEnergies[date];
      return Number((total / count).toFixed(4)); // 保留4位小数
    });

    return { dates, averages };
  };

  useEffect(() => {
    if (chartRef.current) {
      // 初始化图表
      chartInstance = echarts.init(chartRef.current);

      // 获取处理后的数据
      const { dates, averages } = processData();

      // 配置图表选项
      const option: echarts.EChartsOption = {
        title: {
          text: '每日平均能量统计',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const param = params[0];
            return `${param.name}<br/>平均能量: ${param.value.toFixed(3)}KJ`;
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
          name: '平均能量/KJ',
          axisLabel: {
            formatter: (value: number) => value.toFixed(4),
          },
        },
        series: [
          {
            name: '日平均能量',
            type: 'bar',
            data: averages,
            itemStyle: {
              color: '#ee6666', // 使用红色系，与前两个图表区分
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
        // 标记最大最小值
        visualMap: {
          show: false,
          pieces: [
            {
              gt: 0,
              lte: 0.5,
              color: '#ee6666',
            },
          ],
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

export default DailyAverageEnergyChart;
