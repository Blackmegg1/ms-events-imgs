import {
  Alert,
  Card,
  Col,
  Divider,
  InputNumber,
  Row,
  Select,
  Tag,
  Typography,
} from 'antd';
import * as echarts from 'echarts';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { EventItem } from '../utils/calculatePowerLaw';
import {
  calculateHeatmap,
  METRIC_LABELS,
  PLANE_LABELS,
} from '../utils/calculateHeatmap';
import type { CellData, HeatmapMetric, ProjectionPlane } from '../utils/calculateHeatmap';

interface HeatmapPanelProps {
  events: EventItem[];
}

const METRIC_OPTIONS = (
  Object.entries(METRIC_LABELS) as [HeatmapMetric, string][]
).map(([value, label]) => ({ value, label }));

const PLANE_OPTIONS = (
  Object.entries(PLANE_LABELS) as [ProjectionPlane, string][]
).map(([value, label]) => ({ value, label }));

const GRID_PRESETS = [
  { value: 10, label: '10 m' },
  { value: 20, label: '20 m' },
  { value: 50, label: '50 m' },
  { value: 100, label: '100 m' },
  { value: 0, label: '自定义' },
];

const { Text, Paragraph } = Typography;

const sub = (s: string) => <sub style={{ fontSize: '0.75em' }}>{s}</sub>;
const sup = (s: string) => <sup style={{ fontSize: '0.75em' }}>{s}</sup>;

/** 每个指标的计算说明，图表下方展示 */
const METRIC_FORMULA: Record<HeatmapMetric, React.ReactNode> = {
  density: (
    <>
      <Paragraph style={{ marginBottom: 4 }}>
        <Text code>N{sub('cell')} = Σ 1</Text>
        &emsp;统计坐标落入该网格的事件总数，无加权处理。
      </Paragraph>
    </>
  ),
  energy: (
    <>
      <Paragraph style={{ marginBottom: 4 }}>
        <Text strong>有 energy 字段时：</Text>
        &emsp;<Text code>E{sub('cell')} = Σ E{sub('i')}</Text>
        &emsp;（原始能量字段，单位 J）
      </Paragraph>
      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>无 energy 字段时（估算）：</Text>
        &emsp;<Text code>E{sub('i')} = 10{sup('1.5 × Mᴵ + 4.8')}</Text>
        &emsp;简化 Hanks-Kanamori 关系，结果仅供参考，不代表真实辐射能量。
      </Paragraph>
    </>
  ),
  maxMagnitude: (
    <>
      <Paragraph style={{ marginBottom: 0 }}>
        <Text code>M{sub('max')} = max(M{sub('i')})</Text>
        &emsp;取网格内所有事件震级的最大值，不做统计修正。
      </Paragraph>
    </>
  ),
  bValue: (
    <>
      <Paragraph style={{ marginBottom: 4 }}>
        对每个网格内的事件独立进行最小二乘线性回归：
      </Paragraph>
      <Paragraph style={{ marginBottom: 4 }}>
        <Text code>log{sub('10')}(N) = a − b · M</Text>
        &emsp;M 为震级阈值，N 为震级 ≥ M 的累计事件数。
      </Paragraph>
      <Paragraph style={{ marginBottom: 0 }}>
        b 值反映震级-频次分布斜率：<Text strong>b 越小，大震级事件占比越高</Text>，故色阶反转（深红 = 低 b = 需关注）。网格内有效震级数据 {'<'} 10 条时标记为样本不足，不着色。
      </Paragraph>
    </>
  ),
  fractureIndex: (
    <>
      <Paragraph style={{ marginBottom: 4 }}>
        <Text code>I = 0.4 × N̂ + 0.4 × Ê + 0.2 × M̂{sub('max')}</Text>
      </Paragraph>
      <Paragraph style={{ marginBottom: 4 }}>
        其中各分量为当前时段所有非空网格的 <Text strong>min-max 归一化</Text>值：
      </Paragraph>
      <Paragraph style={{ marginBottom: 2 }}>
        <Text code>N̂ = (N{sub('cell')} − N{sub('min')}) / (N{sub('max')} − N{sub('min')})</Text>
        &emsp;事件密度归一化
      </Paragraph>
      <Paragraph style={{ marginBottom: 2 }}>
        <Text code>Ê = (E{sub('cell')} − E{sub('min')}) / (E{sub('max')} − E{sub('min')})</Text>
        &emsp;能量释放归一化（无 energy 字段时用震级估算）
      </Paragraph>
      <Paragraph style={{ marginBottom: 0 }}>
        <Text code>M̂{sub('max')} = (M{sub('max,cell')} − M{sub('max,min')}) / (M{sub('max,max')} − M{sub('max,min')})</Text>
        &emsp;最大震级归一化
      </Paragraph>
    </>
  ),
};

/** 默认色阶：低→高 */
const COLOR_SCALE = ['#eaf6ff', '#85c1e9', '#2471a3', '#e67e22', '#c0392b'];
/** b 值反转色阶：低 b = 高风险 = 深红 */
const COLOR_SCALE_B = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2471a3'];

const HeatmapPanel: React.FC<HeatmapPanelProps> = ({ events }) => {
  const [metric, setMetric] = useState<HeatmapMetric>('fractureIndex');
  const [plane, setPlane] = useState<ProjectionPlane>('xy');
  const [gridPreset, setGridPreset] = useState<number>(50);
  const [customGrid, setCustomGrid] = useState<number>(50);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);

  const gridSize = gridPreset === 0 ? Math.max(1, customGrid) : gridPreset;

  const heatmap = useMemo(
    () => calculateHeatmap(events, plane, gridSize, metric),
    [events, plane, gridSize, metric],
  );

  // 按 xIndex,yIndex 建立快速查找表，供 tooltip 使用
  const cellLookup = useMemo(() => {
    const map = new Map<string, CellData>();
    heatmap.cells.forEach((c) => map.set(`${c.xIndex},${c.yIndex}`, c));
    return map;
  }, [heatmap]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInst.current) {
      chartInst.current = echarts.init(chartRef.current);
    }
    const chart = chartInst.current;

    if (
      !heatmap.hasCoordinates ||
      heatmap.error ||
      heatmap.cells.length === 0
    ) {
      chart.clear();
      return;
    }

    const {
      cells,
      xLabels,
      yLabels,
      xAxisName,
      yAxisName,
      valueMin,
      valueMax,
    } = heatmap;

    const isBValue = metric === 'bValue';
    const colorScale = isBValue ? COLOR_SCALE_B : COLOR_SCALE;

    // 只包含有值的格
    const chartData: [number, number, number][] = cells
      .filter((c): c is CellData & { value: number } => c.value !== null)
      .map((c) => [c.xIndex, c.yIndex, c.value]);

    const axisLabelInterval = (len: number) =>
      Math.max(0, Math.floor(len / 12) - 1);

    const option: echarts.EChartsOption = {
      title: {
        text: `微震活动热力图 · ${METRIC_LABELS[metric]}`,
        subtext: `${PLANE_LABELS[plane]}  |  网格 ${gridSize} m  |  有效事件 ${heatmap.validEvents} 条`,
        left: 'center',
        subtextStyle: { color: '#8c8c8c' },
      },
      tooltip: {
        formatter: (params: any) => {
          const [xi, yi] = params.data as [number, number, number];
          const c = cellLookup.get(`${xi},${yi}`);
          if (!c) return '';
          const bStr =
            c.bValue !== null
              ? c.bValue.toFixed(3)
              : c.bInsufficient
                ? `样本不足（<${10} 条）`
                : '-';
          return [
            `<b>${xAxisName}：${c.xMin} ~ ${c.xMax}</b>`,
            `<b>${yAxisName}：${c.yMin} ~ ${c.yMax}</b>`,
            `事件数：${c.eventCount}`,
            `能量总和：${c.energySum > 0 ? c.energySum.toExponential(2) + ' J' : '-'}`,
            `最大震级：${c.maxMagnitude.toFixed(2)} ML`,
            `平均震级：${c.avgMagnitude.toFixed(2)} ML`,
            `b 值：${bStr}`,
            `综合破裂指数：${c.fractureIndex.toFixed(3)}`,
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        name: xAxisName,
        nameLocation: 'middle',
        nameGap: 38,
        axisLabel: {
          interval: axisLabelInterval(xLabels.length),
          rotate: 30,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'category',
        data: yLabels,
        name: yAxisName,
        nameLocation: 'middle',
        nameGap: 58,
        axisLabel: {
          interval: axisLabelInterval(yLabels.length),
          fontSize: 10,
        },
      },
      visualMap: {
        min: valueMin,
        max: valueMax,
        calculable: true,
        orient: 'vertical',
        right: 8,
        top: 'center',
        inRange: { color: colorScale },
        text: isBValue ? ['低（低风险）', '高（高风险）'] : ['低', '高'],
        textStyle: { fontSize: 11 },
      },
      series: [
        {
          type: 'heatmap',
          data: chartData,
          emphasis: {
            itemStyle: { borderColor: '#555', borderWidth: 1 },
          },
        },
      ],
      grid: {
        left: '6%',
        right: '14%',
        bottom: '12%',
        top: '20%',
        containLabel: true,
      },
      toolbox: {
        feature: { saveAsImage: {} },
        right: 10,
        top: 4,
      },
    };

    chart.setOption(option, true);
  }, [heatmap, cellLookup, metric, gridSize, plane]);

  useEffect(() => {
    const onResize = () => chartInst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    return () => {
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, []);

  const renderBody = () => {
    if (!heatmap.hasCoordinates) {
      return (
        <Alert
          type="warning"
          showIcon
          message="当前事件数据缺少空间坐标（loc_x / loc_y / loc_z），无法生成空间热力图。"
        />
      );
    }
    if (heatmap.error) {
      return <Alert type="warning" showIcon message={heatmap.error} />;
    }
    if (heatmap.cells.length === 0) {
      return (
        <Alert
          type="info"
          showIcon
          message="当前指标下无有效数据格（可能所有网格均样本不足），请切换指标或缩小网格尺寸。"
        />
      );
    }
    return (
      <>
        {/* 说明文案 */}
        <Alert
          type="info"
          showIcon={false}
          style={{ marginBottom: 10, padding: '6px 12px' }}
          message={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              该图基于微震事件空间分布、能量释放和震级特征生成，用于识别本次分析范围内相对集中的微震活动区域。颜色深浅表示当前指标在本次数据非空网格之间的相对大小。该结果为应力扰动的间接指示，不等同于真实应力反演结果或绝对预警标准。
            </Typography.Text>
          }
        />

        {/* 图表 */}
        <div ref={chartRef} style={{ width: '100%', height: 480 }} />

        {/* 指标计算说明 */}
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <Text strong style={{ fontSize: 13 }}>
            计算说明 · {METRIC_LABELS[metric]}
          </Text>
          <Divider style={{ margin: '6px 0' }} />
          {METRIC_FORMULA[metric]}
        </div>

        {/* 无 energy 字段提示 */}
        {!heatmap.hasEnergy && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message="未检测到有效 energy 字段，能量数值由震级估算（log₁₀E = 1.5M + 4.8），仅供参考。"
          />
        )}

        {/* 相对异常提示 */}
        {heatmap.riskMessages.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
              相对异常提示：
            </Typography.Text>
            {heatmap.riskMessages.map((msg, i) => (
              <Typography.Paragraph key={i} style={{ marginBottom: 4, fontSize: 13 }}>
                <Tag color="warning">注意</Tag>
                {msg}
              </Typography.Paragraph>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <Card title="空间热力云图">
      {/* 控制栏 */}
      <Row gutter={[16, 8]} align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <span style={{ marginRight: 6, fontSize: 13 }}>显示指标：</span>
          <Select
            value={metric}
            onChange={setMetric}
            options={METRIC_OPTIONS}
            style={{ width: 168 }}
          />
        </Col>
        <Col>
          <span style={{ marginRight: 6, fontSize: 13 }}>投影平面：</span>
          <Select
            value={plane}
            onChange={setPlane}
            options={PLANE_OPTIONS}
            style={{ width: 160 }}
          />
        </Col>
        <Col style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>网格大小：</span>
          <Select
            value={gridPreset}
            onChange={setGridPreset}
            options={GRID_PRESETS}
            style={{ width: 100 }}
          />
          {gridPreset === 0 && (
            <InputNumber
              min={1}
              max={100000}
              value={customGrid}
              onChange={(v) => setCustomGrid(v ?? 50)}
              addonAfter="m"
              style={{ width: 120 }}
            />
          )}
        </Col>
      </Row>

      {renderBody()}
    </Card>
  );
};

export default HeatmapPanel;
