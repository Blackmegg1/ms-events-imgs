import { getEventList } from '@/services/event/EventController';
import { getLayerList } from '@/services/layer/LayerController';
import { getCompass, getModelList } from '@/services/model/ModelController';
import { getPointList } from '@/services/point/PointController';
import { getProjectDist } from '@/services/project/ProjectController';
import { computerEvent } from '@/utils/pointSurfaceRegion';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Row,
  Select,
  Space,
  Switch,
  message,
} from 'antd';
import dayjs from 'dayjs';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';

import Scene from './components/Scene';

const { RangePicker } = DatePicker;

interface Points {
  point_name: string;
  point_x: number;
  point_y: number;
  point_z: number;
}

interface Events {
  loc_x: number;
  loc_y: number;
  loc_z: number;
  magnitude: number;
  energy?: number;
}

interface Layers {
  layer_depth: number;
  layer_color: string;
  layer_name: string;
  layer_distance: number;
  id: number;
  layer_type?: number;
}

const ModelShow = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const [projectDist, setProjectDist] = useState([]);
  const [projectArr, setProjectArr] = useState<any[]>([]);
  const [modelArr, setModelArr] = useState([]);
  const [points, setPoints] = useState([]);
  const [events, setEvents] = useState<Events[]>([]);
  const [layers, setLayers] = useState<Layers[]>([]);
  const [compass, setCompass] = useState<any>(null);
  const [fullModelList, setFullModelList] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisZones, setAnalysisZones] = useState<Layers[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    async function fetchDist() {
      const response = await getProjectDist();
      const distObj: any = {};
      response.forEach(
        (project: { projectName: string; id: number; by_mag: number }) => {
          distObj[project.id] = {
            text: project.projectName,
            status: project.projectName,
            byMag: project['by_mag'],
          };
        },
      );
      setProjectDist(distObj);
      const distArr: any = [];
      response.forEach((project: { projectName: string; id: number }) => {
        distArr.push({ value: project.id, label: project.projectName });
      });
      setProjectArr(distArr);
      return;
    }
    fetchDist();
  }, []);

  return (
    <PageContainer
      header={{
        title: '工作面模型',
      }}
    >
      <Card bodyStyle={{ padding: '16px' }}>
        <Form layout="horizontal" form={form}>
          <Row>
            <Space>
              <Form.Item label="成图项目" name="project_id">
                <Select
                  options={projectArr}
                  style={{ width: 200 }}
                  placeholder="请选择"
                  onChange={async (value) => {
                    form.setFieldsValue({ model_id: null });
                    const response = await getModelList({ project_id: value });
                    const modelList = response.list;
                    setFullModelList(modelList);
                    const distArr: any = [];
                    modelList.forEach(
                      (model: { model_id: number; model_name: string }) => {
                        distArr.push({
                          value: model.model_id,
                          label: model.model_name,
                        });
                      },
                    );
                    setModelArr(distArr);
                    if (distArr.length > 0) {
                      form.setFieldsValue({ model_id: distArr[0].value });
                      // 同时获取该模型的分析分区
                      try {
                        const { list: layers } = await getLayerList({
                          model_id: distArr[0].value,
                        });
                        setAnalysisZones(
                          layers.filter((l: any) => l.layer_type === 1),
                        );
                      } catch (e) {
                        console.error('获取分区预设失败', e);
                      }
                    }
                  }}
                />
              </Form.Item>
              <Form.Item label="成图模型" name="model_id">
                <Select
                  options={modelArr}
                  style={{ width: 200 }}
                  placeholder="请选择"
                />
              </Form.Item>
              <Form.Item label="展示分析层位" valuePropName="checked">
                <Switch
                  checked={showAnalysis}
                  onChange={(checked) => setShowAnalysis(checked)}
                />
              </Form.Item>
              <Form.Item label="分析分区预设" name="analysis_zone">
                <Select
                  mode="multiple"
                  placeholder="选择分析分区(可选)"
                  style={{ width: 250 }}
                  allowClear
                  options={analysisZones.map((z) => ({
                    label: z.layer_name,
                    value: z.id,
                  }))}
                />
              </Form.Item>
            </Space>
          </Row>
          <Row>
            <Space>
              <Form.Item label="事件时间段" name="timeRage">
                <RangePicker />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    onClick={() => {
                      form.resetFields();
                      setEvents([]);
                      setPoints([]);
                      setCsvData([]);
                    }}
                  >
                    重置
                  </Button>
                  <Button
                    type="primary"
                    onClick={async () => {
                      const params = form.getFieldsValue();

                      if (!params.model_id) {
                        message.error('没有选择模型！');
                        return;
                      }
                      const { list: points } = await getPointList({
                        model_id: params.model_id,
                      });

                      const selectedModel = fullModelList.find(
                        (m) => m.model_id === params.model_id,
                      );
                      if (selectedModel?.csv_path) {
                        try {
                          const csvRes = await fetch(selectedModel.csv_path);
                          const csvText = await csvRes.text();
                          Papa.parse(csvText, {
                            header: true,
                            dynamicTyping: true,
                            skipEmptyLines: true,
                            complete: (results: Papa.ParseResult<any>) => {
                              const fields = results.meta.fields || [];
                              const findField = (n: string) =>
                                fields.find(
                                  (f) => f.trim().toUpperCase() === n,
                                );
                              const cX = findField('X');
                              const cY = findField('Y');
                              const cZ = findField('Z');

                              if (cX && cY && cZ) {
                                const parsedData = results.data
                                  .map((d: any) => ({
                                    x: d[cX],
                                    y: d[cY],
                                    z: d[cZ],
                                  }))
                                  .filter(
                                    (d: any) =>
                                      typeof d.x === 'number' &&
                                      typeof d.y === 'number' &&
                                      typeof d.z === 'number',
                                  );
                                setCsvData(parsedData);
                              }
                            },
                          });
                        } catch (e) {
                          console.error('Failed to load CSV:', e);
                        }
                      } else {
                        setCsvData([]);
                      }

                      if (points.length < 3 && !selectedModel?.csv_path) {
                        messageApi.error(
                          '模型的基准点位少于3个且未上传CSV数据！',
                        );
                        return;
                      }
                      setPoints(points);

                      // 如果选择了事件时间段，则展示事件
                      if (params.timeRage?.[0] && params.timeRage?.[1]) {
                        const formattedTimeRange = params.timeRage?.map(
                          (date: any) => dayjs(date).format('YYYY-MM-DD'),
                        );
                        const { list: eventList } = await getEventList({
                          current: 1,
                          pageSize: 999999, // 调大以获取完整数据进行筛选
                          timeBegin: formattedTimeRange?.[0] || null,
                          timeEnd: formattedTimeRange?.[1] || null,
                          project_id: params.project_id || null,
                        });

                        let finalEvents = eventList;
                        // 如果选择了分析分区，进行筛选
                        if (
                          params.analysis_zone &&
                          params.analysis_zone.length > 0
                        ) {
                          try {
                            const allFilteredEvents = new Map();
                            for (const zoneId of params.analysis_zone) {
                              const zone = analysisZones.find(
                                (z) => z.id === zoneId,
                              );
                              if (zone) {
                                const filtered = await computerEvent(
                                  params.project_id,
                                  eventList,
                                  zone.layer_distance - zone.layer_depth,
                                  zone.layer_distance,
                                );
                                filtered.forEach((ev: any) => {
                                  const key =
                                    ev.event_key ||
                                    ev.id ||
                                    `${ev.loc_x}-${ev.loc_y}-${ev.loc_z}-${ev.time}`;
                                  allFilteredEvents.set(key, ev);
                                });
                              }
                            }
                            finalEvents = Array.from(
                              allFilteredEvents.values(),
                            );
                            message.info(`分区筛选后剩余 ${finalEvents.length} 个事件`);
                          } catch (error: any) {
                            message.warning(`筛选执行出错：${error.message}`);
                          }
                        }

                        setEvents(finalEvents);
                      }

                      const { list: layers } = await getLayerList({
                        model_id: params.model_id,
                      });
                      if (layers.length > 0) {
                        setLayers(layers);
                      }

                      const responseCompass: any = await getCompass(
                        params.model_id,
                      );
                      const compassData = responseCompass.compass;
                      if (compassData[0]?.show_compass) {
                        setCompass({
                          start: compassData[0].compass_start.split(','),
                          end: compassData[0].compass_end.split(','),
                        } as any);
                      }
                    }}
                  >
                    成图
                  </Button>
                </Space>
              </Form.Item>
            </Space>
          </Row>
        </Form>
      </Card>
      {points.length > 0 || csvData.length > 0 ? (
        <Card>
          <div style={{ width: '100%', height: '70vh', minHeight: '600px' }}>
            <Scene
              points={points}
              events={events}
              layers={layers}
              compass={compass}
              csvData={csvData}
              showAnalysis={showAnalysis}
            />
          </div>
        </Card>
      ) : null}
      {contextHolder}
    </PageContainer>
  );
};

export default ModelShow;
