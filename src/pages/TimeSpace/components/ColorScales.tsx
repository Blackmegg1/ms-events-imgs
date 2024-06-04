import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export function getColor(val: number) {
  const colorScale = d3
    .scaleLinear()
    .domain([0, 0.5, 0.8, 1.3, 1.8, 2.5, 3])
    .range([
      '#081cf0',
      '#22d3ae',
      '#68d220',
      '#c7aa1a',
      '#ea851a',
      '#e14e0f',
      '#ec0f08',
    ]);
  const color = colorScale(val);
  return color;
}

const ColorScale = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const padding = 20; // 留出的空白区域大小
    const scaleWidth = 30; // 色阶带宽度

    // 定义颜色比例尺
    const colorScale = d3
      .scaleLinear()
      .domain([0, 0.5, 0.8, 1.3, 1.8, 2.5, 3])
      .range([
        '#081cf0',
        '#22d3ae',
        '#68d220',
        '#c7aa1a',
        '#ea851a',
        '#e14e0f',
        '#ec0f08',
      ]);

    // 绘制色阶条
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    for (let i = canvasHeight - padding; i >= padding; i--) {
      const color = colorScale(
        ((canvasHeight - i - padding) / (canvasHeight - 2 * padding)) * 3,
      ); // 将输入值缩放到 [0, 3] 范围
      ctx.fillStyle = color;
      ctx.fillRect(padding, i, scaleWidth, 1);
    }

    // 绘制色阶轴
    const axisScale = d3
      .scaleLinear()
      .domain([0, 3]) // 将轴的域设置为 [0, 3]
      .range([canvasHeight - padding, padding]);
    const ticks = axisScale.ticks(5);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ticks.forEach((tick) => {
      const y = axisScale(tick);
      ctx.beginPath();
      ctx.moveTo(padding + scaleWidth + 5, y);
      ctx.lineTo(padding + scaleWidth + 10, y);
      ctx.stroke();
      ctx.fillText(tick.toFixed(2), padding + scaleWidth + 15, y);
    });
  }, []);

  return <canvas ref={canvasRef} width="150" height="300" />;
};

export default ColorScale;
