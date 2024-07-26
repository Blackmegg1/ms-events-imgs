import { getPointList } from '@/services/point/PointController';
import { Button, Drawer, Space, Table } from 'antd';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import BatchImport from './BatchImport';

interface PointManageProps {
  drawerVisible: boolean;
  onCancel: () => void;
  currentRecord: {
    model_id: number;
    project_id: string;
    model_name: string;
  };
}

const PointManage: React.FC<PropsWithChildren<PointManageProps>> = (props) => {
  const { drawerVisible, onCancel, currentRecord } = props;
  const [dataSource, setDataSource] = useState([]);
  const [batchModalVisible, setModalVisible] = useState(false);
  const tableRef = useRef();

  useEffect(() => {
    if (currentRecord && currentRecord.model_id) {
      fetchPointList();
    }
  }, [currentRecord]);

  const fetchPointList = async () => {
    try {
      const response = await getPointList({ model_id: currentRecord.model_id });
      setDataSource(response.list); // 假设API返回的数据在response.data中
    } catch (error) {
      console.error('获取点位列表失败:', error);
      // 这里可以添加错误处理，比如显示一个错误通知
    }
  };

  const columns = [
    {
      title: '点位名称',
      dataIndex: 'point_name',
      key: 'point_name',
    },
    {
      title: 'X坐标',
      dataIndex: 'point_x',
      key: 'point_x',
    },
    {
      title: 'Y坐标',
      dataIndex: 'point_y',
      key: 'point_y',
    },
    {
      title: 'Z坐标',
      dataIndex: 'point_z',
      key: 'point_z',
    },
  ];
  return (
    <Drawer
      open={drawerVisible}
      onClose={onCancel}
      width={800}
      extra={
        <Space>
          <Button type="primary" onClick={() => setModalVisible(true)}>
            批量导入
          </Button>
          <Button danger>清空点位</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={dataSource} />
      <BatchImport
        model_id={currentRecord.model_id}
        modalVisible={batchModalVisible}
        onCancel={() => {
          setModalVisible(false);
          fetchPointList();
        }}
        onOk={() => {
          setModalVisible(false);
          fetchPointList();
        }}
      />
    </Drawer>
  );
};

export default PointManage;
