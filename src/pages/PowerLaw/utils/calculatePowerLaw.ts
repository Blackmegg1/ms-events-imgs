export interface EventItem {
  magnitude?: number | null;
  time?: string;
  [key: string]: any;
}

export interface GRPoint {
  magnitude: number;
  count: number;
  logCount: number;
}

export interface FittedPoint {
  magnitude: number;
  fittedLogCount: number;
}

export interface PowerLawResult {
  a: number;
  b: number;
  r2: number;
  totalCount: number;
  validCount: number;
  pointCount: number;
  points: GRPoint[];
  fittedLine: FittedPoint[];
}

export interface PowerLawError {
  error: string;
  totalCount: number;
  validCount: number;
}

const MIN_EVENTS_FOR_FIT = 5;

export function isPowerLawError(
  result: PowerLawResult | PowerLawError,
): result is PowerLawError {
  return 'error' in result;
}

export function calculatePowerLaw(
  events: EventItem[],
): PowerLawResult | PowerLawError {
  const totalCount = events.length;

  // 过滤无效震级：空值、非数字、无穷大
  const validMags: number[] = events
    .map((e) => Number(e.magnitude))
    .filter((m) => isFinite(m) && !isNaN(m));

  const validCount = validMags.length;

  if (validCount < MIN_EVENTS_FOR_FIT) {
    return {
      error: `事件数量不足（有效震级数据 ${validCount} 条），无法进行有效拟合，至少需要 ${MIN_EVENTS_FOR_FIT} 条`,
      totalCount,
      validCount,
    };
  }

  validMags.sort((a, b) => a - b);

  // 取唯一震级值作为 G-R 分析的震级阈值
  const uniqueMags = [...new Set(validMags)].sort((a, b) => a - b);

  if (uniqueMags.length < 2) {
    return {
      error: '所有事件震级值相同，无法进行线性回归',
      totalCount,
      validCount,
    };
  }

  // 构建 G-R 数据点：对每个唯一震级 M，计算 N（≥M 的事件数）和 log10(N)
  const points: GRPoint[] = uniqueMags.map((m) => {
    const count = validMags.filter((v) => v >= m).length;
    return {
      magnitude: m,
      count,
      logCount: Math.log10(count),
    };
  });

  // 线性回归：y = a - b*x，其中 x=M，y=log10(N)
  // 即 y = intercept + slope*x，slope = -b，intercept = a
  const xs = points.map((p) => p.magnitude);
  const ys = points.map((p) => p.logCount);
  const n = xs.length;

  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const sumX2 = xs.reduce((s, v) => s + v * v, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return {
      error: '所有震级值相同，无法进行线性回归（分母为零）',
      totalCount,
      validCount,
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - slope * sumX) / n;
  const b = -slope; // log10(N) = a - b*M

  // 计算 R²
  const meanY = sumY / n;
  const ssTot = ys.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, v, i) => s + (v - (a + slope * xs[i])) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // 拟合直线：在震级范围内均匀取点
  const minM = xs[0];
  const maxM = xs[xs.length - 1];
  const fittedLine: FittedPoint[] = Array.from({ length: 101 }, (_, i) => {
    const m = minM + (i / 100) * (maxM - minM);
    return { magnitude: m, fittedLogCount: a - b * m };
  });

  return { a, b, r2, totalCount, validCount, pointCount: n, points, fittedLine };
}
