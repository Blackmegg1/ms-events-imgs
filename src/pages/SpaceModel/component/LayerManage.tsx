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
  Switch,
  Tag,
  Radio,
  Divider,
  Typography,
  Select,
} from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';

const { Text } = Typography;

interface LayerManageProps {
  drawerVisible: boolean;
  onCancel: () => void;
  currentRecord: {
    model_id: number;
    project_id: string;
    model_name: string;
  };
}

interface LayerItem {
  id?: number;
  layer_name: string;
  layer_depth: number;
  layer_distance: number;
  layer_color: string;
  layer_type: number;
}

const LayerManage: React.FC<PropsWithChildren<LayerManageProps>> = (props) => {
  const { drawerVisible, onCancel, currentRecord } = props;
  const [dataSource, setDataSource] = useState<LayerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<LayerItem | null>(null);
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

  const handleEditLayer = async (values: any) => {
    try {
      if (currentLayer?.id === undefined) return;
      await updateLayer(currentLayer.id, {
        id: currentLayer.id,
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
      title: '层距(m)',
      dataIndex: 'layer_distance',
      key: 'layer_distance',
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
      title: '类型',
      dataIndex: 'layer_type',
      key: 'layer_type',
      render: (type: number) => (
        type === 1 ? <Tag color="blue">分析分区</Tag> : <Tag color="default">地质层位</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LayerItem) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setCurrentLayer(record);
              form.setFieldsValue({
                ...record,
                layer_type: record.layer_type === 1,
              });
              setEditModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该图层？"
            onConfirm={() => record.id && handleDeleteLayer(record.id)}
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

  const VisualColumn = ({
    layers,
    highlightedLayer = null,
  }: {
    layers: LayerItem[];
    coalThickness?: number;
    benchmark?: string;
    highlightedLayer?: LayerItem | null;
  }) => {
    const SCALE = 4;
    const VIEW_HEIGHT = 450;

    // 动态计算范围，确保所有层位都能展示
    const distances = layers?.map((l) => l.layer_distance) || [];
    const bottoms = layers?.map((l) => l.layer_distance - l.layer_depth) || [];
    const allVals = [...distances, ...bottoms, 0];
    const maxVal = Math.max(...allVals, 50); // 至少显示到+50m
    const minVal = Math.min(...allVals, -50); // 至少显示到-50m

    // 内容总高度和基准点位置
    const topPadding = 40;
    const contentHeight = (maxVal - minVal) * SCALE + topPadding * 2;
    const centerY = maxVal * SCALE + topPadding;

    const getPos = (val: number) => centerY - val * SCALE;

    // 格式化刻度点：每10米一个主刻度
    const ticks = [];
    for (
      let m = Math.floor(minVal / 10) * 10;
      m <= Math.ceil(maxVal / 10) * 10;
      m += 10
    ) {
      ticks.push(m);
    }

    return (
      <div
        style={{
          width: '180px',
          height: `${VIEW_HEIGHT}px`,
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div
          style={{ height: `${contentHeight}px`, position: 'relative', width: '100%' }}
        >
          {/* 背景刻度 */}
          {ticks.map((m) => (
            <div
              key={m}
              style={{
                position: 'absolute',
                top: getPos(m),
                width: '100%',
                borderTop: m % 50 === 0 ? '1px solid #dee2e6' : '1px dashed #e9ecef',
                fontSize: '9px',
                color: '#adb5bd',
                paddingLeft: '4px',
                pointerEvents: 'none',
              }}
            >
              {m === 0 ? '' : `${m}m`}
            </div>
          ))}

          {/* 基准线 */}
          <div
            style={{
              position: 'absolute',
              top: getPos(0),
              width: '100%',
              borderTop: '2px solid #ff4d4f',
              zIndex: 10,
              boxShadow: '0 0 4px rgba(255,77,79,0.3)',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                color: '#ff4d4f',
                background: '#fff',
                padding: '0 4px',
                position: 'absolute',
                top: '-14px',
                right: '4px',
                fontWeight: 'bold',
                borderRadius: '2px',
              }}
            >
              基准点
            </span>
          </div>

          {/* 渲染各层 */}
          {layers?.map((layer: LayerItem, idx: number) => {
            const isHighlighted =
              highlightedLayer &&
              (highlightedLayer.id === layer.id ||
                highlightedLayer.layer_name === layer.layer_name);
            const top = getPos(layer.layer_distance);
            const height = Math.max((layer.layer_depth || 1) * SCALE, 1);

            return (
              <div
                key={`${layer.id}-${idx}`}
                title={`${layer.layer_name}: ${layer.layer_distance}m ~ ${layer.layer_distance - layer.layer_depth
                  }m`}
                style={{
                  position: 'absolute',
                  left: layer.layer_type === 1 ? '45px' : '25px',
                  width: layer.layer_type === 1 ? '90px' : '130px',
                  top,
                  height: `${height}px`,
                  backgroundColor: layer.layer_color,
                  opacity: isHighlighted ? 1 : 0.7,
                  border: isHighlighted
                    ? '2px solid #1890ff'
                    : '1px solid rgba(0,0,0,0.15)',
                  borderRadius: '3px',
                  zIndex: isHighlighted ? 20 : 15,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isHighlighted ? '0 0 10px rgba(24,144,255,0.4)' : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    textAlign: 'center',
                    padding: '2px',
                    lineHeight: '1',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    width: '90%',
                  }}
                >
                  {layer.layer_name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const LayerForm = () => {
    const watchName = Form.useWatch('layer_name', form);
    const watchDepth = Form.useWatch('layer_depth', form);
    const watchColor = Form.useWatch('layer_color', form);
    const watchDist = Form.useWatch('layer_distance', form);
    const watchType = Form.useWatch('layer_type', form);

    const previewLayer: LayerItem = {
      layer_name: watchName || '新图层',
      layer_depth: watchDepth || 0.1,
      layer_color:
        typeof watchColor === 'string'
          ? watchColor
          : watchColor?.toHexString?.() || '#1890ff',
      layer_distance: watchDist || 0,
      layer_type: watchType ? 1 : 0,
    };

    return (
      <div style={{ display: 'flex', gap: '32px' }}>
        <div style={{ flex: 1 }}>
          <Form form={form} layout="vertical">
            <Form.Item
              name="layer_name"
              label="图层名称"
              rules={[{ required: true, message: '请输入图层名称' }]}
            >
              <Input placeholder="输入图层名称" />
            </Form.Item>

            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
            >
              <Form.Item
                name="layer_depth"
                label="层厚 (m)"
                rules={[{ required: true, message: '请输入层厚' }]}
              >
                <InputNumber step={1} precision={2} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="layer_color"
                label="图层颜色"
                rules={[{ required: true, message: '请选择颜色' }]}
              >
                <ColorPicker
                  showText
                  onChange={(color) => {
                    form.setFieldsValue({ layer_color: color.toHexString() });
                  }}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="layer_distance"
              label="层距 (m)"
              tooltip="层位顶面相对于上传数据基准点的垂直偏移量 (向上为正)"
              rules={[{ required: true, message: '请输入层距' }]}
            >
              <InputNumber
                step={0.1}
                precision={2}
                style={{ width: '100%' }}
                placeholder="相对于基准点的偏移量"
              />
            </Form.Item>

            <Form.Item
              name="layer_type"
              label="设置为“分析分区”"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Form>
        </div>

        <div style={{ width: '180px', flexShrink: 0 }}>
          <div
            style={{
              textAlign: 'center',
              marginBottom: '12px',
              fontWeight: 500,
              color: '#495057',
            }}
          >
            预览
          </div>
          <VisualColumn
            layers={[
              ...dataSource.filter((l) => l.id !== currentLayer?.id),
              previewLayer,
            ]}
            highlightedLayer={previewLayer}
          />
        </div>
      </div>
    );
  };

  return (
    <Drawer
      title="层位与分析分区管理"
      open={drawerVisible}
      onClose={onCancel}
      width={1100}
      extra={
        <Button type="primary" onClick={() => {
          form.resetFields();
          setCurrentLayer(null);
          setAddModalVisible(true);
        }}>
          添加图层
        </Button>
      }
    >
      <div style={{ display: 'flex', gap: '32px', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            pagination={false}
            size="middle"
          />
        </div>
        <div
          style={{
            width: '220px',
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '16px', color: '#212529', fontSize: '15px' }}>预览柱状图</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <VisualColumn layers={dataSource} />
          </div>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#6c757d', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <Text strong style={{ display: 'block', marginBottom: '4px' }}>图例说明</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '12px', height: '2px', background: '#ff4d4f' }} />
              <span>数据基准面</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', background: '#e9ecef', border: '1px solid #ced4da' }} />
              <span>定义的层位/分区</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="添加图层"
        open={addModalVisible}
        width={850}
        onOk={async () => {
          const values = await form.validateFields();
          await handleAddLayer({
            ...values,
            layer_type: values.layer_type ? 1 : 0,
          });
        }}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <LayerForm />
      </Modal>

      <Modal
        title="编辑图层"
        open={editModalVisible}
        width={850}
        onOk={async () => {
          const values = await form.validateFields();
          await handleEditLayer({
            ...values,
            layer_type: values.layer_type ? 1 : 0,
          });
        }}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <LayerForm />
      </Modal>
    </Drawer>
  );
};

export default LayerManage;
