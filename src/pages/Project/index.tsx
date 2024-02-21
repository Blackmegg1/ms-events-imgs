import services from '@/services/project';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Space } from 'antd';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import CreateForm from './component/CreateForm';
import EditForm from './component/EditForm';
import styles from './index.less';

const { getProjectList } = services.ProjectController;

const HomePage: React.FC = () => {
  const [createModalVisible, handleCreateVisible] = useState<boolean>(false);
  const [editModalVisible, handleEditVisible] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'projectName',
      formItemProps: {
        rules: [
          {
            required: true,
            message: '名称为必填项',
          },
        ],
      },
    },
    {
      title: '更新时间',
      dataIndex: 'initTime',
      valueType: 'string',
      render: (_: any, record: any) => {
        return dayjs(record.initTime).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: '操作',
      width: '300px',
      render: (_: any, record: any) => {
        return (
          <Space>
            <Button
              type="link"
              onClick={() => {
                setCurrentRecord(record);
                handleEditVisible(true);
              }}
            >
              编辑
            </Button>
            <Button type="link">底图管理</Button>
            <Button type="link">事件管理</Button>
          </Space>
        );
      },
    },
  ];
  const tableRef = useRef();

  return (
    <PageContainer ghost>
      <div className={styles.container}>
        <ProTable
          actionRef={tableRef}
          rowKey="id"
          search={false}
          columns={columns}
          toolBarRender={() => [
            <Button
              key="1"
              type="primary"
              onClick={() => handleCreateVisible(true)}
            >
              新建项目
            </Button>,
          ]}
          request={async (params) => {
            const { list, success, total } = await getProjectList({
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
          modalVisible={createModalVisible}
        />
        <EditForm
          currentRecord={currentRecord}
          onCancel={() => {
            handleEditVisible(false);
            tableRef.current.reload();
          }}
          modalVisible={editModalVisible}
        />
      </div>
    </PageContainer>
  );
};

export default HomePage;
