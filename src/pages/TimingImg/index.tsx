import { getEventList } from '@/services/event/EventController';
import { getProjectDist } from '@/services/project/ProjectController';
import { computerEvent } from '@/utils/pointSurfaceRegion';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  DatePicker,
  Form,
  message,
  Row,
  Select,
  Space,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import DailyAverageEnergyChart from './components/DailyAverageEnergyChart';
import DailyEnergyChart from './components/DailyEnergyChart';
import DailyFrequencyChart from './components/DailyFrequencyChart';
import DailyMaxEnergyChart from './components/DailyMaxEnergyChart';

const { RangePicker } = DatePicker;

const TimingImg = () => {
  const [form] = Form.useForm();
  const [projectArr, setProjectArr] = useState([]);
  const [projectDist, setProjectDist] = useState([]);
  const [eventList, setEventList] = useState([]);

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

  const getEvent = async (params: {
    timeRage: any[];
    project_id: any;
    z_range: any[];
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
    if (list) {
      // 调用三维模型数据，对事件进行分层筛选
      if (
        Array.isArray(params.z_range) &&
        params.z_range.length === 2 &&
        typeof params.z_range[0] === 'number' &&
        typeof params.z_range[1] === 'number' &&
        !isNaN(params.z_range[0]) &&
        !isNaN(params.z_range[1])
      ) {
        try {
          const filterList = await computerEvent(
            params.project_id,
            list,
            params.z_range[0],
            params.z_range[1],
          );
          list = filterList;
          console.log('执行了分层筛选');
        } catch (error: any) {
          message.warning(`未执行分层筛选：${error.message}`);
        }
      }

      setEventList(list); // 更新list

      if (list.length) {
        message.success(`共有${list.length}个微震事件`);
      } else {
        message.error(`未找到微震事件`);
      }
    }
    return list;
  };

  return (
    <PageContainer
      header={{
        title: '微震时序成图',
      }}
    >
      <Card>
        <Form layout="inline" form={form}>
          <Row>
            <Space>
              <Form.Item label="成图项目" name="project_id">
                <Select
                  options={projectArr}
                  style={{ width: 220 }}
                  placeholder="请选择"
                />
              </Form.Item>
              <Form.Item label="事件时间段" name="timeRage">
                <RangePicker />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    onClick={() => {
                      form.resetFields();
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
                    }}
                  >
                    成图
                  </Button>
                </Space>
              </Form.Item>
            </Space>
          </Row>
          <Row></Row>
        </Form>
      </Card>
      {eventList.length > 0 ? (
        <div>
          <DailyEnergyChart events={eventList} />
          <DailyFrequencyChart events={eventList} />
          <DailyAverageEnergyChart events={eventList} />
          <DailyMaxEnergyChart events={eventList} />
        </div>
      ) : null}
    </PageContainer>
  );
};

export default TimingImg;
