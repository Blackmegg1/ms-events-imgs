import { Card } from 'antd';
import * as echarts from 'echarts';
import React, { useEffect, useRef } from 'react';
import { isPowerLawError } from '../utils/calculatePowerLaw';
import type { WindowResult } from '../utils/calculateSlidingWindow';

interface TrendChartProps {
  windowResults: WindowResult[];
  windowDays: number;
}

const TrendChart: React.FC<TrendChartProps> = ({ windowResults, windowDays }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || windowResults.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const labels = windowResults.map((w) =>
      windowDays === 1 ? w.windowStart : `${w.windowStart}`,
    );
    const aValues = windowResults.map((w) =>
      isPowerLawError(w.result) ? null : Number(w.result.a.toFixed(4)),
    );
    const bValues = windowResults.map((w) =>
      isPowerLawError(w.result) ? null : Number(w.result.b.toFixed(4)),
    );
    const counts = windowResults.map((w) => w.eventCount);

    const option: echarts.EChartsOption = {
      title: {
        text: `滑动窗口趋势（窗口：${windowDays} 天）`,
        subtext: '灰色柱为窗口内事件数；折线为拟合 a/b 值（数据不足的窗口显示断点）',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const idx = params[0].dataIndex;
          const w = windowResults[idx];
          const lines: string[] = [`<b>${w.windowStart} ~ ${w.windowEnd}</b>`];
          params.forEach((p: any) => {
            const val = p.value === null ? '数据不足' : p.value;
            lines.push(`${p.marker}${p.seriesName}：${val}`);
          });
          return lines.join('<br/>');
        },
      },
      legend: {
        data: ['a 值', 'b 值', '事件数'],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { rotate: 30, fontSize: 11 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'a / b 值',
          nameLocation: 'middle',
          nameGap: 40,
          scale: true,
        },
        {
          type: 'value',
          name: '事件数',
          nameLocation: 'middle',
          nameGap: 40,
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'a 值',
          type: 'line',
          data: aValues,
          connectNulls: false,
          yAxisIndex: 0,
          itemStyle: { color: '#5470c6' },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: 'b 值',
          type: 'line',
          data: bValues,
          connectNulls: false,
          yAxisIndex: 0,
          itemStyle: { color: '#ee6666' },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: '事件数',
          type: 'bar',
          data: counts,
          yAxisIndex: 1,
          itemStyle: { color: '#d9d9d9' },
          barMaxWidth: 30,
        },
      ],
      grid: { left: '5%', right: '6%', bottom: '14%', top: '18%', containLabel: true },
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: 'none' },
          restore: {},
          saveAsImage: {},
        },
        right: 10,
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: [0] },
        { type: 'slider', xAxisIndex: [0], bottom: 30 },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [windowResults, windowDays]);

  return (
    <Card>
      <div ref={chartRef} style={{ width: '100%', height: '420px' }} />
    </Card>
  );
};

export default TrendChart;
