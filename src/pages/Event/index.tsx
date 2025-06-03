import eventServices from '@/services/event';
import projectServices from '@/services/project';
import { createAffineTransform2D } from '@/utils';
import {
  FooterToolbar,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Form, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import BatchImport from './components/BatchImport';
import CreateForm from './components/CreateForm';

const { getEventList, addEvent, batchDeleteEvents } =
  eventServices.EventController;
const { getProjectDist, getActiveProject } = projectServices.ProjectController;

const Event: React.FC = () => {
  const [form] = Form.useForm();
  const [createModalVisible, handleCreateVisible] = useState(false);
  const [batchModalVisible, handleBatchVisible] = useState(false);
  const [selectedRowsState, setSelectedRows] = useState([]);
  const [projectDist, setProjectDist] = useState({});
  const [activeProjectDist, setActiveProjectDist] = useState({});

  const tableRef = useRef();
  const formRef = useRef();

  useEffect(() => {
    // 获取路由参数
    const params = new URLSearchParams(location.search);
    const projectId = params.get('project_id');
    if (projectId) {
      formRef.current?.setFieldsValue({ project_id: projectId });
      formRef.current?.submit();
    }
  }, []);

  useEffect(() => {
    async function fetchDist() {
      const response = await getProjectDist();
      const distObj: any = {};
      response.forEach((project: { projectName: string; id: number }) => {
        distObj[project.id] = {
          text: project.projectName,
          status: project.projectName,
        };
      });
      setProjectDist(distObj);
      return;
    }
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

  // 批量导出
  const handleBatchExport = async () => {
    // @ts-ignore
    const formParams = formRef.current?.getFieldsValue(true);
    if (!formParams.timeRage) {
      message.warning('请输入数据时间段！');
      return;
    }
    if (!formParams.project_id) {
      message.warning('请选择所属工程！');
      return;
    }
    const formattedTimeRange = formParams.timeRage?.map(
      (date: string | number | dayjs.Dayjs | Date | null | undefined) =>
        dayjs(date).format('YYYY-MM-DD'),
    );
    const { list } = await getEventList({
      pageSize: 999999,
      current: 1,
      // @ts-ignore
      timeBegin: formattedTimeRange?.[0] || null,
      timeEnd: formattedTimeRange?.[1] || null,
      project_id: formParams.project_id || null,
    });

    // 定义标题行
    let csvHeader = '发震时刻,x,y,z,能量(KJ),震级(M)';

    // 将对象数组转换为CSV行
    const csvRows = list.map(
      (obj: {
        loc_x: number;
        loc_y: number;
        loc_z: number;
        energy: number;
        magnitude: number;
        time: string;
      }) => {
        let { loc_x, loc_y, loc_z, energy, magnitude, time } = obj;
        let formattedTime = dayjs(time).format('YYMMDD');

        // 如果是 project_id === 40，执行坐标转换
        if (formParams.project_id === '40') {
          csvHeader = '发震时刻,x,y,z,能量(J),震级(M)';
          formattedTime = dayjs(time).format('YYYY/MM/DD HH:mm');
          energy = energy * 1000;

          const systemRef = { x: 492.79, y: 232 };
          const geoRef = { x: 85356.99, y: 32827.14 };
          const systemOrigin = { x: 0, y: 0 };
          const geoOrigin = { x: 85880.06, y: 32979.52 };

          // 创建转换函数
          const convertToGeodetic2000 = createAffineTransform2D(
            systemRef,
            geoRef,
            systemOrigin,
            geoOrigin,
          );

          // 使用：转换任意点
          const result = convertToGeodetic2000(loc_x, loc_y, loc_z);
          loc_x = Number(result.x.toFixed(2));
          loc_y = Number(result.y.toFixed(2));
          loc_z = Number(result.z.toFixed(2));
        }

        return `${formattedTime},${loc_x},${loc_y},${loc_z},${energy},${magnitude}`;
      },
    );

    // 将标题行和数据行组合成CSV数据
    const csvData = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    // @ts-ignore
    const projectName = projectDist[formParams.project_id]?.text;
    const fileName = `${projectName} ${formattedTimeRange?.[0]}~${formattedTimeRange?.[1]}.csv`;

    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageContainer
      header={{
        title: '事件管理',
      }}
    >
      <ProTable
        actionRef={tableRef}
        formRef={formRef}
        rowKey="event_key"
        search={{
          labelWidth: 120,
        }}
        columns={columns}
        toolBarRender={() => [
          <Button
            key="1"
            type="primary"
            onClick={() => handleCreateVisible(true)}
          >
            新建事件
          </Button>,
          <Button
            key="2"
            type="primary"
            onClick={() => handleBatchVisible(true)}
          >
            批量导入
          </Button>,
          <Button key="3" type="default" onClick={() => handleBatchExport()}>
            批量导出
          </Button>,
        ]}
        rowSelection={{
          onChange: (_, selectedRows) =>
            setSelectedRows(selectedRows.map((row) => row?.event_key)),
        }}
        request={async (params) => {
          const { list, success, total } = await getEventList({
            pageSize: params.pageSize,
            current: params.current,
            timeBegin: params.timeRage?.[0] || null,
            timeEnd: params.timeRage?.[1] || null,
            project_id: params.project_id || null,
            // @ts-ignore
          });
          return {
            data: list || [],
            success,
            total,
          };
        }}
      />
      <CreateForm
        onCancel={() => {
          handleCreateVisible(false);
          tableRef.current.reload();
        }}
        onOk={async () => {
          const value = form.getFieldsValue();
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
            if (tableRef.current) {
              tableRef.current.reload();
            }
          }
          return;
        }}
        modalVisible={createModalVisible}
      >
        <ProTable
          rowKey="id"
          type="form"
          form={{
            form: form,
            submitter: false,
            layout: 'horizontal',
            initialValues: {},
          }}
          columns={columns}
        />
      </CreateForm>
      <BatchImport
        modalVisible={batchModalVisible}
        onCancel={() => {
          handleBatchVisible(false);
          tableRef.current.reload();
        }}
        onOk={() => {
          handleBatchVisible(false);
          tableRef.current.reload();
        }}
        projectDist={activeProjectDist}
      />
      {selectedRowsState?.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              已选择{' '}
              <a style={{ fontWeight: 600 }}>{selectedRowsState.length}</a>{' '}
              项&nbsp;&nbsp;
            </div>
          }
        >
          <Button
            danger
            onClick={async () => {
              const success = await batchDeleteEvents(selectedRowsState);
              if (success) {
                setSelectedRows([]);
                tableRef.current?.reloadAndRest?.();
                message.success('事件删除成功');
              }
            }}
          >
            批量删除
          </Button>
        </FooterToolbar>
      )}
    </PageContainer>
  );
};

export default Event;
