import { addEvent, getEventList } from '@/services/event/EventController';
import { getImgList } from '@/services/imgmag/ImgmagController';
import { getProjectDist } from '@/services/project/ProjectController';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Card, DatePicker, Form, Select, Space, message } from 'antd';
import { useForm } from 'antd/es/form/Form';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import ColorScale, { getColor } from './components/ColorScale';
import CreateForm from './components/CreateForm';
import Planar from './components/Planar';

const { RangePicker } = DatePicker;

const Create = () => {
  const [projectArr, setProjectArr] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [imgList, setImgList] = useState([]);
  const [projectDist, setProjectDist] = useState([]);
  const [byMag, setByMag] = useState(1);
  const [form] = Form.useForm();
  const [createEventForm] = useForm();
  const [createModalVisible, handleCreateVisible] = useState(false);

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

  const getEvent = async (params: { timeRage: any[]; project_id: any }) => {
    const formattedTimeRange = params.timeRage.map((date) =>
      dayjs(date).format('YYYY-MM-DD'),
    );
    const { list } = await getEventList({
      pageSize: 999999,
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

  const getByMag = (params: { project_id: number }) => {
    if (!projectDist) {
      return 1;
    } else {
      const currentProject = projectDist[params.project_id];
      console.log(currentProject, 'currentProject');
      return currentProject?.byMag;
    }
  };

  return (
    <PageContainer
      header={{
        title: '平面分布图',
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
                    setByMag(getByMag(params));
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
                    byMag={byMag}
                  />
                  <ColorScale />
                </div>
              </Card>
            );
          })
        : null}
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
    </PageContainer>
  );
};

export default Create;
