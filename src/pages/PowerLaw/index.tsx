import { getEventList } from '@/services/event/EventController';
import { getActiveProject } from '@/services/project/ProjectController';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  message,
  Row,
  Select,
  Space,
  Statistic,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import ComparisonPanel from './components/ComparisonPanel';
import GRChart from './components/GRChart';
import ThresholdConfigModal from './components/ThresholdConfigModal';
import HeatmapPanel from './components/HeatmapPanel';
import TrendChart from './components/TrendChart';
import {
  analyzeComparison,
  DEFAULT_THRESHOLDS,
} from './utils/analyzeComparison';
import type { ComparisonResult, ThresholdConfig } from './utils/analyzeComparison';
import {
  calculatePowerLaw,
  isPowerLawError,
} from './utils/calculatePowerLaw';
import type { EventItem, PowerLawError, PowerLawResult } from './utils/calculatePowerLaw';
import { calculateSlidingWindow } from './utils/calculateSlidingWindow';
import type { WindowResult } from './utils/calculateSlidingWindow';

const { RangePicker } = DatePicker;

const BASELINE_OPTIONS = [
  { value: 'prev30', label: '前 30 天' },
  { value: 'prev90', label: '前 90 天' },
  { value: 'custom', label: '自定义' },
  { value: 'none', label: '不做对比' },
];

const WINDOW_OPTIONS = [
  { value: 1, label: '按日' },
  { value: 3, label: '3 日' },
  { value: 7, label: '7 日' },
  { value: 15, label: '15 日' },
];

function formatRange(start: string, end: string) {
  return `${start} ~ ${end}`;
}

const PowerLaw = () => {
  const [form] = Form.useForm();
  const baselineType = Form.useWatch('baselineType', form);

  const [projectArr, setProjectArr] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [thresholds, setThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);

  const [currentResult, setCurrentResult] = useState<PowerLawResult | PowerLawError | null>(null);
  const [currentEvents, setCurrentEvents] = useState<EventItem[]>([]);
  const [currentRangeLabel, setCurrentRangeLabel] = useState('');

  const [baselineResult, setBaselineResult] = useState<PowerLawResult | PowerLawError | null>(null);
  const [baselineRangeLabel, setBaselineRangeLabel] = useState('');

  const [windowResults, setWindowResults] = useState<WindowResult[]>([]);
  const [windowDays, setWindowDaysState] = useState(7);

  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await getActiveProject();
        setProjectArr(
          response.map((p: { projectName: string; id: number }) => ({
            value: p.id,
            label: p.projectName,
          })),
        );
      } catch {
        message.error('获取项目列表失败');
      }
    }
    fetchProjects();
  }, []);

  const fetchEvents = async (
    projectId: number | null,
    start: string,
    end: string,
  ): Promise<EventItem[]> => {
    const { list } = await getEventList({
      pageSize: 999999,
      current: 1,
      timeBegin: start,
      timeEnd: end,
      project_id: projectId,
    });
    return list ?? [];
  };

  const handleAnalyze = async () => {
    const vals = form.getFieldsValue();
    const currentRange = vals.currentRange as [any, any] | undefined;

    if (!currentRange || currentRange.length < 2) {
      message.warning('请先选择当前分析时间段');
      return;
    }

    const curStart = dayjs(currentRange[0]).format('YYYY-MM-DD');
    const curEnd = dayjs(currentRange[1]).format('YYYY-MM-DD');
    const wDays: number = vals.windowDays ?? 7;
    const projectId = vals.project_id ?? null;
    const bType: string = vals.baselineType ?? 'none';

    setLoading(true);
    setCurrentResult(null);
    setBaselineResult(null);
    setWindowResults([]);
    setComparison(null);

    try {
      // ── 当前时间段 ──
      const curEvents = await fetchEvents(projectId, curStart, curEnd);
      if (curEvents.length === 0) {
        message.error('当前时间段未找到微震事件');
        return;
      }
      message.success(`当前时间段：共获取 ${curEvents.length} 个事件`);
      const curResult = calculatePowerLaw(curEvents);
      setCurrentResult(curResult);
      setCurrentEvents(curEvents);
      setCurrentRangeLabel(formatRange(curStart, curEnd));
      setWindowDaysState(wDays);

      // ── 滑动窗口（复用当前时间段事件）──
      const winResults = calculateSlidingWindow(curEvents, curStart, curEnd, wDays);
      setWindowResults(winResults);

      // ── 基准时间段 ──
      if (bType !== 'none') {
        let baseStart = '';
        let baseEnd = '';

        if (bType === 'prev30') {
          baseEnd = dayjs(curStart).subtract(1, 'day').format('YYYY-MM-DD');
          baseStart = dayjs(curStart).subtract(30, 'day').format('YYYY-MM-DD');
        } else if (bType === 'prev90') {
          baseEnd = dayjs(curStart).subtract(1, 'day').format('YYYY-MM-DD');
          baseStart = dayjs(curStart).subtract(90, 'day').format('YYYY-MM-DD');
        } else if (bType === 'custom') {
          const customRange = vals.baselineRange as [any, any] | undefined;
          if (!customRange || customRange.length < 2) {
            message.warning('请选择自定义基准时间段');
            return;
          }
          baseStart = dayjs(customRange[0]).format('YYYY-MM-DD');
          baseEnd = dayjs(customRange[1]).format('YYYY-MM-DD');
        }

        const baseEvents = await fetchEvents(projectId, baseStart, baseEnd);
        const baseResult = calculatePowerLaw(baseEvents);
        setBaselineResult(baseResult);
        setBaselineRangeLabel(formatRange(baseStart, baseEnd));

        // 对比分析
        if (!isPowerLawError(curResult) && !isPowerLawError(baseResult)) {
          setComparison(analyzeComparison(curResult, baseResult, thresholds));
        }
      }
    } catch {
      message.error('数据获取失败，请检查网络或联系管理员');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setCurrentResult(null);
    setBaselineResult(null);
    setWindowResults([]);
    setComparison(null);
    setCurrentEvents([]);
  };

  const showCurrentStats = currentResult && !isPowerLawError(currentResult);

  return (
    <PageContainer header={{ title: '微震幂律法分析' }}>
      {/* 筛选表单 */}
      <Card>
        <Form form={form} layout="inline" initialValues={{ baselineType: 'prev30', windowDays: 7 }}>
          <Row gutter={[16, 12]} style={{ width: '100%' }}>
            <Col>
              <Form.Item label="分析项目" name="project_id">
                <Select
                  options={projectArr}
                  style={{ width: 200 }}
                  placeholder="请选择项目"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label="当前时间段" name="currentRange">
                <RangePicker />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label="基准时间段" name="baselineType">
                <Select options={BASELINE_OPTIONS} style={{ width: 110 }} />
              </Form.Item>
            </Col>
            {baselineType === 'custom' && (
              <Col>
                <Form.Item label="自定义基准" name="baselineRange">
                  <RangePicker />
                </Form.Item>
              </Col>
            )}
            <Col>
              <Form.Item label="滑窗大小" name="windowDays">
                <Select options={WINDOW_OPTIONS} style={{ width: 90 }} />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item>
                <Space>
                  <Button onClick={handleReset}>重置</Button>
                  <Button
                    type="primary"
                    loading={loading}
                    onClick={handleAnalyze}
                  >
                    分析
                  </Button>
                  <Button onClick={() => setThresholdModalOpen(true)}>
                    配置阈值
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 当前期计算失败提示 */}
      {currentResult && isPowerLawError(currentResult) && (
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message="当前时间段拟合失败"
          description={currentResult.error}
        />
      )}

      {/* 基准期计算失败提示 */}
      {baselineResult && isPowerLawError(baselineResult) && (
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message="基准时间段拟合失败"
          description={baselineResult.error}
        />
      )}

      {showCurrentStats && (
        <>
          {/* 当前期统计卡 */}
          <Card style={{ marginTop: 16 }}>
            <Row gutter={32}>
              <Col span={6}>
                <Statistic title="事件总数" value={currentResult.totalCount} suffix="次" />
              </Col>
              <Col span={6}>
                <Statistic
                  title="参与拟合的震级点数"
                  value={currentResult.pointCount}
                  suffix="个"
                />
              </Col>
              <Col span={6}>
                <Statistic title="a 值（活动性参数）" value={currentResult.a.toFixed(4)} />
              </Col>
              <Col span={6}>
                <Statistic title="b 值（震级比例参数）" value={currentResult.b.toFixed(4)} />
              </Col>
            </Row>
          </Card>

          {/* 历史对比面板 */}
          {comparison &&
            baselineResult &&
            !isPowerLawError(baselineResult) && (
              <div style={{ marginTop: 16 }}>
                <ComparisonPanel
                  current={currentResult}
                  baseline={baselineResult}
                  currentLabel={currentRangeLabel}
                  baselineLabel={baselineRangeLabel}
                  comparison={comparison}
                />
              </div>
            )}

          {/* G-R 关系图 */}
          <div style={{ marginTop: 16 }}>
            <GRChart result={currentResult} />
          </div>

          {/* 滑窗趋势图 */}
          {windowResults.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <TrendChart windowResults={windowResults} windowDays={windowDays} />
            </div>
          )}

          {/* 空间热力云图 */}
          <div style={{ marginTop: 16 }}>
            <HeatmapPanel events={currentEvents} />
          </div>

        </>
      )}

      <ThresholdConfigModal
        open={thresholdModalOpen}
        thresholds={thresholds}
        onSave={(vals) => {
          setThresholds(vals);
          setThresholdModalOpen(false);
          message.success('阈值已保存，下次分析时生效');
        }}
        onCancel={() => setThresholdModalOpen(false)}
      />
    </PageContainer>
  );
};

export default PowerLaw;
