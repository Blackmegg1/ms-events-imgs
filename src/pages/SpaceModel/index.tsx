import { deleteModel, getModelList } from '@/services/model/ModelController';
import { getProjectDist } from '@/services/project/ProjectController';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Popconfirm, Space } from 'antd';
import { useEffect, useRef, useState } from 'react';
import CreateForm from './component/CreateForm';
import PointManage from './component/PointManage';
import UpdateForm from './component/UpdateForm';

const SpaceModel: React.FC = () => {
  const [projectArr, setProjectArr] = useState([]);
  const [projectDist, setProjectDist] = useState([]);
  const [currentData, setCurrentData] = useState<any>({});
  const [createModalVisible, handleCreateVisible] = useState(false);
  const [updateModalVisible, handleUpdateVisible] = useState(false);
  const [pointDrawerVisible, handleDrawerVisible] = useState(false);

  const tableRef = useRef();
  const formRef = useRef();

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
      title: '模型名称',
      dataIndex: 'model_name',
      formItemProps: {
        rules: [
          {
            required: true,
            message: '模型名称为必填项',
          },
        ],
      },
    },
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
      title: '操作',
      hideInSearch: true,
      render: (_: any, record: any) => {
        return (
          <Space>
            <Button
              onClick={() => {
                setCurrentData(record);
                handleUpdateVisible(true);
              }}
              type="link"
            >
              修改模型
            </Button>
            <Button
              onClick={() => {
                setCurrentData(record);
                handleDrawerVisible(true);
              }}
              type="link"
            >
              点位管理
            </Button>
            <Popconfirm
              title="确认删除该模型？"
              description="此操作不可逆"
              onConfirm={async () => {
                const res = await deleteModel(record.model_id);
                console.log(res);
                tableRef.current.reload();
              }}
              okText="是"
              cancelText="否"
            >
              <Button type="link" danger>
                删除模型
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer ghost>
      <ProTable
        actionRef={tableRef}
        formRef={formRef}
        rowKey="model_id"
        search={{
          labelWidth: 120,
        }}
        columns={columns}
        request={async (params) => {
          const { list, success, total } = await getModelList({
            ...params,
            // @ts-ignore
          });
          return {
            data: list || [],
            success,
            total,
          };
        }}
        toolBarRender={() => [
          <Button
            key="1"
            type="primary"
            onClick={() => handleCreateVisible(true)}
          >
            新建模型
          </Button>,
        ]}
      />
      <CreateForm
        onCancel={() => {
          handleCreateVisible(false);
          tableRef.current.reload();
        }}
        modalVisible={createModalVisible}
        projectArr={projectArr}
      />
      <UpdateForm
        onCancel={() => {
          handleUpdateVisible(false);
          tableRef.current.reload();
        }}
        currentRecord={currentData}
        modalVisible={updateModalVisible}
        projectArr={projectArr}
      />
      <PointManage
        drawerVisible={pointDrawerVisible}
        onCancel={() => {
          handleDrawerVisible(false);
        }}
        currentRecord={currentData}
      />
    </PageContainer>
  );
};

export default SpaceModel;
