import { getEventList } from '@/services/event/EventController';
import { getImgList } from '@/services/imgmag/ImgmagController';
import { getProjectDist } from '@/services/project/ProjectController';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, DatePicker, Form, Select, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import ColorScale, { getColor } from './components/ColorScale';
import Planar from './components/Planar';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const Create = () => {
  const [projectArr, setProjectArr] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [imgList, setImgList] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    async function fetchDist() {
      const response = await getProjectDist();
      console.log(response);
      const distArr: any = [];
      response.forEach((project: { projectName: string; id: number }) => {
        distArr.push({ value: project.id, label: project.projectName });
      });
      setProjectArr(distArr);
      return;
    }
    fetchDist();
  }, []);

  const getEvent = async (params: { timeRage: any[]; project_id: any }) => {
    debugger;
    const formattedTimeRange = params.timeRage.map(date => dayjs(date).format('YYYY-MM-DD'));
    const { list } = await getEventList({
      pageSize: 1000,
      current: 1,
      timeBegin: formattedTimeRange[0] || null,
      timeEnd: formattedTimeRange[1] || null,
      project_id: params.project_id || null,
    });
    if (list) {
      const updatedList = list.map((e) => {
        const color = getColor(+e.magnitude);
        return { ...e, color }; // 添加color属性并返回新的对象
      });
      setEventList(updatedList); // 更新list
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
        title: '事件成图',
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
                  />
                  <ColorScale />
                </div>
              </Card>
            );
          })
        : null}
    </PageContainer>
  );
};

export default Create;
