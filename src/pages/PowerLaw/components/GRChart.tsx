import { Alert, Card } from 'antd';
import * as echarts from 'echarts';
import React, { useEffect, useRef } from 'react';
import type { PowerLawResult } from '../utils/calculatePowerLaw';

interface GRChartProps {
  result: PowerLawResult;
}

const GRChart: React.FC<GRChartProps> = ({ result }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const scatterData = result.points.map((p) => [p.energyLevel, p.logCount]);
    const lineData = result.fittedLine.map((p) => [p.energyLevel, p.fittedLogCount]);

    const option: echarts.EChartsOption = {
      title: {
        text: 'G-R 关系图（能级-频次）',
        subtext: `高能段拟合：log10(N) = ${result.a.toFixed(3)} - ${result.b.toFixed(
          3,
        )} × log10(E/J)     R² = ${result.r2.toFixed(4)}     拟合点数 ${
          result.fitPointCount
        }/${result.pointCount}`,
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesName === 'G-R 散点') {
            const [energyLevel, logN] = params.data as number[];
            const N = Math.round(Math.pow(10, logN));
            return `能级 log10(E/J) ≥ ${energyLevel.toFixed(
              2,
            )}<br/>累计事件数 N = ${N}<br/>log10(N) = ${logN.toFixed(4)}`;
          }
          const [energyLevel, logN] = params.data as number[];
          return `log10(E/J) = ${energyLevel.toFixed(
            2,
          )}<br/>拟合 log10(N) = ${logN.toFixed(4)}`;
        },
      },
      legend: {
        data: ['G-R 散点', '高能段拟合'],
        bottom: 0,
      },
      xAxis: {
        type: 'value',
        name: '能级 log10(E/J)',
        nameLocation: 'middle',
        nameGap: 30,
        scale: true,
        axisLabel: { formatter: (v: number) => v.toFixed(1) },
      },
      yAxis: {
        type: 'value',
        name: 'log₁₀(N)',
        nameLocation: 'middle',
        nameGap: 45,
        scale: true,
      },
      series: [
        {
          name: 'G-R 散点',
          type: 'scatter',
          data: scatterData,
          symbolSize: 8,
          itemStyle: { color: '#5470c6' },
        },
        {
          name: '高能段拟合',
          type: 'line',
          data: lineData,
          lineStyle: { color: '#ee6666', width: 2, type: 'dashed' },
          symbol: 'none',
          smooth: false,
        },
      ],
      grid: { left: '5%', right: '4%', bottom: '12%', top: '18%', containLabel: true },
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: 'none' },
          restore: {},
          saveAsImage: {},
        },
        right: 10,
      },
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [result]);

  return (
    <Card>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="拟合策略说明"
        description={`散点使用全部有效能级点；拟合从高能量端开始，至少取 4 个能级点，并逐步向低能量端扩展生成候选段。系统对每个候选段做线性回归，先找出最高 R²，再保留 R² 距最高值不超过 0.02 的候选段，并优先选择覆盖能级点数最多的高能段。本次高能段起点为 log10(E/J) = ${result.fitStartEnergyLevel.toFixed(
          2,
        )}，参与拟合 ${result.fitPointCount}/${result.pointCount} 个能级点。`}
      />
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </Card>
  );
};

export default GRChart;
