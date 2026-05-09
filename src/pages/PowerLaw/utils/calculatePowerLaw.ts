export interface EventItem {
  magnitude?: number | null;
  energy?: number | null;
  time?: string;
  [key: string]: any;
}

export interface GRPoint {
  magnitude: number;
  energyLevel: number;
  count: number;
  logCount: number;
}

export interface FittedPoint {
  magnitude: number;
  energyLevel: number;
  fittedLogCount: number;
}

export interface PowerLawResult {
  a: number;
  b: number;
  r2: number;
  totalCount: number;
  validCount: number;
  pointCount: number;
  fitPointCount: number;
  fitStartEnergyLevel: number;
  points: GRPoint[];
  fittedLine: FittedPoint[];
}

export interface PowerLawError {
  error: string;
  totalCount: number;
  validCount: number;
}

const MIN_EVENTS_FOR_FIT = 5;
const MIN_POINTS_FOR_TAIL_FIT = 4;
const KJ_TO_J = 1000;

export function isPowerLawError(
  result: PowerLawResult | PowerLawError,
): result is PowerLawError {
  return 'error' in result;
}

function toEnergyLevel(event: EventItem): number | null {
  const energyKj = Number(event.energy);
  if (isFinite(energyKj) && !isNaN(energyKj) && energyKj > 0) {
    return Math.log10(energyKj * KJ_TO_J);
  }

  const magnitude = Number(event.magnitude);
  if (isFinite(magnitude) && !isNaN(magnitude)) {
    // 微震常用换算：log10(E[J]) = 1.8 + 1.9M。
    return 1.8 + 1.9 * magnitude;
  }

  return null;
}

function linearRegression(points: GRPoint[]) {
  const xs = points.map((p) => p.energyLevel);
  const ys = points.map((p) => p.logCount);
  const n = xs.length;

  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const sumX2 = xs.reduce((s, v) => s + v * v, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - slope * sumX) / n;
  const b = -slope;

  const meanY = sumY / n;
  const ssTot = ys.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, v, i) => s + (v - (a + slope * xs[i])) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { a, b, r2, slope };
}

function selectHighEnergyFitPoints(points: GRPoint[]) {
  const minPointCount =
    points.length >= MIN_POINTS_FOR_TAIL_FIT ? MIN_POINTS_FOR_TAIL_FIT : points.length;

  const candidates: Array<{
    points: GRPoint[];
    regression: NonNullable<ReturnType<typeof linearRegression>>;
  }> = [];

  // 从高能量端开始，逐步向低能量扩展；保留线性度高且覆盖范围尽量大的高能段。
  for (let start = points.length - minPointCount; start >= 0; start -= 1) {
    const candidatePoints = points.slice(start);
    const regression = linearRegression(candidatePoints);
    if (!regression) continue;
    candidates.push({ points: candidatePoints, regression });
  }

  if (candidates.length === 0) return null;

  const bestR2 = Math.max(...candidates.map((candidate) => candidate.regression.r2));
  const acceptableR2 = bestR2 - 0.02;
  const stableCandidates = candidates.filter(
    (candidate) => candidate.regression.r2 >= acceptableR2,
  );

  return stableCandidates.reduce((best, candidate) => {
    if (candidate.points.length > best.points.length) return candidate;
    if (
      candidate.points.length === best.points.length &&
      candidate.regression.r2 > best.regression.r2
    ) {
      return candidate;
    }
    return best;
  });
}

export function calculatePowerLaw(
  events: EventItem[],
): PowerLawResult | PowerLawError {
  const totalCount = events.length;

  // 优先使用能量字段构建能级；缺失能量时用震级公式估算能级。
  const validLevels: number[] = events
    .map(toEnergyLevel)
    .filter((level): level is number => level !== null && isFinite(level) && !isNaN(level));

  const validCount = validLevels.length;

  if (validCount < MIN_EVENTS_FOR_FIT) {
    return {
      error: `事件数量不足（有效能量数据 ${validCount} 条），无法进行有效拟合，至少需要 ${MIN_EVENTS_FOR_FIT} 条`,
      totalCount,
      validCount,
    };
  }

  validLevels.sort((a, b) => a - b);

  // 取唯一能级值作为 G-R 分析的能量阈值。
  const uniqueLevels = [...new Set(validLevels)].sort((a, b) => a - b);

  if (uniqueLevels.length < 2) {
    return {
      error: '所有事件能级值相同，无法进行线性回归',
      totalCount,
      validCount,
    };
  }

  // 构建 G-R 数据点：对每个唯一能级 log10(E)，计算 N（≥E 的事件数）和 log10(N)。
  const points: GRPoint[] = uniqueLevels.map((level) => {
    const count = validLevels.filter((v) => v >= level).length;
    return {
      magnitude: (level - 1.8) / 1.9,
      energyLevel: level,
      count,
      logCount: Math.log10(count),
    };
  });

  const fit = selectHighEnergyFitPoints(points);
  if (!fit) {
    return {
      error: '所有事件能级值相同，无法进行线性回归（分母为零）',
      totalCount,
      validCount,
    };
  }

  const { a, b, r2 } = fit.regression;

  // 拟合直线：只绘制自动选中的高能拟合区间。
  const minLevel = fit.points[0].energyLevel;
  const maxLevel = fit.points[fit.points.length - 1].energyLevel;
  const fittedLine: FittedPoint[] = Array.from({ length: 101 }, (_, i) => {
    const level = minLevel + (i / 100) * (maxLevel - minLevel);
    return {
      magnitude: (level - 1.8) / 1.9,
      energyLevel: level,
      fittedLogCount: a - b * level,
    };
  });

  return {
    a,
    b,
    r2,
    totalCount,
    validCount,
    pointCount: points.length,
    fitPointCount: fit.points.length,
    fitStartEnergyLevel: minLevel,
    points,
    fittedLine,
  };
}
