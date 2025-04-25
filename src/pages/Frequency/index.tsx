import { getEventList } from '@/services/event/EventController';
import { getImgList } from '@/services/imgmag/ImgmagController';
import { getActiveProject } from '@/services/project/ProjectController';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  DatePicker,
  Form,
  InputNumber,
  Select,
  Space,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import Planar from './components/Planar';

const { RangePicker } = DatePicker;

const Frequency = () => {
  const [projectArr, setProjectArr] = useState([]);
  const [activeProjectDist, setActiveProjectDist] = useState({});

  const [form] = Form.useForm();
  const [eventList, setEventList] = useState([]);
  const [imgList, setImgList] = useState([]);
  const [divide, setDivide] = useState(10);

  useEffect(() => {
    async function fetchActiveProjectDist() {
      const response = await getActiveProject();
      const distObj: any = {};
      response.forEach((project: { projectName: string; id: number }) => {
        distObj[project.id] = {
          text: project.projectName,
          status: project.projectName,
        };
      });
      setActiveProjectDist(distObj);
      const distArr: any = [];
      response.forEach((project: { projectName: string; id: number }) => {
        distArr.push({ value: project.id, label: project.projectName });
      });
      setProjectArr(distArr);
      return;
    }
    fetchActiveProjectDist();
  }, []);

  const getEvent = async (params: { timeRage: any[]; project_id: any }) => {
    const formattedTimeRange = params.timeRage?.map((date) =>
      dayjs(date).format('YYYY-MM-DD'),
    );
    const { list } = await getEventList({
      pageSize: 999999,
      current: 1,
      timeBegin: formattedTimeRange?.[0] || null,
      timeEnd: formattedTimeRange?.[1] || null,
      project_id: params.project_id || null,
    });
    if (list) {
      setEventList(list); // 更新list
      if (list.length) {
        message.success(`当前时间段共有${list.length}个微震事件`);
      } else {
        message.error(`当前时间段未找到微震事件`);
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

  return (
    <PageContainer
      header={{
        title: '频次密度图',
      }}
    >
      <Card>
        <Form layout="inline" form={form}>
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
            <Form.Item label="网格大小" name="divide">
              <InputNumber
                style={{ width: 100 }}
                addonAfter="米"
                defaultValue={10}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setImgList([]);
                    setEventList([]);
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
                    setDivide(params.divide);
                  }}
                >
                  成图
                </Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      </Card>
      {eventList.length > 0
        ? imgList.map((img: any) => {
            // img中img_blob为base64格式，已在后端处理
            return (
              <Planar
                key={img.name}
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
                divide={divide}
              />
            );
          })
        : null}
    </PageContainer>
  );
};

export default Frequency;
