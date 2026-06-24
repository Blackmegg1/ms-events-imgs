import {
  addRoadwayPoint,
  batchImportRoadwayPoints,
  clearRoadwayPoints,
  deleteRoadwayPoint,
  getRoadwayPoints,
  updateRoadwayPoint,
} from '@/services/roadway/RoadwayController';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Upload,
  message,
} from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';

interface RoadwayPointManageProps {
  drawerVisible: boolean;
  onCancel: () => void;
  roadway: { id: number; name: string };
}

interface PointItem {
  id?: number;
  seq: number;
  point_name: string;
  x: number;
  y: number;
  z: number;
}

const RoadwayPointManage: React.FC<PropsWithChildren<RoadwayPointManageProps>> = (props) => {
  const { drawerVisible, onCancel, roadway } = props;
  const [dataSource, setDataSource] = useState<PointItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<PointItem | null>(null);
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();

  useEffect(() => {
    if (drawerVisible && roadway && roadway.id) {
      fetchPoints();
    }
  }, [drawerVisible, roadway]);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      const res = await getRoadwayPoints(roadway.id);
      setDataSource(res.list || []);
    } catch (e) {
      message.error('获取测点失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (values: any) => {
    await addRoadwayPoint({
      ...values,
      roadway_id: roadway.id,
      seq: values.seq ?? dataSource.length,
    });
    setAddModalVisible(false);
    form.resetFields();
    message.success('添加测点成功');
    fetchPoints();
  };

  const handleEdit = async (values: any) => {
    if (currentPoint?.id === undefined) return;
    await updateRoadwayPoint(currentPoint.id, { ...values, roadway_id: roadway.id });
    setEditModalVisible(false);
    form.resetFields();
    message.success('修改测点成功');
    fetchPoints();
  };

  const handleDelete = async (id: number) => {
    await deleteRoadwayPoint(id);
    message.success('删除成功');
    fetchPoints();
  };

  const handleClear = async () => {
    await clearRoadwayPoints(roadway.id);
    message.success('已清空测点');
    fetchPoints();
  };

  const handleImport = () => {
    const values = importForm.getFieldsValue();
    const uploadFileInfo = values?.excel?.file || values?.excel?.fileList?.[0];
    const file = uploadFileInfo?.originFileObj || uploadFileInfo;
    if (!file) {
      message.warning('请先选择 CSV 文件');
      return;
    }
    const formData = new FormData();
    formData.append('roadway_id', roadway.id.toString());
    formData.append('file', file);
    batchImportRoadwayPoints(formData)
      .then((res) => {
        message.success(res.message || '导入成功');
        setImportModalVisible(false);
        importForm.resetFields();
        fetchPoints();
      })
      .catch((err) => message.error(err.message || '导入失败'));
  };

  const downloadSample = () => {
    const header = '﻿编号,X,Y,Z\n';
    const rows = ['C1,-470,-140,-885', 'C2,-460,-138,-884', 'C3,-450,-135,-883'].join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = '巷道测点导入示例.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { title: '顺序', dataIndex: 'seq', key: 'seq', width: 70 },
    { title: '编号', dataIndex: 'point_name', key: 'point_name' },
    { title: 'X', dataIndex: 'x', key: 'x' },
    { title: 'Y', dataIndex: 'y', key: 'y' },
    { title: 'Z', dataIndex: 'z', key: 'z' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PointItem) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setCurrentPoint(record);
              form.setFieldsValue(record);
              setEditModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除该测点？" onConfirm={() => record.id && handleDelete(record.id)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const PointForm = () => (
    <Form form={form} layout="vertical">
      <Form.Item name="point_name" label="编号" rules={[{ required: true, message: '请输入测点编号' }]}>
        <Input placeholder="如 C1" />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Form.Item name="x" label="X" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="y" label="Y" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="z" label="Z" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
      </div>
      <Form.Item name="seq" label="顺序" tooltip="测点沿巷道的先后顺序，越小越靠前">
        <InputNumber style={{ width: '100%' }} placeholder="留空则追加到末尾" />
      </Form.Item>
    </Form>
  );

  return (
    <Drawer
      title={`测点管理 - ${roadway?.name || ''}`}
      open={drawerVisible}
      onClose={onCancel}
      width={760}
      extra={
        <Space>
          <Button onClick={() => setImportModalVisible(true)}>CSV 导入</Button>
          <Popconfirm title="确认清空该巷道全部测点？" onConfirm={handleClear}>
            <Button danger>清空</Button>
          </Popconfirm>
          <Button
            type="primary"
            onClick={() => {
              form.resetFields();
              setCurrentPoint(null);
              setAddModalVisible(true);
            }}
          >
            添加测点
          </Button>
        </Space>
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
        title="添加测点"
        open={addModalVisible}
        onOk={async () => {
          const values = await form.validateFields();
          await handleAdd(values);
        }}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <PointForm />
      </Modal>

      <Modal
        title="编辑测点"
        open={editModalVisible}
        onOk={async () => {
          const values = await form.validateFields();
          await handleEdit(values);
        }}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <PointForm />
      </Modal>

      <Modal
        title="批量导入巷道测点"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => {
          setImportModalVisible(false);
          importForm.resetFields();
        }}
      >
        <div style={{ marginBottom: 16 }}>
          请按示例格式上传（编号,X,Y,Z）：
          <Button type="link" onClick={downloadSample} style={{ padding: 0 }}>
            下载示例文件
          </Button>
        </div>
        <Form form={importForm} layout="horizontal">
          <Form.Item name="excel" label="CSV文件" required getValueFromEvent={(event) => event}>
            <Upload accept=".csv" beforeUpload={() => false} maxCount={1}>
              <Button>点击上传</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};

export default RoadwayPointManage;
