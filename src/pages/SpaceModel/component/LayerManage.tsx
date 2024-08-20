import {
  addLayer,
  deleteLayer,
  getLayerList,
  updateLayer,
} from '@/services/layer/LayerController';
import {
  Button,
  ColorPicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  message,
} from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';

interface LayerManageProps {
  drawerVisible: boolean;
  onCancel: () => void;
  currentRecord: {
    model_id: number;
    project_id: string;
    model_name: string;
  };
}

const LayerManage: React.FC<PropsWithChildren<LayerManageProps>> = (props) => {
  const { drawerVisible, onCancel, currentRecord } = props;
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentLayer, setCurrentLayer] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (currentRecord && currentRecord.model_id) {
      fetchLayerList();
    }
  }, [currentRecord]);

  const fetchLayerList = async () => {
    try {
      setLoading(true);
      const response = await getLayerList({ model_id: currentRecord.model_id });
      setDataSource(response.list);
    } catch (error) {
      console.error('获取图层列表失败:', error);
      message.error('获取图层列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLayer = async (values) => {
    try {
      await addLayer({ ...values, model_id: currentRecord.model_id });
      setAddModalVisible(false);
      form.resetFields();
      message.success('添加图层成功');
      fetchLayerList();
    } catch (error) {
      console.error('添加图层失败:', error);
      message.error('添加图层失败');
    }
  };

  const handleEditLayer = async (values) => {
    try {
      await updateLayer(currentLayer.id, {
        ...values,
        model_id: currentRecord.model_id,
      });
      setEditModalVisible(false);
      form.resetFields();
      message.success('修改图层成功');
      fetchLayerList();
    } catch (error) {
      console.error('修改图层失败:', error);
      message.error('修改图层失败');
    }
  };

  const handleDeleteLayer = async (id: number) => {
    try {
      await deleteLayer(id);
      message.success('删除图层成功');
      fetchLayerList();
    } catch (error) {
      console.error('删除图层失败:', error);
      message.error('删除图层失败');
    }
  };

  const columns = [
    {
      title: '图层名称',
      dataIndex: 'layer_name',
      key: 'layer_name',
    },
    {
      title: '层厚(m)',
      dataIndex: 'layer_depth',
      key: 'layer_depth',
    },
    {
      title: '序号',
      dataIndex: 'layer_seq',
      key: 'layer_seq',
    },
    {
      title: '颜色',
      dataIndex: 'layer_color',
      key: 'layer_color',
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
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setCurrentLayer(record);
              form.setFieldsValue(record);
              setEditModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该图层？"
            onConfirm={() => handleDeleteLayer(record.id)}
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

  const LayerForm = () => (
    <Form form={form} layout="vertical">
      <Form.Item
        name="layer_name"
        label="图层名称"
        rules={[{ required: true, message: '请输入图层名称' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="layer_depth"
        label="层厚(m)"
        rules={[{ required: true, message: '请输入层厚' }]}
      >
        <InputNumber />
      </Form.Item>
      <Form.Item
        name="layer_color"
        label="颜色"
        rules={[{ required: true, message: '请选择颜色' }]}
      >
        <ColorPicker
          onChange={(color) => {
            form.setFieldsValue({ layer_color: color.toHexString() });
          }}
        />
      </Form.Item>
      <Form.Item name="layer_seq" label="序号（不填默认递增）">
        <InputNumber />
      </Form.Item>
    </Form>
  );

  return (
    <Drawer
      title="图层管理"
      open={drawerVisible}
      onClose={onCancel}
      width={800}
      extra={
        <Button type="primary" onClick={() => setAddModalVisible(true)}>
          添加图层
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
      />
      <Modal
        title="添加图层"
        open={addModalVisible}
        onOk={async () => {
          await form.validateFields();
          await handleAddLayer(form.getFieldsValue());
        }}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
        }}
      >
        <LayerForm />
      </Modal>
      <Modal
        title="编辑图层"
        open={editModalVisible}
        onOk={async () => {
          await form.validateFields();
          await handleEditLayer(form.getFieldsValue());
        }}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
      >
        <LayerForm />
      </Modal>
    </Drawer>
  );
};

export default LayerManage;
