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
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import RoadwayPointManage from './RoadwayPointManage';

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
  color: string;
  section_type: string;
  sec_width: number;
  sec_wall_height: number;
  sec_diameter: number;
}

const SECTION_OPTIONS = [
  { value: 'arch', label: '拱形（巷宽+墙高，半圆拱顶）' },
  { value: 'circle', label: '圆形（直径）' },
];

const RoadwayManage: React.FC<PropsWithChildren<RoadwayManageProps>> = (props) => {
  const { drawerVisible, onCancel, currentRecord } = props;
  const [dataSource, setDataSource] = useState<RoadwayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentRoadway, setCurrentRoadway] = useState<RoadwayItem | null>(null);
  const [pointDrawerVisible, setPointDrawerVisible] = useState(false);
  const [pointRoadway, setPointRoadway] = useState<{ id: number; name: string } | null>(null);
  const [form] = Form.useForm();
  const sectionType = Form.useWatch('section_type', form);

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
      message.error('获取巷道列表失败');
    } finally {
      setLoading(false);
    }
  };

  const normalizeColor = (color: any) =>
    typeof color === 'string' ? color : color?.toHexString?.() || '#e74c3c';

  const handleAddRoadway = async (values: any) => {
    await addRoadway({ ...values, color: normalizeColor(values.color), model_id: currentRecord.model_id });
    setAddModalVisible(false);
    form.resetFields();
    message.success('添加巷道成功');
    fetchRoadwayList();
  };

  const handleEditRoadway = async (values: any) => {
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
  };

  const handleDeleteRoadway = async (id: number) => {
    await deleteRoadway(id);
    message.success('删除巷道成功');
    fetchRoadwayList();
  };

  const columns = [
    { title: '巷道名称', dataIndex: 'name', key: 'name' },
    {
      title: '剖面',
      dataIndex: 'section_type',
      key: 'section_type',
      render: (t: string) =>
        t === 'circle' ? <Tag color="geekblue">圆形</Tag> : <Tag color="gold">拱形</Tag>,
    },
    {
      title: '尺寸(m)',
      key: 'size',
      render: (_: any, r: RoadwayItem) =>
        r.section_type === 'circle'
          ? `直径 ${r.sec_diameter}`
          : `宽 ${r.sec_width} / 墙高 ${r.sec_wall_height}`,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => (
        <div style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 4 }} />
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
          <Button
            type="link"
            onClick={() => {
              if (record.id === undefined) return;
              setPointRoadway({ id: record.id, name: record.name });
              setPointDrawerVisible(true);
            }}
          >
            测点管理
          </Button>
          <Popconfirm title="确认删除该巷道（连同测点）？" onConfirm={() => record.id && handleDeleteRoadway(record.id)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const RoadwayForm = () => (
    <Form form={form} layout="vertical" initialValues={{ section_type: 'arch' }}>
      <Form.Item name="name" label="巷道名称" rules={[{ required: true, message: '请输入巷道名称' }]}>
        <Input placeholder="如：120102轨道顺槽" />
      </Form.Item>
      <Form.Item name="section_type" label="剖面类型" rules={[{ required: true }]}>
        <Select options={SECTION_OPTIONS} />
      </Form.Item>
      {sectionType === 'circle' ? (
        <Form.Item name="sec_diameter" label="直径 D (m)" rules={[{ required: true, message: '请输入直径' }]}>
          <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} />
        </Form.Item>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="sec_width" label="巷宽 W (m)" rules={[{ required: true, message: '请输入巷宽' }]}>
            <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="sec_wall_height" label="直墙高 H (m)" rules={[{ required: true, message: '请输入墙高' }]}>
            <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </div>
      )}
      <Form.Item name="color" label="颜色" rules={[{ required: true, message: '请选择颜色' }]}>
        <ColorPicker showText onChange={(c) => form.setFieldsValue({ color: c.toHexString() })} />
      </Form.Item>
    </Form>
  );

  return (
    <Drawer
      title="巷道管理"
      open={drawerVisible}
      onClose={onCancel}
      width={820}
      extra={
        <Button
          type="primary"
          onClick={() => {
            form.resetFields();
            form.setFieldsValue({ section_type: 'arch', sec_width: 4, sec_wall_height: 3, sec_diameter: 4, color: '#e74c3c' });
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

      {pointRoadway && (
        <RoadwayPointManage
          drawerVisible={pointDrawerVisible}
          roadway={pointRoadway}
          onCancel={() => setPointDrawerVisible(false)}
        />
      )}
    </Drawer>
  );
};

export default RoadwayManage;
