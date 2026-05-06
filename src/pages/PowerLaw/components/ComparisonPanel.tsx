import { Card, Col, Divider, Row, Statistic, Tag, Typography } from 'antd';
import React from 'react';
import type { ComparisonResult } from '../utils/analyzeComparison';
import { RISK_LABEL, RISK_TAG_COLOR } from '../utils/analyzeComparison';
import type { PowerLawResult } from '../utils/calculatePowerLaw';

interface ComparisonPanelProps {
  current: PowerLawResult;
  baseline: PowerLawResult;
  currentLabel: string;
  baselineLabel: string;
  comparison: ComparisonResult;
}

function trendColor(delta: number, positiveIsBad: boolean): string {
  if (Math.abs(delta) < 1e-6) return '#595959';
  const bad = positiveIsBad ? delta > 0 : delta < 0;
  return bad ? '#f5222d' : '#52c41a';
}

function trendPrefix(delta: number): string {
  if (delta > 1e-6) return '▲ ';
  if (delta < -1e-6) return '▼ ';
  return '— ';
}

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  current,
  baseline,
  currentLabel,
  baselineLabel,
  comparison,
}) => {
  const { deltaA, deltaB, deltaAPercent, deltaBPercent, riskLevel, interpretations } =
    comparison;

  return (
    <Card
      title={
        <span>
          历史基准对比&nbsp;&nbsp;
          <Tag color={RISK_TAG_COLOR[riskLevel]} style={{ fontSize: 13 }}>
            风险等级：{RISK_LABEL[riskLevel]}
          </Tag>
        </span>
      }
    >
      {/* 当前 vs 基准 并排 */}
      <Row gutter={24}>
        <Col span={11}>
          <Card
            size="small"
            type="inner"
            title={<span style={{ color: '#1677ff' }}>当前时间段（{currentLabel}）</span>}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="a 值" value={current.a.toFixed(4)} />
              </Col>
              <Col span={8}>
                <Statistic title="b 值" value={current.b.toFixed(4)} />
              </Col>
              <Col span={8}>
                <Statistic title="有效事件数" value={current.validCount} suffix="条" />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 22, color: '#d9d9d9' }}>vs</span>
        </Col>

        <Col span={11}>
          <Card
            size="small"
            type="inner"
            title={<span style={{ color: '#8c8c8c' }}>基准时间段（{baselineLabel}）</span>}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="a 值" value={baseline.a.toFixed(4)} />
              </Col>
              <Col span={8}>
                <Statistic title="b 值" value={baseline.b.toFixed(4)} />
              </Col>
              <Col span={8}>
                <Statistic title="有效事件数" value={baseline.validCount} suffix="条" />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      {/* 变化量 */}
      <Row gutter={32}>
        <Col span={6}>
          <Statistic
            title="Δa（当前 − 基准）"
            value={`${trendPrefix(deltaA)}${Math.abs(deltaA).toFixed(4)}`}
            valueStyle={{ color: trendColor(deltaA, true) }}
            suffix={`（${deltaAPercent >= 0 ? '+' : ''}${deltaAPercent.toFixed(1)}%）`}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Δb（当前 − 基准）"
            value={`${trendPrefix(deltaB)}${Math.abs(deltaB).toFixed(4)}`}
            valueStyle={{ color: trendColor(deltaB, false) }}
            suffix={`（${deltaBPercent >= 0 ? '+' : ''}${deltaBPercent.toFixed(1)}%）`}
          />
        </Col>
        <Col span={12}>
          <div style={{ paddingTop: 4 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              判断依据：b 值下降表示大震级事件占比升高；a 值升高表示整体微震活动增强
            </Typography.Text>
          </div>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      {/* 解释文本 */}
      <div>
        {interpretations.map((text, i) => (
          <Typography.Paragraph
            key={i}
            style={{ marginBottom: 4, color: '#434343' }}
          >
            {'• ' + text}
          </Typography.Paragraph>
        ))}
      </div>
    </Card>
  );
};

export default ComparisonPanel;
