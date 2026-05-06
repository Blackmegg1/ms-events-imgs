import { calculatePowerLaw, isPowerLawError } from './calculatePowerLaw';
import type { EventItem } from './calculatePowerLaw';

export type HeatmapMetric =
  | 'density'
  | 'energy'
  | 'maxMagnitude'
  | 'bValue'
  | 'fractureIndex';

export type ProjectionPlane = 'xy' | 'xz' | 'yz';

export const METRIC_LABELS: Record<HeatmapMetric, string> = {
  density: '事件密度',
  energy: '能量释放强度',
  maxMagnitude: '最大震级',
  bValue: 'b 值空间分布',
  fractureIndex: '综合破裂活动指数',
};

export const PLANE_LABELS: Record<ProjectionPlane, string> = {
  xy: 'X-Y 平面（俯视）',
  xz: 'X-Z 剖面（纵向）',
  yz: 'Y-Z 剖面（横向）',
};

export interface CellData {
  xIndex: number;
  yIndex: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  eventCount: number;
  energySum: number;
  maxMagnitude: number;
  avgMagnitude: number;
  bValue: number | null;
  bInsufficient: boolean;
  fractureIndex: number;
  /** 当前指标的值，null 表示该格无法计算（如 b 值样本不足） */
  value: number | null;
}

export interface HeatmapResult {
  cells: CellData[];
  xLabels: string[];
  yLabels: string[];
  xCols: number;
  yRows: number;
  xAxisName: string;
  yAxisName: string;
  metric: HeatmapMetric;
  gridSize: number;
  totalEvents: number;
  validEvents: number;
  hasCoordinates: boolean;
  hasEnergy: boolean;
  valueMin: number;
  valueMax: number;
  riskMessages: string[];
  error?: string;
}

const MIN_EVENTS_FOR_B = 10;
const MAX_CELLS = 5000;

function getFields(plane: ProjectionPlane) {
  switch (plane) {
    case 'xy':
      return { xF: 'loc_x', yF: 'loc_y', xName: 'X', yName: 'Y' };
    case 'xz':
      return { xF: 'loc_x', yF: 'loc_z', xName: 'X', yName: 'Z' };
    case 'yz':
      return { xF: 'loc_y', yF: 'loc_z', xName: 'Y', yName: 'Z' };
  }
}

/** 无 energy 字段时用震级估算能量（简化 Hanks-Kanamori） */
function estimateEnergy(mag: number): number {
  return Math.pow(10, 1.5 * mag + 4.8);
}

function normalizeArr(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

export function calculateHeatmap(
  events: EventItem[],
  plane: ProjectionPlane,
  gridSize: number,
  metric: HeatmapMetric,
): HeatmapResult {
  const { xF, yF, xName, yName } = getFields(plane);
  const xAxisName = `${xName} 坐标`;
  const yAxisName = `${yName} 坐标`;
  const totalEvents = events.length;

  // 过滤有效坐标事件
  const valid = events.filter((e) => {
    const x = Number(e[xF]);
    const y = Number(e[yF]);
    return isFinite(x) && !isNaN(x) && isFinite(y) && !isNaN(y);
  });

  if (valid.length === 0) {
    return {
      cells: [], xLabels: [], yLabels: [], xCols: 0, yRows: 0,
      xAxisName, yAxisName, metric, gridSize, totalEvents, validEvents: 0,
      hasCoordinates: false, hasEnergy: false, valueMin: 0, valueMax: 0, riskMessages: [],
    };
  }

  const hasEnergy = valid.some((e) => {
    const v = Number(e.energy);
    return isFinite(v) && !isNaN(v) && v > 0;
  });

  // 坐标范围对齐到网格
  const xs = valid.map((e) => Number(e[xF]));
  const ys = valid.map((e) => Number(e[yF]));
  const xRangeMin = Math.floor(Math.min(...xs) / gridSize) * gridSize;
  const yRangeMin = Math.floor(Math.min(...ys) / gridSize) * gridSize;
  const xRangeMax = (Math.floor(Math.max(...xs) / gridSize) + 1) * gridSize;
  const yRangeMax = (Math.floor(Math.max(...ys) / gridSize) + 1) * gridSize;

  const xCols = Math.max(1, Math.round((xRangeMax - xRangeMin) / gridSize));
  const yRows = Math.max(1, Math.round((yRangeMax - yRangeMin) / gridSize));

  if (xCols * yRows > MAX_CELLS) {
    return {
      cells: [], xLabels: [], yLabels: [], xCols, yRows,
      xAxisName, yAxisName, metric, gridSize, totalEvents, validEvents: valid.length,
      hasCoordinates: true, hasEnergy, valueMin: 0, valueMax: 0, riskMessages: [],
      error: `网格数量过多（${xCols} × ${yRows} = ${xCols * yRows} 格），请增大网格尺寸以减少计算量（上限 ${MAX_CELLS} 格）`,
    };
  }

  // 事件分配到网格
  const cellMap = new Map<string, EventItem[]>();
  valid.forEach((e) => {
    const x = Number(e[xF]);
    const y = Number(e[yF]);
    const xi = Math.min(Math.floor((x - xRangeMin) / gridSize), xCols - 1);
    const yi = Math.min(Math.floor((y - yRangeMin) / gridSize), yRows - 1);
    const key = `${xi},${yi}`;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key)!.push(e);
  });

  const xLabels = Array.from({ length: xCols }, (_, i) =>
    String(xRangeMin + i * gridSize),
  );
  const yLabels = Array.from({ length: yRows }, (_, i) =>
    String(yRangeMin + i * gridSize),
  );

  // 逐格计算统计量
  interface RawCell extends CellData {
    _mags: number[];
  }
  const raw: RawCell[] = [];

  cellMap.forEach((cellEvents, key) => {
    const [xi, yi] = key.split(',').map(Number);
    const xMin = xRangeMin + xi * gridSize;
    const yMin = yRangeMin + yi * gridSize;

    const mags = cellEvents
      .map((e) => Number(e.magnitude))
      .filter((m) => isFinite(m) && !isNaN(m));

    const energies: number[] = hasEnergy
      ? cellEvents
          .map((e) => Number(e.energy))
          .filter((v) => isFinite(v) && !isNaN(v) && v > 0)
      : mags.map(estimateEnergy);

    const eventCount = cellEvents.length;
    const energySum = energies.reduce((s, v) => s + v, 0);
    const maxMag = mags.length > 0 ? Math.max(...mags) : 0;
    const avgMag =
      mags.length > 0 ? mags.reduce((s, v) => s + v, 0) / mags.length : 0;

    // b 值：所有格均尝试计算，结果供风险摘要使用
    let bValue: number | null = null;
    const bInsufficient = mags.length < MIN_EVENTS_FOR_B;
    if (!bInsufficient) {
      const r = calculatePowerLaw(cellEvents);
      if (!isPowerLawError(r)) bValue = r.b;
    }

    raw.push({
      xIndex: xi, yIndex: yi,
      xMin, xMax: xMin + gridSize,
      yMin, yMax: yMin + gridSize,
      eventCount, energySum,
      maxMagnitude: maxMag, avgMagnitude: avgMag,
      bValue, bInsufficient,
      fractureIndex: 0, value: null,
      _mags: mags,
    });
  });

  // 归一化并计算综合破裂活动指数
  if (raw.length > 0) {
    const normCounts = normalizeArr(raw.map((c) => c.eventCount));
    const normEnergies = normalizeArr(raw.map((c) => c.energySum));
    const normMaxMags = normalizeArr(raw.map((c) => c.maxMagnitude));
    raw.forEach((c, i) => {
      c.fractureIndex =
        0.4 * normCounts[i] + 0.4 * normEnergies[i] + 0.2 * normMaxMags[i];
    });
  }

  // 根据选定指标设置 value
  raw.forEach((c) => {
    switch (metric) {
      case 'density':
        c.value = c.eventCount;
        break;
      case 'energy':
        c.value = c.energySum;
        break;
      case 'maxMagnitude':
        c.value = c.maxMagnitude;
        break;
      case 'bValue':
        c.value = c.bValue; // null 表示样本不足，不着色
        break;
      case 'fractureIndex':
        c.value = c.fractureIndex;
        break;
    }
  });

  const cells: CellData[] = raw.map(({ _mags: _m, ...rest }) => rest);

  const numericValues = cells
    .map((c) => c.value)
    .filter((v): v is number => v !== null && !isNaN(v));
  const valueMin = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const valueMax = numericValues.length > 0 ? Math.max(...numericValues) : 0;

  const riskMessages = buildRiskMessages(cells, hasEnergy);

  return {
    cells, xLabels, yLabels, xCols, yRows,
    xAxisName, yAxisName, metric, gridSize,
    totalEvents, validEvents: valid.length,
    hasCoordinates: true, hasEnergy,
    valueMin, valueMax, riskMessages,
  };
}

function meanStd(arr: number[]): { mean: number; std: number } {
  const n = arr.length;
  if (n === 0) return { mean: 0, std: 0 };
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { mean, std };
}

function buildRiskMessages(cells: CellData[], hasEnergy: boolean): string[] {
  const msgs: string[] = [];
  // 少于 2 格时统计无意义
  if (cells.length < 2) return msgs;

  // ── 事件密度：超过本次非空网格均值 + 1σ 的网格视为相对偏高 ──
  {
    const arr = cells.map((c) => c.eventCount);
    const { mean, std } = meanStd(arr);
    const threshold = mean + std;
    const above = cells.filter((c) => c.eventCount > threshold);
    if (above.length > 0) {
      const max = Math.max(...above.map((c) => c.eventCount));
      msgs.push(
        `事件密度相对偏高：${above.length} 个网格事件数超过本次数据非空网格均值+1σ` +
          `（均值 ${mean.toFixed(0)} 次，阈值 ${threshold.toFixed(0)} 次），` +
          `最高密度网格 ${max} 次，表示该区域在本次分析范围内微震活动相对集中。`,
      );
    }
  }

  // ── 能量释放：超过本次非空网格均值 + 1σ 的网格视为相对偏高 ──
  {
    const arr = cells.map((c) => c.energySum).filter((v) => v > 0);
    if (arr.length >= 2) {
      const { mean, std } = meanStd(arr);
      const threshold = mean + std;
      const above = cells.filter((c) => c.energySum > threshold);
      if (above.length > 0) {
        const max = Math.max(...above.map((c) => c.energySum));
        const note = hasEnergy ? '' : '（由震级估算，仅供参考）';
        msgs.push(
          `能量释放相对偏高：${above.length} 个网格能量超过本次数据非空网格均值+1σ` +
            `（阈值 ${threshold.toExponential(2)} J${note}），` +
            `最高 ${max.toExponential(2)} J，表示该区域在本次分析范围内能量释放相对集中。`,
        );
      }
    }
  }

  // ── b 值：低于本次有效 b 值网格均值 - 1σ 的网格视为相对偏低（低 b 值 = 大震占比高）──
  {
    const bCells = cells.filter((c) => c.bValue !== null);
    if (bCells.length >= 2) {
      const arr = bCells.map((c) => c.bValue as number);
      const { mean, std } = meanStd(arr);
      const threshold = mean - std;
      const below = bCells.filter((c) => (c.bValue as number) < threshold);
      if (below.length > 0) {
        const min = Math.min(...below.map((c) => c.bValue as number));
        msgs.push(
          `b 值相对偏低：${below.length} 个网格 b 值低于本次有效 b 值网格均值−1σ` +
            `（均值 ${mean.toFixed(2)}，阈值 ${threshold.toFixed(2)}），` +
            `最低 ${min.toFixed(2)}，表示该区域在本次分析范围内大震级事件占比相对偏高。`,
        );
      }
    }
  }

  // ── 综合破裂活动指数：超过本次非空网格均值 + 1σ 的网格视为相对偏高 ──
  // fractureIndex 已归一化至 [0,1]，此阈值为相对于本次数据的统计偏高，非绝对标准
  {
    const arr = cells.map((c) => c.fractureIndex);
    const { mean, std } = meanStd(arr);
    const threshold = mean + std;
    const above = cells.filter((c) => c.fractureIndex > threshold);
    if (above.length > 0) {
      const max = Math.max(...above.map((c) => c.fractureIndex));
      msgs.push(
        `综合指数相对偏高：${above.length} 个网格综合破裂活动指数超过本次数据非空网格均值+1σ` +
          `（均值 ${mean.toFixed(2)}，阈值 ${threshold.toFixed(2)}），` +
          `最高 ${max.toFixed(2)}，表示该区域在本次分析范围内破裂活动相对集中。`,
      );
    }
  }

  return msgs;
}
