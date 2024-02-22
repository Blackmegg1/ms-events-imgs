import imgmagServices from '@/services/imgmag';
import projectServices from '@/services/project';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';
import CreateForm from './components/CreateForm';

const { getProjectDist } = projectServices.ProjectController;
const { getImgList } = imgmagServices.ImgmagController;

const handlePreviewImage = (base64Img) => {
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
  const [createModalVisible, handleCreateVisible] = useState(false);
  const tableRef = useRef();
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
      title: '底图',
      hideInSearch: true,
      render: (_, record) => (
        <Button onClick={() => handlePreviewImage(record.img_blob)} type="link">
          预览
        </Button>
      ),
    },
  ];

  useEffect(() => {
    async function fetchDist() {
      const response = await getProjectDist();
      console.log(response);
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
    fetchDist();
  }, []);

  return (
    <PageContainer
      header={{
        title: '底图管理',
      }}
    >
      <ProTable
        actionRef={tableRef}
        rowKey="name"
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
          const success = true;
          if (success) {
            handleCreateVisible(false);
            if (tableRef.current) {
              tableRef.current.reload();
            }
          }
          return;
        }}
        modalVisible={createModalVisible}
        projectDist={projectDist}
      />
    </PageContainer>
  );
};

export default ImgMag;
