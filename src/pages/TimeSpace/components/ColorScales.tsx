import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export function getColor(val: number) {
  const colorScale = d3
  .scaleLinear()
  .domain([-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3])
  .range([
    '#0a0675', // 深蓝色
    '#2008a8', // 较深的蓝色  
    '#3107f0', // 蓝色
    '#1f07f0', // 较深的蓝色
    '#081cf0', // 深蓝色
    '#22d3ae', // 浅绿色
    '#68d220', // 绿色
    '#c7aa1a', // 黄色
    '#ea851a', // 橙色
    '#e14e0f', // 深橙色
    '#ec0f08'  // 深红色
  ]);
  const color = colorScale(val);
  return color;
}

const ColorScale = ({ title }: { title: string }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const padding = 30; // 留出的空白区域大小
    const scaleWidth = 30; // 色阶带宽度
    const titleHeight = 20; // 标题高度
    const colorScale = d3
    .scaleLinear()
    .domain([-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3])
    .range([
      '#0a0675', // 深蓝色
      '#2008a8', // 较深的蓝色  
      '#3107f0', // 蓝色
      '#1f07f0', // 较深的蓝色
      '#081cf0', // 深蓝色
      '#22d3ae', // 浅绿色
      '#68d220', // 绿色
      '#c7aa1a', // 黄色
      '#ea851a', // 橙色
      '#e14e0f', // 深橙色
      '#ec0f08'  // 深红色
    ]);
    // 绘制标题
    ctx.font = '14px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, canvasWidth / 2 - titleWidth / 4, 5);

    // 绘制色阶条
    ctx.clearRect(
      padding,
      padding + titleHeight,
      canvasWidth - 2 * padding,
      canvasHeight - padding - titleHeight,
    );

    for (let i = canvasHeight - padding; i >= padding; i--) {
      const color = colorScale(
        ((canvasHeight - i - padding) / (canvasHeight - 2 * padding)) * 5 - 2,
      ); // 将输入值缩放到 [-2, 3] 范围
      ctx.fillStyle = color;
      ctx.fillRect(padding, i, scaleWidth, 1);
    }

    // 绘制色阶轴
    const axisScale = d3
      .scaleLinear()
      .domain([-2, 3]) // 将轴的域设置为 [-2, 3]
      .range([canvasHeight - padding, padding]);
    const ticks = axisScale.ticks(5);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ticks.forEach((tick) => {
      const y = axisScale(tick);
      // ctx.beginPath();
      // ctx.moveTo(padding + scaleWidth, y);
      // ctx.lineTo(padding + scaleWidth + 10, y);
      // ctx.stroke();
      ctx.fillText(tick.toFixed(2), padding + scaleWidth + 15, y);
    });
  }, []);

  return <canvas ref={canvasRef} width="150" height="300" />;
};

export default ColorScale;
