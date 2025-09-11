import services from '@/services/project';
import { Button, DatePicker, Form, Input, Modal, Select, Space, Switch, message } from 'antd';
import dayjs from 'dayjs';
import React, { PropsWithChildren, useState } from 'react';

const { addProject } = services.ProjectController;

interface CreateFormProps {
  modalVisible: boolean;
  onCancel: () => void;
}

const CreateForm: React.FC<PropsWithChildren<CreateFormProps>> = (props) => {
  const { modalVisible, onCancel } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [useLTP, setUseLTP] = useState(0); // 0=不启用 1=启用
  const [useTimeFormat, setUseTimeFormat] = useState(0); // 0=不启用 1=启用

  const modalFooter = [
    <Button key="back" onClick={onCancel}>
      取消
    </Button>,
    <Button
      key="submit"
      type="primary"
      loading={loading}
      onClick={() => {
        setLoading(true);
        form
          .validateFields()
          .then((validFields) => {
            if (validFields.by_ltp === 1) {
              try {
                const mapData = validFields.ltp_map_points.map((item: any) => ({
                  x: parseFloat(item.x),
                  y: parseFloat(item.y),
                  xmap: parseFloat(item.xmap),
                  ymap: parseFloat(item.ymap),
                }));
                validFields.ltp_map = JSON.stringify(mapData);
              } catch (e) {
                message.error('坐标点格式有误，请检查输入');
                setLoading(false);
                return;
              }
            } else {
              validFields.ltp_map = '0';
            }
            delete validFields.ltp_map_points;

            return addProject(validFields);
          })
          .then(() => {
            setLoading(false);
            message.success('创建成功');
            form.resetFields();
            onCancel();
            setUseLTP(0);
            setUseTimeFormat(0);
          })
          .catch(() => {
            setLoading(false);
            message.error('创建失败');
          });
      }}
    >
      创建
    </Button>,
  ];

  return (
    <Modal
      destroyOnClose
      title="新建项目"
      width={700}
      open={modalVisible}
      onCancel={() => {
        onCancel();
        setUseLTP(0);
        setUseTimeFormat(0);
      }}
      footer={modalFooter}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 16 }}
        form={form}
        initialValues={{
          initTime: dayjs(),
          by_ltp: 0,
          by_mag: 0,
          is_finished: false,
          enable_time_format: 0,
          time_format: 'YYYY-MM-DD HH:mm:ss.SSS',
          ltp_map_points: [{}, {}], // 固定两组坐标
        }}
      >
        <Form.Item
          label="项目名称"
          name="projectName"
          rules={[{ required: true, message: '请输入项目名称' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="事件点尺寸"
          name="by_mag"
          rules={[{ required: true, message: '请选择事件点尺寸' }]}
        >
          <Select
            options={[
              { label: '震级相关', value: 1 },
              { label: '默认尺寸', value: 0 },
            ]}
          />
        </Form.Item>

        <Form.Item name="initTime" label="更新时间">
          <DatePicker format="YYYY-MM-DD HH:mm:ss" disabled />
        </Form.Item>

        <Form.Item
          label="大地坐标"
          name="by_ltp"
          rules={[{ required: true, message: '请选择是否启用大地坐标' }]}
        >
          <Select
            options={[
              { label: '启用', value: 1 },
              { label: '不启用', value: 0 },
            ]}
            onChange={(val) => setUseLTP(val)}
          />
        </Form.Item>

        {useLTP === 1 && (
          <>
            <Form.Item
              wrapperCol={{ offset: 5, span: 16 }}
              style={{ marginBottom: 16 }}
            >
              <div style={{ fontSize: 13, color: '#888' }}>
                请提供两组“原坐标”与“目标坐标”的点对，用于构建仿射变换关系。
              </div>
            </Form.Item>

            {/* 控制点 1 */}
            <Form.Item label="控制点1" required>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Form.Item
                    name={['ltp_map_points', 0, 'x']}
                    label="原始 X"
                    rules={[{ required: true, message: '请输入原始 X 坐标' }]}
                  >
                    <Input placeholder="如 0" style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item
                    name={['ltp_map_points', 0, 'y']}
                    label="原始 Y"
                    rules={[{ required: true, message: '请输入原始 Y 坐标' }]}
                  >
                    <Input placeholder="如 0" style={{ width: 120 }} />
                  </Form.Item>
                </Space>
                <Space>
                  <Form.Item
                    name={['ltp_map_points', 0, 'xmap']}
                    label="目标 X"
                    rules={[{ required: true, message: '请输入目标 X 坐标' }]}
                  >
                    <Input placeholder="如 1000" style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item
                    name={['ltp_map_points', 0, 'ymap']}
                    label="目标 Y"
                    rules={[{ required: true, message: '请输入目标 Y 坐标' }]}
                  >
                    <Input placeholder="如 2000" style={{ width: 120 }} />
                  </Form.Item>
                </Space>
              </Space>
            </Form.Item>

            {/* 控制点 2 */}
            <Form.Item label="控制点2" required>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Form.Item
                    name={['ltp_map_points', 1, 'x']}
                    label="原始 X"
                    rules={[{ required: true, message: '请输入原始 X 坐标' }]}
                  >
                    <Input placeholder="如 300" style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item
                    name={['ltp_map_points', 1, 'y']}
                    label="原始 Y"
                    rules={[{ required: true, message: '请输入原始 Y 坐标' }]}
                  >
                    <Input placeholder="如 400" style={{ width: 120 }} />
                  </Form.Item>
                </Space>
                <Space>
                  <Form.Item
                    name={['ltp_map_points', 1, 'xmap']}
                    label="目标 X"
                    rules={[{ required: true, message: '请输入目标 X 坐标' }]}
                  >
                    <Input placeholder="如 1500" style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item
                    name={['ltp_map_points', 1, 'ymap']}
                    label="目标 Y"
                    rules={[{ required: true, message: '请输入目标 Y 坐标' }]}
                  >
                    <Input placeholder="如 2500" style={{ width: 120 }} />
                  </Form.Item>
                </Space>
              </Space>
            </Form.Item>
          </>
        )}

        <Form.Item
          label="启用时间格式"
          name="enable_time_format"
          rules={[{ required: true, message: '请选择是否启用时间格式' }]}
        >
          <Select
            options={[
              { label: '启用', value: 1 },
              { label: '不启用', value: 0 },
            ]}
            onChange={(val) => setUseTimeFormat(val)}
          />
        </Form.Item>

        {useTimeFormat === 1 && (
          <Form.Item
            label="时间格式"
            name="time_format"
            rules={[{ required: true, message: '请输入时间格式' }]}
            tooltip="用于导出/显示的时间格式，例如 YYYY-MM-DD HH:mm:ss.SSS"
          >
            <Input placeholder="YYYY-MM-DD HH:mm:ss.SSS" />
          </Form.Item>
        )}

        {/* 项目状态放在最后 */}
        <Form.Item
          label="项目状态"
          name="is_finished"
          valuePropName="checked"
        >
          <Switch checkedChildren="已完成" unCheckedChildren="未完成" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateForm;
