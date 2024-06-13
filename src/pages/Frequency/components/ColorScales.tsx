import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export const getColor = (val: number, maxValue: number) => {
  // 如果传入的最大值小于 10,则使用 0 到 10 作为域范围,否则使用 0 到最大值作为域范围
  const clampedDomain = maxValue < 10 ? [0, 10] : [0, maxValue];

  const colorScale = d3
    .scaleLinear()
    .domain(clampedDomain)
    .range([
      '#081cf0',
      '#22d3ae',
      '#68d220',
      '#c7aa1a',
      '#ea851a',
      '#e14e0f',
      '#ec0f08',
    ]);

  const colorRange = colorScale.range();
  const color = d3.interpolateRgbBasis(colorRange)(val / clampedDomain[1]);

  return color;
};

const ColorScale = ({
  title,
  maxValue,
}: {
  title: string;
  maxValue: number;
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const padding = 30; // 留出的空白区域大小
    const scaleWidth = 30; // 色阶带宽度
    const titleHeight = 20; // 标题高度

    // 如果传入的最大值小于 10,则使用 0 到 10 作为域范围,否则使用 0 到最大值作为域范围
    const clampedDomain = maxValue < 10 ? [0, 10] : [0, maxValue];

    // 绘制标题
    ctx.font = '14px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, canvasWidth / 2 - titleWidth / 2, 5);

    // 绘制色阶条
    ctx.clearRect(
      padding,
      padding + titleHeight,
      canvasWidth - 2 * padding,
      canvasHeight - padding - titleHeight,
    );

    const [min, max] = clampedDomain;
    const range = max - min;

    for (let i = canvasHeight - padding; i >= padding; i--) {
      const value =
        min +
        ((canvasHeight - i - padding) / (canvasHeight - 2 * padding)) * range;
      const color = getColor(value, maxValue); // 使用导出的 getColor 函数
      ctx.fillStyle = color;
      ctx.fillRect(padding, i, scaleWidth, 1);
    }

    // 绘制色阶轴
    const axisScale = d3
      .scaleLinear()
      .domain(clampedDomain) // 将轴的域设置为限制后的域
      .range([canvasHeight - padding, padding]);
    const tickCount = Math.min(
      10,
      Math.max(5, (canvasWidth - 2 * padding - scaleWidth) / 50),
    ); // 根据画布宽度自适应刻度数量
    const ticks = axisScale.ticks(tickCount);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ticks.forEach((tick) => {
      const y = axisScale(tick);
      ctx.fillText(Math.round(tick), padding + scaleWidth + 15, y); // 显示整数刻度
    });
  }, [maxValue]);

  return <canvas ref={canvasRef} width="150" height="300" />;
};

export default ColorScale;
