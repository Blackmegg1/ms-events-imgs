import type { PowerLawResult } from './calculatePowerLaw';

export interface ThresholdConfig {
  /** 最少参与分析的有效事件数 */
  minEventCount: number;
  /** b 值下降超过此值进入「关注」 */
  bDropWarning: number;
  /** b 值下降超过此值进入「重点关注」 */
  bDropHigh: number;
  /** a 值上升比例超过此值进入「关注」（0.20 = 20%） */
  aRiseWarning: number;
  /** a 值上升比例超过此值进入「重点关注」（0.40 = 40%） */
  aRiseHigh: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  minEventCount: 30,
  bDropWarning: 0.15,
  bDropHigh: 0.30,
  aRiseWarning: 0.20,
  aRiseHigh: 0.40,
};

export type RiskLevel = 'low' | 'watch' | 'high' | 'insufficient';

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: '低',
  watch: '关注',
  high: '重点关注',
  insufficient: '样本不足',
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: '#52c41a',
  watch: '#faad14',
  high: '#f5222d',
  insufficient: '#8c8c8c',
};

export const RISK_TAG_COLOR: Record<RiskLevel, string> = {
  low: 'success',
  watch: 'warning',
  high: 'error',
  insufficient: 'default',
};

export interface ComparisonResult {
  deltaA: number;
  deltaB: number;
  deltaAPercent: number;
  deltaBPercent: number;
  /** baseline.b - current.b，正值表示 b 值下降 */
  bDrop: number;
  bDropSignificant: boolean;
  bDropHighLevel: boolean;
  /** (current.a - baseline.a) / |baseline.a| */
  aRiseRatio: number;
  aRiseSignificant: boolean;
  aRiseHighLevel: boolean;
  riskLevel: RiskLevel;
  interpretations: string[];
}

export function analyzeComparison(
  current: PowerLawResult,
  baseline: PowerLawResult,
  thresholds: ThresholdConfig,
): ComparisonResult {
  const deltaA = current.a - baseline.a;
  const deltaB = current.b - baseline.b;
  const deltaAPercent = baseline.a !== 0 ? (deltaA / Math.abs(baseline.a)) * 100 : 0;
  const deltaBPercent = baseline.b !== 0 ? (deltaB / Math.abs(baseline.b)) * 100 : 0;
  const bDrop = baseline.b - current.b;
  const aRiseRatio = baseline.a !== 0 ? deltaA / Math.abs(baseline.a) : 0;

  const bDropSignificant = bDrop > thresholds.bDropWarning;
  const bDropHighLevel = bDrop > thresholds.bDropHigh;
  const aRiseSignificant = aRiseRatio > thresholds.aRiseWarning;
  const aRiseHighLevel = aRiseRatio > thresholds.aRiseHigh;

  let riskLevel: RiskLevel;
  if (
    current.validCount < thresholds.minEventCount ||
    baseline.validCount < thresholds.minEventCount
  ) {
    riskLevel = 'insufficient';
  } else if (
    aRiseHighLevel ||
    bDropHighLevel ||
    (aRiseSignificant && bDropSignificant)
  ) {
    riskLevel = 'high';
  } else if (aRiseSignificant || bDropSignificant) {
    riskLevel = 'watch';
  } else {
    riskLevel = 'low';
  }

  const interpretations: string[] = [];

  if (riskLevel === 'insufficient') {
    interpretations.push(
      `当前期或基准期有效事件数量不足（当前：${current.validCount} 条，基准：${baseline.validCount} 条，建议不少于 ${thresholds.minEventCount} 条），` +
        '拟合结果仅供参考，不建议据此单独作出判断。',
    );
  }

  if (bDropSignificant) {
    const detail = `Δb = ${deltaB.toFixed(3)}（下降 ${Math.abs(deltaBPercent).toFixed(1)}%）`;
    if (bDropHighLevel) {
      interpretations.push(
        `b 值大幅下降（${detail}），大震级事件占比显著升高，可能存在较强应力集中，需重点关注。`,
      );
    } else {
      interpretations.push(
        `b 值明显低于历史基准（${detail}），大震级事件占比上升，可能存在应力集中，建议关注。`,
      );
    }
  } else if (Math.abs(bDrop) <= thresholds.bDropWarning * 0.5) {
    interpretations.push('b 值相对历史基准基本稳定，震级分布特征未见明显变化。');
  }

  if (aRiseSignificant) {
    const detail = `Δa = +${deltaA.toFixed(3)}（升高 ${deltaAPercent.toFixed(1)}%）`;
    if (aRiseHighLevel) {
      interpretations.push(
        `a 值大幅升高（${detail}），微震活动显著增强，区域扰动明显增大。`,
      );
    } else {
      interpretations.push(
        `a 值明显升高（${detail}），微震活动频度增强，区域扰动增加。`,
      );
    }
  }

  if (aRiseSignificant && bDropSignificant) {
    interpretations.push(
      '事件活跃度增强且大能量事件占比上升，综合风险评估升高，建议结合现场生产条件综合研判。',
    );
  }

  if (interpretations.length === 0) {
    interpretations.push(
      '当前期 a、b 参数相对基准期变化不明显，微震活动特征基本稳定。',
    );
  }

  return {
    deltaA,
    deltaB,
    deltaAPercent,
    deltaBPercent,
    bDrop,
    bDropSignificant,
    bDropHighLevel,
    aRiseRatio,
    aRiseSignificant,
    aRiseHighLevel,
    riskLevel,
    interpretations,
  };
}
