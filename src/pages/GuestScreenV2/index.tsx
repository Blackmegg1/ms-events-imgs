import { getEventList } from '@/services/event/EventController';
import { getLayerList } from '@/services/layer/LayerController';
import { getCompass, getModelList } from '@/services/model/ModelController';
import { getPointList } from '@/services/point/PointController';
import { getActiveProject } from '@/services/project/ProjectController';
import { getImgList } from '@/services/imgmag/ImgmagController';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Card, Carousel, Col, Empty, Row, Spin, Statistic, Typography } from 'antd';
import { Delaunay } from 'd3-delaunay';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Planar from '../Create/components/Planar';
import { getColor } from '../Create/components/ColorScales';
import Scene from '../ModelShow/components/Scene';
import './index.less';

interface ProjectInfo {
  id: number;
  projectName: string;
  byMag?: number;
}

interface SummaryInfo {
  totalCount: number;
  totalEnergy: number;
  avgDaily: number;
  maxHeight: number;
  maxDepth: number;
}

const EVENT_LOOKBACK_DAYS = 7;

const getEventTime = (event: any) => event?.time || event?.event_time;

const pointInTriangle = (px: number, py: number, triangle: any[]) => {
  const [a, b, c] = triangle;
  const s1 = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
  const s2 = (c.x - b.x) * (py - b.y) - (c.y - b.y) * (px - b.x);
  const s3 = (a.x - c.x) * (py - c.y) - (a.y - c.y) * (px - c.x);
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;

  return !(hasNeg && hasPos);
};

const interpolateZ = (x: number, y: number, triangle: any[]) => {
  const [a, b, c] = triangle;
  const detT = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(detT) < 1e-10) return (a.z + b.z + c.z) / 3;

  const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / detT;
  const l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / detT;
  const l3 = 1 - l1 - l2;

  return l1 * a.z + l2 * b.z + l3 * c.z;
};

const getRelativeEvents = (modelPoints: any[], sourceEvents: any[]) => {
  if (!modelPoints || modelPoints.length < 3 || !sourceEvents?.length) return [];

  const coords = new Float64Array(modelPoints.length * 2);
  modelPoints.forEach((point, index) => {
    coords[index * 2] = point.point_x;
    coords[index * 2 + 1] = point.point_y;
  });

  const delaunay = new Delaunay(coords);
  const pointToTriangles: number[][] = Array.from({ length: modelPoints.length }, () => []);

  for (let index = 0; index < delaunay.triangles.length; index += 1) {
    const pointIndex = delaunay.triangles[index];
    pointToTriangles[pointIndex].push(Math.floor(index / 3));
  }

  const surfacePoints = modelPoints.map((point) => ({
    x: point.point_x,
    y: point.point_y,
    z: point.point_z,
  }));

  return sourceEvents.map((event) => {
    const pointIndex = delaunay.find(event.loc_x, event.loc_y);
    const triangleIndexes = pointToTriangles[pointIndex] || [];
    let refZ: number | null = null;

    for (const triangleIndex of triangleIndexes) {
      const i0 = delaunay.triangles[triangleIndex * 3];
      const i1 = delaunay.triangles[triangleIndex * 3 + 1];
      const i2 = delaunay.triangles[triangleIndex * 3 + 2];
      const triangle = [surfacePoints[i0], surfacePoints[i1], surfacePoints[i2]];

      if (pointInTriangle(event.loc_x, event.loc_y, triangle)) {
        refZ = interpolateZ(event.loc_x, event.loc_y, triangle);
        break;
      }
    }

    return {
      ...event,
      relative_z: refZ !== null ? event.loc_z - refZ : null,
    };
  });
};

const getDataTimeRange = () => {
  const start = dayjs().subtract(EVENT_LOOKBACK_DAYS, 'day').startOf('day');
  const end = dayjs().subtract(1, 'day').endOf('day');

  return {
    timeBegin: start.format('YYYY-MM-DD'),
    timeEnd: end.format('YYYY-MM-DD'),
    display: `${start.format('YYYY-MM-DD')} 至 ${end.format('YYYY-MM-DD')}`,
  };
};

const EChart = ({ option, className }: { option: any; className?: string }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    chartInstance.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={chartRef} className={className || 'guest-screen-v2__chart'} />;
};

const buildDateRangeMap = () => {
  const dateMap: Record<string, number> = {};
  const range = getDataTimeRange();
  let current = dayjs(range.timeBegin).startOf('day');
  const end = dayjs(range.timeEnd).endOf('day');

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    dateMap[current.format('YYYY-MM-DD')] = 0;
    current = current.add(1, 'day');
  }

  return dateMap;
};

const GuestScreenV2: React.FC = () => {
  const dataTimeRangeText = useMemo(() => getDataTimeRange().display, []);
  const [project, setProject] = useState<ProjectInfo>();
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const [points, setPoints] = useState<any[]>([]);
  const [layers, setLayers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [imgList, setImgList] = useState<any[]>([]);
  const [compass, setCompass] = useState<any>(null);

  const [statsData, setStatsData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [magStats, setMagStats] = useState<any[]>([]);
  const [variationData, setVariationData] = useState<any[]>([]);
  const [summary, setSummary] = useState<SummaryInfo>({
    totalCount: 0,
    totalEnergy: 0,
    avgDaily: 0,
    maxHeight: 0,
    maxDepth: 0,
  });
  const planarImgs = useMemo(
    () =>
      [...imgList].sort((a, b) => {
        if (a.norm_axis === 'z' && b.norm_axis !== 'z') return -1;
        if (a.norm_axis !== 'z' && b.norm_axis === 'z') return 1;
        return String(a.name || '').localeCompare(String(b.name || ''));
      }),
    [imgList],
  );

  useEffect(() => {
    document.body.classList.add('guest-screen-active');
    document.documentElement.classList.add('guest-screen-active');

    return () => {
      document.body.classList.remove('guest-screen-active');
      document.documentElement.classList.remove('guest-screen-active');
    };
  }, []);

  useEffect(() => {
    const initProject = async () => {
      setProjectLoading(true);
      setProjectError('');
      try {
        const list = await getActiveProject();
        const currentProject = (list || [])[0];
        if (currentProject?.id) {
          setProject({
            id: currentProject.id,
            projectName: currentProject.projectName,
            byMag: currentProject.by_mag,
          });
        } else {
          setProject(undefined);
        }
      } catch (error) {
        console.error(error);
        setProject(undefined);
        setProjectError('项目配置读取失败');
      } finally {
        setProjectLoading(false);
      }
    };

    initProject();
  }, []);

  const analyseEvents = useCallback(
    async (allEvents: any[], allLayers: any[], modelPoints: any[]) => {
      const zones = allLayers.filter((layer) => layer.layer_type === 1);
      const relEvents = getRelativeEvents(modelPoints, allEvents);
      const dateTrendMap = buildDateRangeMap();
      const dateVariationMap: Record<string, any> = Object.keys(dateTrendMap).reduce(
        (acc, date) => ({
          ...acc,
          [date]: {
            roofCount: 0,
            maxHeight: 0,
            floorCount: 0,
            maxDepth: 0,
          },
        }),
        {},
      );
      const magBins = [
        { label: '< 0', count: 0, min: -Infinity, max: 0 },
        { label: '0 ~ 0.2', count: 0, min: 0, max: 0.2 },
        { label: '0.2 ~ 0.5', count: 0, min: 0.2, max: 0.5 },
        { label: '0.5 ~ 1.0', count: 0, min: 0.5, max: 1.0 },
        { label: '1.0 ~ 2.0', count: 0, min: 1.0, max: 2.0 },
        { label: '> 2.0', count: 0, min: 2.0, max: Infinity },
      ];
      const processedEventKeys = new Set<string>();
      const regionResults: any[] = [];
      let totalEnergy = 0;

      for (const zone of zones) {
        const bottomZ = zone.layer_distance - zone.layer_depth;
        const topZ = zone.layer_distance;
        const filtered = relEvents.filter((event) => {
          if (event.relative_z === null || event.relative_z === undefined) return false;
          return event.relative_z >= bottomZ && event.relative_z <= topZ;
        });
        const energySum = filtered.reduce(
          (acc: number, event: any) => acc + (Number(event.energy) || 0),
          0,
        );

        regionResults.push({
          key: zone.id,
          name: zone.layer_name,
          count: filtered.length,
          energy: Number(energySum.toFixed(2)),
          color: zone.layer_color,
        });

        totalEnergy += energySum;

        filtered.forEach((event: any) => {
          const key =
            event.event_key ||
            `${event.loc_x}-${event.loc_y}-${event.loc_z}-${getEventTime(event)}`;
          if (processedEventKeys.has(key)) return;
          processedEventKeys.add(key);

          const eventTime = getEventTime(event);
          if (eventTime) {
            const date = dayjs(eventTime).format('YYYY-MM-DD');
            dateTrendMap[date] = (dateTrendMap[date] || 0) + 1;
          }

          const magnitude = Number(event.magnitude);
          const bin = magBins.find((item) => magnitude >= item.min && magnitude < item.max);
          if (bin) bin.count += 1;
        });
      }

      if (zones.length === 0) {
        allEvents.forEach((event) => {
          const key =
            event?.event_key ||
            `${event?.loc_x}-${event?.loc_y}-${event?.loc_z}-${getEventTime(event)}`;
          if (processedEventKeys.has(key)) return;
          processedEventKeys.add(key);

          const eventTime = getEventTime(event);
          if (eventTime) {
            const date = dayjs(eventTime).format('YYYY-MM-DD');
            dateTrendMap[date] = (dateTrendMap[date] || 0) + 1;
          }

          totalEnergy += Number(event?.energy) || 0;
          const magnitude = Number(event?.magnitude);
          const bin = magBins.find((item) => magnitude >= item.min && magnitude < item.max);
          if (bin) bin.count += 1;
        });
      }

      let maxHeight = 0;
      let maxDepth = 0;
      const refLayer =
        allLayers.find((layer) => String(layer.layer_name || '').includes('煤')) || allLayers[0];

      if (refLayer) {
        const roofDist = refLayer.layer_distance;
        const floorDist = refLayer.layer_distance - refLayer.layer_depth;

        relEvents.forEach((event: any) => {
          const eventTime = getEventTime(event);
          if (!eventTime || event.relative_z === null || event.relative_z === undefined) return;

          const date = dayjs(eventTime).format('YYYY-MM-DD');
          if (!dateVariationMap[date]) {
            dateVariationMap[date] = {
              roofCount: 0,
              maxHeight: 0,
              floorCount: 0,
              maxDepth: 0,
            };
          }

          const height = event.relative_z - roofDist;
          const depth = floorDist - event.relative_z;
          if (height > 0) {
            dateVariationMap[date].roofCount += 1;
            dateVariationMap[date].maxHeight = Math.max(
              dateVariationMap[date].maxHeight,
              Number(height.toFixed(2)),
            );
            maxHeight = Math.max(maxHeight, height);
          }
          if (depth > 0) {
            dateVariationMap[date].floorCount += 1;
            dateVariationMap[date].maxDepth = Math.max(
              dateVariationMap[date].maxDepth,
              Number(depth.toFixed(2)),
            );
            maxDepth = Math.max(maxDepth, depth);
          }
        });
      }

      const trendArray = Object.keys(dateTrendMap)
        .sort()
        .map((date) => ({
          date: dayjs(date).format('MM-DD'),
          count: dateTrendMap[date],
        }));
      const days = trendArray.length || 1;

      setStatsData(regionResults);
      setTrendData(trendArray);
      setMagStats(magBins);
      setVariationData(
        Object.keys(dateVariationMap)
          .sort()
          .map((date) => ({
            date: dayjs(date).format('MM-DD'),
            ...dateVariationMap[date],
          })),
      );
      setSummary({
        totalCount: processedEventKeys.size,
        totalEnergy: Number(totalEnergy.toFixed(2)),
        avgDaily: Math.round(processedEventKeys.size / days),
        maxHeight: Number(maxHeight.toFixed(2)),
        maxDepth: Number(maxDepth.toFixed(2)),
      });
    },
    [],
  );

  const loadDashboard = useCallback(
    async (projectId: number) => {
      setLoading(true);
      setDataError('');
      try {
        const { list: modelList = [] } = await getModelList({ project_id: projectId });
        const currentModel = modelList[0];
        const { timeBegin, timeEnd } = getDataTimeRange();
        const [eventRes, imgRes] = await Promise.all([
          getEventList({
            project_id: projectId,
            current: 1,
            pageSize: 999999,
            timeBegin,
            timeEnd,
          }),
          getImgList({
            pageSize: 1000,
            current: 1,
            project_id: projectId,
          } as any),
        ]);
        const coloredEvents = (eventRes?.list || []).map((event: any) => ({
          ...event,
          color: getColor(Number(event.magnitude)),
        }));

        setEvents(coloredEvents);
        setImgList(imgRes?.list || []);

        if (!currentModel?.model_id) {
          setPoints([]);
          setLayers([]);
          setCompass(null);
          await analyseEvents(coloredEvents, [], []);
          return;
        }

        const [pointRes, layerRes, compassRes] = await Promise.all([
          getPointList({ model_id: currentModel.model_id }),
          getLayerList({ model_id: currentModel.model_id }),
          getCompass(currentModel.model_id).catch(() => ({ compass: [] })),
        ]);
        const layerList = layerRes?.list || [];

        const pointList = pointRes?.list || [];

        setPoints(pointList);
        setLayers(layerList);

        const compassData = compassRes?.compass;
        if (compassData?.[0]?.show_compass) {
          setCompass({
            start: compassData[0].compass_start.split(',').map(Number),
            end: compassData[0].compass_end.split(',').map(Number),
          });
        } else {
          setCompass(null);
        }

        await analyseEvents(coloredEvents, layerList, pointList);
      } catch (error) {
        console.error(error);
        setDataError('大屏数据加载失败');
      } finally {
        setLoading(false);
      }
    },
    [analyseEvents],
  );

  useEffect(() => {
    if (!project?.id) return;
    loadDashboard(project.id);
  }, [loadDashboard, project?.id]);

  const trendOption = useMemo(
    () => ({
      title: { text: '事件频次时间趋势', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: trendData.map((item) => item.date) },
      yAxis: { type: 'value', name: '频次(次)', minInterval: 1 },
      grid: { top: 56, bottom: 28, left: 42, right: 24, containLabel: true },
      series: [
        {
          data: trendData.map((item) => item.count),
          type: 'line',
          smooth: true,
          areaStyle: { opacity: 0.2 },
          itemStyle: { color: '#1890ff' },
          lineStyle: { width: 3 },
        },
      ],
    }),
    [trendData],
  );

  const magOption = useMemo(
    () => ({
      title: { text: '震级分布统计', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
          data: magStats.map((item) => ({ value: item.count, name: item.label })),
        },
      ],
    }),
    [magStats],
  );

  const variationOption = useMemo(
    () => ({
      title: { text: '微震事件连续变化趋势', left: 'center', textStyle: { fontSize: 15 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: {
        data: ['顶板事件数', '最大发育高度(m)', '底板事件数', '最大发育深度(m)'],
        bottom: 0,
      },
      grid: { top: 58, bottom: 52, left: 48, right: 56, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: variationData.map((item) => item.date),
      },
      yAxis: [
        {
          type: 'value',
          name: '频次(次)',
          minInterval: 1,
          splitLine: { lineStyle: { type: 'dashed', color: '#e8ece9' } },
        },
        { type: 'value', name: '高度/深度(m)', splitLine: { show: false } },
      ],
      series: [
        {
          name: '顶板事件数',
          type: 'line',
          data: variationData.map((item) => item.roofCount),
          itemStyle: { color: '#f5222d' },
          lineStyle: { width: 3 },
        },
        {
          name: '最大发育高度(m)',
          type: 'line',
          yAxisIndex: 1,
          data: variationData.map((item) => item.maxHeight),
          itemStyle: { color: '#fa8c16' },
          lineStyle: { width: 2, type: 'dashed' },
        },
        {
          name: '底板事件数',
          type: 'line',
          data: variationData.map((item) => item.floorCount),
          itemStyle: { color: '#1890ff' },
          lineStyle: { width: 3 },
        },
        {
          name: '最大发育深度(m)',
          type: 'line',
          yAxisIndex: 1,
          data: variationData.map((item) => item.maxDepth),
          itemStyle: { color: '#52c41a' },
          lineStyle: { width: 2, type: 'dashed' },
        },
      ],
    }),
    [variationData],
  );

  const barOption = useMemo(
    () => ({
      title: { text: '各分区微震频次', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      grid: { top: 56, bottom: 44, left: 42, right: 24, containLabel: true },
      xAxis: {
        type: 'category',
        data: statsData.map((item) => item.name),
        axisLabel: { interval: 0, rotate: 30 },
      },
      yAxis: { type: 'value', name: '频次(次)', minInterval: 1 },
      series: [
        {
          data: statsData.map((item) => ({
            value: item.count,
            itemStyle: { color: item.color || '#4f8f6b' },
          })),
          type: 'bar',
          label: { show: true, position: 'top' },
        },
      ],
    }),
    [statsData],
  );

  const pieOption = useMemo(
    () => ({
      title: { text: '分区能量占比', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} KJ ({d}%)' },
      series: [
        {
          name: '能量(KJ)',
          type: 'pie',
          radius: '60%',
          data: statsData.map((item) => ({
            value: item.energy,
            name: item.name,
            itemStyle: { color: item.color || '#4f8f6b' },
          })),
        },
      ],
    }),
    [statsData],
  );

  if (projectLoading) {
    return (
      <PageContainer ghost>
        <div className="guest-screen-v2 guest-screen-v2--empty">
          <Spin tip="正在加载访客大屏" />
        </div>
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer ghost>
        <div className="guest-screen-v2 guest-screen-v2--empty">
          <Empty description={projectError || '当前访客账号尚未配置项目，请联系管理员配置后查看大屏。'} />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer ghost>
      <Spin spinning={loading}>
        <div className="guest-screen-v2">
          <div className="guest-screen-v2__header">
            <div className="guest-screen-v2__project-block">
              <Typography.Text className="guest-screen-v2__project">
                {project.projectName}
              </Typography.Text>
            </div>
            <div className="guest-screen-v2__time-range">
              <span>数据时间</span>
              <strong>{dataTimeRangeText}</strong>
            </div>
          </div>

          {dataError ? (
            <Alert type="error" showIcon message={dataError} className="guest-screen-v2__alert" />
          ) : null}

          <Row gutter={[16, 16]} className="guest-screen-v2__metrics">
            <Col xs={12} lg={5}>
              <Card bordered={false}>
                <Statistic title="总计频次" value={summary.totalCount} suffix="次" />
              </Card>
            </Col>
            <Col xs={12} lg={5}>
              <Card bordered={false}>
                <Statistic title="最大发育高度" value={summary.maxHeight} suffix="m" precision={2} />
              </Card>
            </Col>
            <Col xs={12} lg={5}>
              <Card bordered={false}>
                <Statistic title="最大发育深度" value={summary.maxDepth} suffix="m" precision={2} />
              </Card>
            </Col>
            <Col xs={12} lg={4}>
              <Card bordered={false}>
                <Statistic title="日均频次" value={summary.avgDaily} suffix="次/天" />
              </Card>
            </Col>
            <Col xs={24} lg={5}>
              <Card bordered={false}>
                <Statistic title="累计能量" value={summary.totalEnergy} suffix="KJ" precision={1} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card title="地质模型与事件分布" bordered={false}>
                {points.length > 0 ? (
                  <div className="guest-screen-v2__scene">
                    <Scene points={points} layers={layers} events={events} compass={compass} />
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可展示的模型数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title="频次动态趋势" bordered={false}>
                <EChart option={trendOption} className="guest-screen-v2__scene-chart" />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={13}>
              <Card title="微震事件平面分布" bordered={false}>
                {events.length > 0 && planarImgs.length > 0 ? (
                  <div className="guest-screen-v2__planar-carousel">
                    <Carousel autoplay dots>
                      {planarImgs.map((img: any) => (
                        <div key={`${img.name}-${img.norm_axis}`} className="guest-screen-v2__planar-slide">
                          <div className="guest-screen-v2__planar-name">{img.name}</div>
                          <div className="guest-screen-v2__planar-wrap">
                            <Planar
                              img_base64={img.img_blob}
                              name={img.name}
                              norm_axis={img.norm_axis}
                              min_x={img.min_x}
                              min_y={img.min_y}
                              min_z={img.min_z}
                              max_x={img.max_x}
                              max_y={img.max_y}
                              max_z={img.max_z}
                              top_margin={img.top_margin}
                              left_margin={img.left_margin}
                              eventList={events}
                              lineCoordinate={null}
                              byMag={project.byMag ?? 1}
                              highlightThreshold={2000}
                              isHighlightEnabled={false}
                              highlightStyle="red"
                            />
                          </div>
                        </div>
                      ))}
                    </Carousel>
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无微震事件平面分布底图或事件数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} xl={11}>
              <Card title="各分区频次" bordered={false}>
                {statsData.length > 0 ? (
                  <EChart option={barOption} className="guest-screen-v2__plane-chart" />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分区统计数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={15}>
              <Card title="微震事件连续变化趋势" bordered={false}>
                <EChart option={variationOption} className="guest-screen-v2__wide-chart" />
              </Card>
            </Col>
            <Col xs={24} xl={9}>
              <Card title="区域能量占比" bordered={false}>
                {statsData.length > 0 ? (
                  <EChart option={pieOption} className="guest-screen-v2__wide-chart" />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分区能量数据" />
                )}
              </Card>
            </Col>
          </Row>
        </div>
      </Spin>
    </PageContainer>
  );
};

export default GuestScreenV2;
