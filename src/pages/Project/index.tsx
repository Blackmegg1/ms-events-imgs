import { batchDeleteProjectEvents } from '@/services/event/EventController';
import services from '@/services/project';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Button, Popconfirm, Space, message, Tag } from 'antd';
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
      render: (_: any, record: any) => (
        <span>
          {record.projectName}
          {record.is_finished === 1 && <Tag color='green' style={{ marginLeft: 8 }}>已完成</Tag>}
        </span>
      ),
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
      title: '事件点尺寸',
      dataIndex: 'by_mag',
      render: (_: any, record: any) => {
        if (record.by_mag) {
          return '震级相关';
        } else {
          return '默认尺寸';
        }
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
            <Link
              to={{
                pathname: `/img?project_id=${record.id}`,
              }}
            >
              底图管理
            </Link>
            {/* <Link
              to={{
                pathname: `/event?project_id=${record.id}`,
              }}
            >
              事件管理
            </Link> */}
            <Popconfirm
              title="确认清除该项目下所有事件？"
              description="此操作不可逆"
              okText="是"
              cancelText="否"
              onConfirm={async () => {
                const res = await batchDeleteProjectEvents(record.id);
                if (res.status === 200) {
                  message.success('事件清除成功！');
                } else {
                  message.error('事件清除失败！');
                }
              }}
            >
              <Button danger type="link">
                清除事件
              </Button>
            </Popconfirm>
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
            // @ts-ignore
            tableRef.current.reload();
          }}
          modalVisible={createModalVisible}
        />
        <EditForm
          currentRecord={currentRecord}
          onCancel={() => {
            handleEditVisible(false);
            // @ts-ignore
            tableRef.current.reload();
          }}
          modalVisible={editModalVisible}
        />
      </div>
    </PageContainer>
  );
};

export default HomePage;