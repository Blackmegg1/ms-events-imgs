import { Card } from 'antd';
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

    const scatterData = result.points.map((p) => [p.magnitude, p.logCount]);
    const lineData = result.fittedLine.map((p) => [p.magnitude, p.fittedLogCount]);

    const option: echarts.EChartsOption = {
      title: {
        text: 'G-R 关系图（Gutenberg-Richter）',
        subtext: `log₁₀(N) = ${result.a.toFixed(3)} − ${result.b.toFixed(3)} × M     R² = ${result.r2.toFixed(4)}`,
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesName === 'G-R 散点') {
            const [m, logN] = params.data as number[];
            const N = Math.round(Math.pow(10, logN));
            return `震级 M ≥ ${m.toFixed(2)}<br/>累计事件数 N = ${N}<br/>log₁₀(N) = ${logN.toFixed(4)}`;
          }
          const [m, logN] = params.data as number[];
          return `M = ${m.toFixed(2)}<br/>拟合 log₁₀(N) = ${logN.toFixed(4)}`;
        },
      },
      legend: {
        data: ['G-R 散点', '线性拟合'],
        bottom: 0,
      },
      xAxis: {
        type: 'value',
        name: '震级 M',
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
          name: '线性拟合',
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
      <div ref={chartRef} style={{ width: '100%', height: '450px' }} />
    </Card>
  );
};

export default GRChart;
