import * as echarts from 'echarts';
import 'echarts-gl';
import { useEffect, useRef } from 'react';
import { SensorDataEntry } from '../types';

interface SensorScatter3DProps {
  sensorData: SensorDataEntry[];
}

const SensorScatter3D: React.FC<SensorScatter3DProps> = ({ sensorData }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  let chartInstance: echarts.ECharts | null = null;

  const getOption = () => {
    const data = sensorData.map((item) => [item[1], item[2], item[3]]);
    console.log('Rendered sensorData:', sensorData);

    const xValues = data.map(item => item[0]);
    const yValues = data.map(item => item[1]);
    const zValues = data.map(item => item[2]);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);

    const padding = 0.1;
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const zRange = zMax - zMin || 1;

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const index = params.dataIndex;
          const sensorId = sensorData[index][0];
          const [x, y, z] = params.value;
          return `传感器: ${sensorId}<br/>X: ${x}<br/>Y: ${y}<br/>Z: ${z}`;
        },
      },
      grid3D: {
        boxWidth: 200,
        boxDepth: 80,
        boxHeight: 80,
        viewControl: {
          autoRotate: false,
          distance: 200,
        },
      },
      xAxis3D: {
        type: 'value',
        name: 'X（米）',
        min: (xMin - xRange * padding).toFixed(1),
        max: (xMax + xRange * padding).toFixed(1),
      },
      yAxis3D: {
        type: 'value',
        name: 'Y（米）',
        min: (yMin - yRange * padding).toFixed(1),
        max: (yMax + yRange * padding).toFixed(1),
      },
      zAxis3D: {
        type: 'value',
        name: 'Z（米）',
        min: (zMin - zRange * padding).toFixed(1),
        max: (zMax + zRange * padding).toFixed(1),
      },
      series: [
        {
          type: 'scatter3D',
          data: data,
          symbolSize: 12,
          itemStyle: {
            color: (params) => {
              const index = params.dataIndex;
              const sensorId = sensorData[index][0].toString();
              if (sensorId.startsWith('B')) return '#ff0000';
              if (sensorId.startsWith('N')) return '#00ff00';
              return '#0000ff';
            },
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.8)',
          },
          emphasis: {
            itemStyle: {
              color: '#fff',
            },
          },
        },
      ],
    };
  };

  // 初始化和更新图表
  useEffect(() => {
    if (chartRef.current) {
      if (!chartInstance) {
        chartInstance = echarts.init(chartRef.current);
      }
      chartInstance.setOption(getOption(), true);
    }

    return () => {
      if (chartInstance) {
        chartInstance.dispose();
        chartInstance = null;
      }
    };
  }, [sensorData]);

  // 窗口大小变化时调整
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance) {
        chartInstance.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={chartRef}
      style={{ width: '100%', height: '800px' }} 
    />
  );
};

export default SensorScatter3D;