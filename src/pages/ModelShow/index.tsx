import { getEventList } from '@/services/event/EventController';
import { getModelList } from '@/services/model/ModelController';
import { getPointList } from '@/services/point/PointController';
import { getProjectDist } from '@/services/project/ProjectController';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, DatePicker, Form, message, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import Scene from './components/Scene';

const { RangePicker } = DatePicker;

interface Points {
  point_name: string;
  point_x: number;
  point_y: number;
  point_z: number;
}
[];

interface Events {
  loc_x: number;
  loc_y: number;
  loc_z: number;
}
[];

const ModelShow = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const [projectDist, setProjectDist] = useState([]);
  const [projectArr, setProjectArr] = useState<Points | []>([]);
  const [modelArr, setModelArr] = useState([]);
  const [points, setPoints] = useState([]);
  const [events, setEvents] = useState<Events | []>([]);

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
      <Card>
        <Form layout="inline" form={form}>
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
            <Form.Item label="事件时间段" name="timeRage">
              <RangePicker />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button>重置</Button>
                <Button
                  type="primary"
                  onClick={async () => {
                    const params = form.getFieldsValue();
                    const { list: points } = await getPointList({
                      model_id: params.model_id,
                    });
                    if (points.length < 3) {
                      messageApi.error('模型的基准点位少于3个！');
                      return;
                    }
                    // 如果选择了事件时间段，则展示事件
                    if (params.timeRage?.[0] && params.timeRage?.[1]) {
                      const formattedTimeRange = params.timeRage?.map(
                        (date: any) => dayjs(date).format('YYYY-MM-DD'),
                      );
                      const { list: eventList } = await getEventList({
                        current: 1,
                        pageSize: 4000,
                        timeBegin: formattedTimeRange?.[0] || null,
                        timeEnd: formattedTimeRange?.[1] || null,
                        project_id: params.project_id || null,
                      });
                      console.log(eventList);

                      setEvents(eventList);
                    }
                    setPoints(points);
                    console.log(params);
                  }}
                >
                  成图
                </Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      </Card>
      {points.length > 0 ? (
        <Card>
          <Scene points={points} events={events} />
        </Card>
      ) : null}
      {contextHolder}
    </PageContainer>
  );
};

export default ModelShow;
