import { addEvent, getEventList } from '@/services/event/EventController';
import { getImgList } from '@/services/imgmag/ImgmagController';
import { getActiveProject, getProjectDist } from '@/services/project/ProjectController';
import { computerEvent } from '@/utils/pointSurfaceRegion';
import { getModelList } from '@/services/model/ModelController';
import { getLayerList } from '@/services/layer/LayerController';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  message,
  Checkbox,
  Radio,
  Switch,
} from 'antd';
import { useForm } from 'antd/es/form/Form';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import ColorScale, { getColor } from './components/ColorScales';
import CreateForm from './components/CreateForm';
import Planar from './components/Planar';

const { RangePicker } = DatePicker;

const Create = () => {
  const [projectArr, setProjectArr] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [imgList, setImgList] = useState([]);
  const [projectDist, setProjectDist] = useState([]);
  const [activeProjectDist, setActiveProjectDist] = useState({});
  const [byMag, setByMag] = useState(1);
  const [form] = Form.useForm();
  const [createEventForm] = useForm();
  const [lineCoordinate, setLineCoordinate] = useState<[number[]] | null>([[]]);
  const [createModalVisible, handleCreateVisible] = useState(false);
  const [highlightSettings, setHighlightSettings] = useState({
    threshold: 2000,
    enabled: false,
    style: 'red' as 'red' | 'arrow',
  });
  const [analysisZones, setAnalysisZones] = useState<any[]>([]);

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
      // const distArr: any = [];
      // response.forEach((project: { projectName: string; id: number }) => {
      //   distArr.push({ value: project.id, label: project.projectName });
      // });
      // setProjectArr(distArr);
      // return;
    }
    async function fetchActiveProjectDist() {
      const response = await getActiveProject();
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
      setActiveProjectDist(distObj);
      const distArr: any = [];
      response.forEach((project: { projectName: string; id: number }) => {
        distArr.push({ value: project.id, label: project.projectName });
      });
      setProjectArr(distArr);
      return;
    }
    fetchActiveProjectDist();
    fetchDist();
  }, []);

  const columns = [
    {
      title: '所属项目',
      dataIndex: 'project_id',
      formItemProps: {
        rules: [
          {
            required: true,
            message: '所属项目为必填项',
          },
        ],
      },
      valueEnum: projectDist,
    },
    {
      title: 'X坐标',
      dataIndex: 'loc_x',
      hideInSearch: true,
      formItemProps: {
        rules: [
          {
            required: true,
            message: 'X坐标为必填项',
          },
        ],
      },
    },
    {
      title: 'Y坐标',
      dataIndex: 'loc_y',
      hideInSearch: true,
      formItemProps: {
        rules: [
          {
            required: true,
            message: 'Y坐标为必填项',
          },
        ],
      },
    },
    {
      title: 'Z坐标',
      dataIndex: 'loc_z',
      hideInSearch: true,
      formItemProps: {
        rules: [
          {
            required: true,
            message: 'Z坐标为必填项',
          },
        ],
      },
    },
    {
      title: '能量(KJ)',
      dataIndex: 'energy',
      hideInSearch: true,
    },
    {
      title: '震级(M)',
      dataIndex: 'magnitude',
      hideInSearch: true,
    },
    {
      title: '发震日期段',
      dataIndex: 'timeRage',
      valueType: 'dateRange',
      hideInTable: true,
      hideInForm: true,
    },
    {
      title: '发震日期',
      dataIndex: 'time',
      valueType: 'date',
      search: false,
    },
  ];

  const getEvent = async (params: {
    timeRage: any[];
    project_id: any;
    analysis_zone?: number[];
  }) => {
    const formattedTimeRange = params.timeRage?.map((date) =>
      dayjs(date).format('YYYY-MM-DD'),
    );
    let { list } = await getEventList({
      pageSize: 999999,
      current: 1,
      timeBegin: formattedTimeRange[0] || null,
      timeEnd: formattedTimeRange[1] || null,
      project_id: params.project_id || null,
    });

    if (list && Array.isArray(params.analysis_zone) && params.analysis_zone.length > 0) {
      try {
        const allFilteredEvents = new Map();

        for (const zoneId of params.analysis_zone) {
          const zone = analysisZones.find(z => z.id === zoneId);
          if (zone) {
            const bottomZ = zone.layer_distance;
            const topZ = zone.layer_distance + zone.layer_depth;
            const filtered = await computerEvent(
              params.project_id,
              list,
              bottomZ,
              topZ,
            );
            filtered.forEach((ev: any) => {
              const key = ev.event_key || ev.id || `${ev.loc_x}-${ev.loc_y}-${ev.loc_z}-${ev.time}`;
              allFilteredEvents.set(key, ev);
            });
          }
        }
        list = Array.from(allFilteredEvents.values());
        console.log(`执行了多分区筛选，共有 ${list.length} 个事件`);
      } catch (error: any) {
        message.warning(`筛选执行出错：${error.message}`);
      }
    }

    if (list) {
      const updatedList = list.map((e) => {
        const color = getColor(+e.magnitude);
        return { ...e, color };
      });
      setEventList(updatedList);

      if (list.length) {
        message.success(`共有${list.length}个微震事件`);
      } else {
        message.error(`未找到微震事件`);
      }
    }
    return list;
  };

  const getImg = async (params: { project_id: number }) => {
    const { list } = await getImgList({
      pageSize: 1000,
      current: 1,
      project_id: params.project_id || null,
    });
    if (list) {
      setImgList(list);
    }
    return list;
  };

  const getByMag = (params: { project_id: number }) => {
    if (!projectDist) {
      return 1;
    } else {
      const currentProject = projectDist[params.project_id];
      console.log(currentProject, 'currentProject');
      return currentProject?.byMag;
    }
  };

  const NumberRangeInput = ({ value = [], onChange }) => {
    const [start, end] = value;

    const triggerChange = (changedValue: any[]) => {
      onChange?.([changedValue[0], changedValue[1]]);
    };

    const onStartChange = (newStart: any) => {
      triggerChange([newStart, end]);
    };

    const onEndChange = (newEnd: any) => {
      triggerChange([start, newEnd]);
    };

    return (
      <Space>
        <InputNumber
          value={start}
          onChange={onStartChange}
          placeholder="最小值"
        />
        ~
        <InputNumber value={end} onChange={onEndChange} placeholder="最大值" />
      </Space>
    );
  };

  return (
    <PageContainer
      header={{
        title: '平面分布图',
      }}
    >
      <Card>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="成图项目" name="project_id">
                <Select
                  options={projectArr}
                  placeholder="请选择"
                  onChange={async (projectId) => {
                    form.setFieldValue('analysis_zone', undefined);
                    setAnalysisZones([]);
                    try {
                      const { list: models } = await getModelList({ project_id: projectId });
                      if (models && models.length > 0) {
                        const modelId = models[models.length - 1].model_id;
                        const { list: layers } = await getLayerList({ model_id: modelId });
                        // 筛选出分析分区 (layer_type === 1)
                        const zones = layers.filter((l: any) => l.layer_type === 1);
                        setAnalysisZones(zones);
                      }
                    } catch (e) {
                      console.error('获取项目分区预设失败', e);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="分析分区预设（支持多选）" name="analysis_zone">
                <Select
                  mode="multiple"
                  placeholder="选择分析分区"
                  allowClear
                  options={analysisZones.map(z => ({ label: z.layer_name, value: z.id }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="事件时间段" name="timeRage">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="采线坐标组"
                name="line_coords"
                rules={[
                  {
                    pattern:
                      /^\s*\[\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\]\s*,\s*\[\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\]\s*$/,
                    message: '格式应为 [x1,y1],[x2,y2]',
                  },
                ]}
              >
                <Input placeholder="如：[100,200],[300,400]" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="highlightThreshold" label="高能事件阈值(J)" initialValue={2000}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="isHighlightEnabled" label="高能事件标记" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="highlightStyle" label="标记样式" initialValue="red">
                <Radio.Group optionType="button" buttonStyle="solid">
                  <Radio.Button value="red">红色标记</Radio.Button>
                  <Radio.Button value="arrow">箭头标注</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item>
                <Space>
                  <Button
                    onClick={() => {
                      form.resetFields();
                      setImgList([]);
                      setEventList([]);
                      setLineCoordinate(null);
                    }}
                  >
                    重置
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      const params = form.getFieldsValue();
                      console.log(params, 'params');
                      getEvent(params);
                      getImg(params);
                      setByMag(getByMag(params));
                      // 解析 coordinate 字符串
                      const coordStr = params.line_coords;
                      if (coordStr) {
                        try {
                          // 替换成标准 JSON 格式并解析
                          const formatted = `[${coordStr}]`.replace(
                            /(\d+)\s*,\s*(\d+)/g,
                            (_, a, b) => `${a.trim()},${b.trim()}`,
                          );
                          const parsed = JSON.parse(formatted);
                          if (
                            Array.isArray(parsed) &&
                            parsed.length === 2 &&
                            parsed.every(
                              (pair) =>
                                Array.isArray(pair) &&
                                pair.length === 2 &&
                                pair.every((n) => !isNaN(n)),
                            )
                          ) {
                            setLineCoordinate(parsed);
                          } else {
                            message.error('采线坐标格式错误');
                          }
                        } catch (e) {
                          message.error('采线坐标解析失败');
                        }
                      }
                      setHighlightSettings({
                        threshold: params.highlightThreshold || 2000,
                        enabled: params.isHighlightEnabled || false,
                        style: params.highlightStyle || 'red',
                      });
                    }}
                  >
                    成图
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      const params = form.getFieldsValue();
                      console.log(params, 'params');
                      handleCreateVisible(true);
                    }}
                  >
                    新建事件
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
      {
        eventList.length > 0
          ? imgList.map((img: any) => {
            // img中img_blob为base64格式，已在后端处理
            return (
              <Card
                key={img.name}
                title={img.name}
                style={{ marginBottom: '20px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                  }}
                >
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
                    eventList={eventList}
                    lineCoordinate={lineCoordinate}
                    byMag={byMag}
                    highlightThreshold={highlightSettings.threshold}
                    isHighlightEnabled={highlightSettings.enabled}
                    highlightStyle={highlightSettings.style}
                  />
                  <div style={{ maxHeight: '300px' }}>
                    <ColorScale title="微震震级(M)" />
                  </div>
                </div>
              </Card>
            );
          })
          : null
      }
      <CreateForm
        onCancel={() => {
          handleCreateVisible(false);
        }}
        modalVisible={createModalVisible}
        onOk={async () => {
          const value = createEventForm.getFieldsValue();
          const project_id = Number(value.project_id);
          const loc_x = Number(value.loc_x);
          const loc_y = Number(value.loc_y);
          const loc_z = Number(value.loc_z);
          const energy = Number(value.energy);
          const magnitude = Number(value.magnitude);
          const time = value.time;
          const success = await addEvent({
            project_id,
            loc_x,
            loc_y,
            loc_z,
            energy,
            magnitude,
            time,
          });
          if (success) {
            handleCreateVisible(false);
            const params = form.getFieldsValue();
            console.log(params, 'params');
            getEvent(params);
            getImg(params);
            setByMag(getByMag(params));
          }
          return;
        }}
      >
        <ProTable
          rowKey="id"
          type="form"
          form={{
            form: createEventForm,
            submitter: false,
            layout: 'horizontal',
            initialValues: {},
          }}
          columns={columns}
        />
      </CreateForm>
    </PageContainer >
  );
};

export default Create;
