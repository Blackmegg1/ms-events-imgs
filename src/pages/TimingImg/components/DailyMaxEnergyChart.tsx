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
interface DailyMaxEnergyChartProps {
  events: EventData[];
}

const DailyMaxEnergyChart: React.FC<DailyMaxEnergyChartProps> = ({
  events,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  let chartInstance: echarts.ECharts | null = null;

  // 处理数据，计算每日最大能量
  const processData = () => {
    const dailyMaxEnergy: Record<string, number> = {};

    // 找出每日最大能量
    events.forEach((event) => {
      const date = event.time.split('T')[0];
      if (!dailyMaxEnergy[date] || event.energy > dailyMaxEnergy[date]) {
        dailyMaxEnergy[date] = event.energy;
      }
    });

    // 整理数据
    const dates = Object.keys(dailyMaxEnergy).sort();
    const maxEnergies = dates.map((date) => dailyMaxEnergy[date]);

    return { dates, maxEnergies };
  };

  useEffect(() => {
    if (chartRef.current) {
      // 初始化图表
      chartInstance = echarts.init(chartRef.current);

      // 获取处理后的数据
      const { dates, maxEnergies } = processData();

      // 计算数据的最大值和最小值，用于标记点
      const maxValue = Math.max(...maxEnergies);
      const minValue = Math.min(...maxEnergies);
      const maxIndex = maxEnergies.indexOf(maxValue);
      const minIndex = maxEnergies.indexOf(minValue);

      // 配置图表选项
      const option: echarts.EChartsOption = {
        title: {
          text: '每日最大能量变化趋势',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const param = params[0];
            return `${param.name}<br/>最大能量: ${param.value.toFixed(4)}KJ`;
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
          name: '最大能量/KJ',
          axisLabel: {
            formatter: (value: number) => value.toFixed(4),
          },
        },
        series: [
          {
            name: '日最大能量',
            type: 'line',
            data: maxEnergies,
            smooth: true, // 平滑曲线
            symbolSize: 8, // 数据点大小
            itemStyle: {
              color: '#73c0de', // 使用蓝色系
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: 'rgba(115,192,222,0.5)',
                },
                {
                  offset: 1,
                  color: 'rgba(115,192,222,0.1)',
                },
              ]),
            },
            markPoint: {
              data: [
                { type: 'max', name: '最大值' },
                { type: 'min', name: '最小值' },
              ],
            },
            markLine: {
              data: [{ type: 'average', name: '平均值' }],
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
            type: 'inside', // 启用内部缩放
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

export default DailyMaxEnergyChart;
