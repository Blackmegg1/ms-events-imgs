import { getEventList } from '@/services/event/EventController';
import { getLayerList } from '@/services/layer/LayerController';
import { getCompass, getModelList } from '@/services/model/ModelController';
import { getPointList } from '@/services/point/PointController';
import { getActiveProject } from '@/services/project/ProjectController';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Scene from '../ModelShow/components/Scene';
import DailyEnergyChart from '../TimingImg/components/DailyEnergyChart';
import DailyFrequencyChart from '../TimingImg/components/DailyFrequencyChart';

interface ModelInfo {
  model_id: number;
  model_name: string;
}

const WINDOW_OPTIONS = [
  { label: '近7天', value: 7 },
  { label: '近30天', value: 30 },
];

const GuestDashboard = () => {
  const [projectOptions, setProjectOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [projectId, setProjectId] = useState<number>();
  const [windowDays, setWindowDays] = useState<number>(7);

  const [points, setPoints] = useState<any[]>([]);
  const [layers, setLayers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [compass, setCompass] = useState<any>(null);

  const [modelLoading, setModelLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [modelError, setModelError] = useState<string>('');
  const [eventError, setEventError] = useState<string>('');

  const timeRangeText = useMemo(() => {
    const end = dayjs();
    const start = end.subtract(windowDays, 'day');
    return `${start.format('YYYY-MM-DD HH:mm')} ~ ${end.format(
      'YYYY-MM-DD HH:mm',
    )}`;
  }, [windowDays]);

  const fetchModelData = useCallback(async (currentProjectId: number) => {
    setModelLoading(true);
    setModelError('');
    try {
      const { list: modelList = [] } = await getModelList({
        project_id: currentProjectId,
      });
      const currentModel = (modelList as ModelInfo[])[0];

      if (!currentModel?.model_id) {
        setPoints([]);
        setLayers([]);
        setCompass(null);
        return;
      }

      const [pointRes, layerRes, compassRes] = await Promise.all([
        getPointList({ model_id: currentModel.model_id }),
        getLayerList({ model_id: currentModel.model_id }),
        getCompass(currentModel.model_id).catch(() => ({ compass: [] })),
      ]);

      setPoints(pointRes?.list || []);
      setLayers(layerRes?.list || []);
      const compassData = compassRes?.compass;
      if (compassData?.[0]?.show_compass) {
        setCompass({
          start: compassData[0].compass_start.split(',').map(Number),
          end: compassData[0].compass_end.split(',').map(Number),
        });
      } else {
        setCompass(null);
      }
    } catch (error) {
      console.error(error);
      setPoints([]);
      setLayers([]);
      setCompass(null);
      setModelError('模型数据失败');
    } finally {
      setModelLoading(false);
    }
  }, []);

  const fetchEventData = useCallback(
    async (currentProjectId: number, currentWindowDays: number) => {
      setEventLoading(true);
      setEventError('');
      try {
        const timeBegin = dayjs()
          .subtract(currentWindowDays, 'day')
          .startOf('day')
          .format('YYYY-MM-DD');
        const timeEnd = dayjs().endOf('day').format('YYYY-MM-DD');
        const { list = [] } = await getEventList({
          project_id: currentProjectId,
          current: 1,
          pageSize: 999999,
          timeBegin,
          timeEnd,
        });

        setEvents(list || []);
      } catch (error) {
        console.error(error);
        setEvents([]);
        setEventError('事件数据失败');
      } finally {
        setEventLoading(false);
      }
    },
    [],
  );

  const refreshAll = useCallback(async () => {
    if (!projectId) return;
    await Promise.all([
      fetchModelData(projectId),
      fetchEventData(projectId, windowDays),
    ]);
  }, [fetchEventData, fetchModelData, projectId, windowDays]);

  useEffect(() => {
    const init = async () => {
      const list = await getActiveProject();
      const options = (list || []).map((project: any) => ({
        label: project.projectName,
        value: project.id,
      }));
      setProjectOptions(options);
      if (options.length > 0) {
        setProjectId(options[0].value);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    refreshAll();
  }, [projectId, windowDays, refreshAll]);

  return (
    <PageContainer
      header={{
        title: '访客大屏',
      }}
    >
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Typography.Text strong>项目：</Typography.Text>
          <Select
            style={{ width: 240 }}
            placeholder="请选择项目"
            options={projectOptions}
            value={projectId}
            onChange={(value) => setProjectId(value)}
          />
          <Typography.Text strong>近期时间窗：</Typography.Text>
          <Select
            style={{ width: 140 }}
            options={WINDOW_OPTIONS}
            value={windowDays}
            onChange={(value) => setWindowDays(value)}
          />
          <Typography.Text type="secondary">{timeRangeText}</Typography.Text>
          <Button type="primary" onClick={refreshAll} disabled={!projectId}>
            刷新
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="地质模型与事件叠加" bodyStyle={{ minHeight: 560 }}>
            {modelError ? (
              <Alert
                type="error"
                showIcon
                message={modelError}
                style={{ marginBottom: 12 }}
              />
            ) : null}
            <Spin spinning={modelLoading}>
              {points.length > 0 ? (
                <div style={{ width: '100%', height: 520 }}>
                  <Scene
                    points={points}
                    layers={layers}
                    events={events}
                    compass={compass}
                  />
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无可展示的模型数据"
                />
              )}
            </Spin>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {eventError ? (
              <Alert type="error" showIcon message={eventError} />
            ) : null}
            <Spin spinning={eventLoading}>
              {events.length > 0 ? (
                <>
                  <DailyFrequencyChart events={events} />
                  <DailyEnergyChart events={events} />
                </>
              ) : (
                <Card>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="近期暂无事件数据"
                  />
                </Card>
              )}
            </Spin>
          </Space>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default GuestDashboard;
