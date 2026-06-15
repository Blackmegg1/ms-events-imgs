import {
  addRoadway,
  deleteRoadway,
  getRoadwayList,
  updateRoadway,
} from '@/services/roadway/RoadwayController';
import {
  Button,
  ColorPicker,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';

interface RoadwayManageProps {
  drawerVisible: boolean;
  onCancel: () => void;
  currentRecord: {
    model_id: number;
    project_id: string;
    model_name: string;
  };
}

interface RoadwayItem {
  id?: number;
  name: string;
  position: string;
  color: string;
}

const POSITION_OPTIONS = [
  { value: 'max_y', label: 'Y 最大侧 (max_y)' },
  { value: 'min_y', label: 'Y 最小侧 (min_y)' },
];

const RoadwayManage: React.FC<PropsWithChildren<RoadwayManageProps>> = (props) => {
  const { drawerVisible, onCancel, currentRecord } = props;
  const [dataSource, setDataSource] = useState<RoadwayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentRoadway, setCurrentRoadway] = useState<RoadwayItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (currentRecord && currentRecord.model_id) {
      fetchRoadwayList();
    }
  }, [currentRecord]);

  const fetchRoadwayList = async () => {
    try {
      setLoading(true);
      const response = await getRoadwayList({ model_id: currentRecord.model_id });
      setDataSource(response.list || []);
    } catch (error) {
      console.error('获取巷道列表失败:', error);
      message.error('获取巷道列表失败');
    } finally {
      setLoading(false);
    }
  };

  const normalizeColor = (color: any) =>
    typeof color === 'string' ? color : color?.toHexString?.() || '#e74c3c';

  const handleAddRoadway = async (values: any) => {
    try {
      await addRoadway({
        ...values,
        color: normalizeColor(values.color),
        model_id: currentRecord.model_id,
      });
      setAddModalVisible(false);
      form.resetFields();
      message.success('添加巷道成功');
      fetchRoadwayList();
    } catch (error) {
      console.error('添加巷道失败:', error);
      message.error('添加巷道失败');
    }
  };

  const handleEditRoadway = async (values: any) => {
    try {
      if (currentRoadway?.id === undefined) return;
      await updateRoadway(currentRoadway.id, {
        ...values,
        color: normalizeColor(values.color),
        model_id: currentRecord.model_id,
      });
      setEditModalVisible(false);
      form.resetFields();
      message.success('修改巷道成功');
      fetchRoadwayList();
    } catch (error) {
      console.error('修改巷道失败:', error);
      message.error('修改巷道失败');
    }
  };

  const handleDeleteRoadway = async (id: number) => {
    try {
      await deleteRoadway(id);
      message.success('删除巷道成功');
      fetchRoadwayList();
    } catch (error) {
      console.error('删除巷道失败:', error);
      message.error('删除巷道失败');
    }
  };

  const columns = [
    {
      title: '巷道名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      render: (position: string) => (
        <Tag color={position === 'min_y' ? 'green' : 'red'}>
          {position === 'min_y' ? 'Y 最小侧' : 'Y 最大侧'}
        </Tag>
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => (
        <div
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: color,
            borderRadius: '4px',
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: RoadwayItem) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setCurrentRoadway(record);
              form.setFieldsValue(record);
              setEditModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该巷道？"
            onConfirm={() => record.id && handleDeleteRoadway(record.id)}
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

  const RoadwayForm = () => (
    <Form form={form} layout="vertical">
      <Form.Item
        name="name"
        label="巷道名称"
        rules={[{ required: true, message: '请输入巷道名称' }]}
      >
        <Input placeholder="如：120102轨道顺槽" />
      </Form.Item>
      <Form.Item
        name="position"
        label="位置"
        tooltip="巷道在模型 Y 方向的哪一侧展示"
        rules={[{ required: true, message: '请选择位置' }]}
      >
        <Select options={POSITION_OPTIONS} placeholder="请选择" />
      </Form.Item>
      <Form.Item
        name="color"
        label="颜色"
        rules={[{ required: true, message: '请选择颜色' }]}
      >
        <ColorPicker
          showText
          onChange={(color) => {
            form.setFieldsValue({ color: color.toHexString() });
          }}
        />
      </Form.Item>
    </Form>
  );

  return (
    <Drawer
      title="巷道管理"
      open={drawerVisible}
      onClose={onCancel}
      width={760}
      extra={
        <Button
          type="primary"
          onClick={() => {
            form.resetFields();
            form.setFieldsValue({ position: 'max_y', color: '#e74c3c' });
            setCurrentRoadway(null);
            setAddModalVisible(true);
          }}
        >
          添加巷道
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        size="middle"
      />

      <Modal
        title="添加巷道"
        open={addModalVisible}
        onOk={async () => {
          const values = await form.validateFields();
          await handleAddRoadway(values);
        }}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <RoadwayForm />
      </Modal>

      <Modal
        title="编辑巷道"
        open={editModalVisible}
        onOk={async () => {
          const values = await form.validateFields();
          await handleEditRoadway(values);
        }}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <RoadwayForm />
      </Modal>
    </Drawer>
  );
};

export default RoadwayManage;
