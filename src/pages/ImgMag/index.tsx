import imgmagServices from '@/services/imgmag';
import projectServices from '@/services/project';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Modal, Popconfirm, Space } from 'antd';
import { useEffect, useRef, useState } from 'react';
import CreateForm from './components/CreateForm';
import UpdateForm from './components/UpdataForm';

const { getProjectDist, getActiveProject } = projectServices.ProjectController;
const { getImgList, deleteImg } = imgmagServices.ImgmagController;

const handlePreviewImage = (base64Img: string) => {
  // 显示 Modal
  Modal.info({
    icon: null,
    title: '底图预览',
    content: (
      <div>
        <img
          src={`data:image/png;base64,${base64Img}`}
          alt="预览图"
          style={{ maxWidth: '100%', maxHeight: '80vh' }}
        />
      </div>
    ),
    width: '1080px',
    okText: '关闭',
    maskClosable: true,
  });
};

const ImgMag: React.FC = () => {
  const [projectDist, setProjectDist] = useState({});
  const [activeProjectDist, setActiveProjectDist] = useState({});
  const [createModalVisible, handleCreateVisible] = useState(false);
  const [updateModalVisible, handleUpdateVisible] = useState(false);
  const [currentData, setCurrentData] = useState({});
  const tableRef = useRef();
  const formRef = useRef();

  useEffect(() => {
    // 获取路由参数
    const params = new URLSearchParams(location.search);
    const projectId = params.get('project_id');
    if (projectId) {
      formRef.current?.setFieldsValue({ project_id: projectId });
      formRef.current.submit();
    }
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
      fieldProps: {
        options: Object.keys(activeProjectDist).map((key) => ({
          label: activeProjectDist[key].text,
          value: Number(key),
        })),
      },
    },
    {
      title: '底图名称',
      dataIndex: 'name',
      hideInSearch: true,
      formItemProps: {
        rules: [
          {
            required: true,
            message: '底图名称为必填项',
          },
        ],
      },
    },
    {
      title: '法向轴',
      dataIndex: 'norm_axis',
      hideInSearch: true,
      formItemProps: {
        rules: [
          {
            required: true,
            message: '法向轴为必填项',
          },
        ],
      },
      valueEnum: {
        x: 'x',
        y: 'y',
        z: 'z',
      },
    },
    {
      title: 'X最小值',
      dataIndex: 'min_x',
      hideInSearch: true,
    },
    {
      title: 'X最大值',
      dataIndex: 'max_x',
      hideInSearch: true,
    },
    {
      title: 'Y最小值',
      dataIndex: 'min_y',
      hideInSearch: true,
    },
    {
      title: 'Y最大值',
      dataIndex: 'max_y',
      hideInSearch: true,
    },
    {
      title: 'Z最小值',
      dataIndex: 'min_z',
      hideInSearch: true,
    },
    {
      title: 'Z最大值',
      dataIndex: 'max_z',
      hideInSearch: true,
    },
    {
      title: '左偏移',
      dataIndex: 'left_margin',
      hideInSearch: true,
    },
    {
      title: '上偏移',
      dataIndex: 'top_margin',
      hideInSearch: true,
    },
    {
      title: '操作',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button
            onClick={() => handlePreviewImage(record.img_blob)}
            type="link"
          >
            预览
          </Button>
          <Button
            type="link"
            onClick={() => {
              setCurrentData(record);
              handleUpdateVisible(true);
            }}
          >
            修改
          </Button>
          <Popconfirm
            title="确认删除该底图？"
            description="此操作不可逆"
            onConfirm={async () => {
              const res = await deleteImg(record.project_id, record.name);
              console.log(res);
              tableRef.current.reload();
            }}
            okText="是"
            cancelText="否"
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
    async function fetchActiveDist() {
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
    fetchDist();
    fetchActiveDist();
  }, []);

  return (
    <PageContainer
      header={{
        title: '底图管理',
      }}
    >
      <ProTable
        actionRef={tableRef}
        formRef={formRef}
        rowKey={(record) => `${record['project_id']}-${record.name}`}
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
            新建底图
          </Button>,
        ]}
        request={async (params) => {
          const { list, success, total } = await getImgList({
            ...params,
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
          handleCreateVisible(false);
          if (tableRef.current) {
            tableRef.current.reload();
          }
        }}
        modalVisible={createModalVisible}
        projectDist={activeProjectDist}
      />
      <UpdateForm
        onCancel={() => {
          handleUpdateVisible(false);
          tableRef.current.reload();
        }}
        onOk={async () => {
          handleUpdateVisible(false);
          if (tableRef.current) {
            tableRef.current.reload();
          }
        }}
        modalVisible={updateModalVisible}
        projectDist={projectDist}
        currentData={currentData}
      />
    </PageContainer>
  );
};

export default ImgMag;
