import services from '@/services/project';
import { QuestionCircleOutlined } from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import React, { PropsWithChildren, useEffect, useState } from 'react';

interface EditFormProps {
  modalVisible: boolean;
  currentRecord: {
    id: number;
    projectName: string;
    initTime: string;
    by_mag: number;
    is_finished: number;
    by_ltp: number;
    ltp_map: string;
  };
  onCancel: () => void;
}

const { editProject } = services.ProjectController;

const EditForm: React.FC<PropsWithChildren<EditFormProps>> = (props) => {
  const { modalVisible, onCancel, currentRecord } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [useLTP, setUseLTP] = useState(0);

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
            const payload = {
              ...validFields,
              is_finished: validFields.is_finished ? 1 : 0,
              by_ltp: parseInt(validFields.by_ltp),
            };

            if (payload.by_ltp === 1) {
              try {
                const mapData = validFields.ltp_map_points.map((item: any) => ({
                  x: parseFloat(item.x),
                  y: parseFloat(item.y),
                  xmap: parseFloat(item.xmap),
                  ymap: parseFloat(item.ymap),
                }));
                payload.ltp_map = JSON.stringify(mapData);
              } catch {
                message.error('坐标格式有误');
                setLoading(false);
                return;
              }
            } else {
              payload.ltp_map = '0';
            }

            delete payload.ltp_map_points;

            return editProject(currentRecord.id, payload);
          })
          .then(() => {
            setLoading(false);
            message.success('修改成功');
            form.resetFields();
            onCancel();
          })
          .catch(() => {
            setLoading(false);
            message.error('修改失败');
          });
      }}
    >
      修改
    </Button>,
  ];

  useEffect(() => {
    if (currentRecord) {
      const { projectName, initTime, by_mag, is_finished, by_ltp, ltp_map } =
        currentRecord;
      form.setFieldsValue({
        projectName,
        initTime: dayjs(),
        by_mag,
        is_finished: is_finished === 1,
        by_ltp,
      });
      setUseLTP(by_ltp);

      // 解析 ltp_map 为数组形式
      if (by_ltp === 1 && ltp_map) {
        try {
          const parsed = JSON.parse(ltp_map);
          form.setFieldValue('ltp_map_points', parsed);
        } catch {
          form.setFieldValue('ltp_map_points', [{}, {}]);
        }
      }
    }
  }, [currentRecord, form]);

  return (
    <Modal
      destroyOnClose
      title="编辑项目"
      width={700}
      open={modalVisible}
      onCancel={onCancel}
      footer={modalFooter}
    >
      <Form labelCol={{ span: 5 }} wrapperCol={{ span: 16 }} form={form}>
        <Form.Item
          label="项目名称"
          name="projectName"
          rules={[{ required: true, message: '请输入项目名称!' }]}
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
              style={{ marginBottom: 12 }}
            >
              <div style={{ fontSize: 13, color: '#888' }}>
                请提供两组“原坐标”与“目标坐标”的点对，用于构建仿射变换关系。
              </div>
            </Form.Item>

            {[0, 1].map((idx) => (
              <Form.Item key={idx} label={`控制点 ${idx + 1}`} required>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Form.Item
                      name={['ltp_map_points', idx, 'x']}
                      label="原始 X"
                      rules={[{ required: true, message: '请输入原始 X' }]}
                    >
                      <Input style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item
                      name={['ltp_map_points', idx, 'y']}
                      label="原始 Y"
                      rules={[{ required: true, message: '请输入原始 Y' }]}
                    >
                      <Input style={{ width: 120 }} />
                    </Form.Item>
                  </Space>
                  <Space>
                    <Form.Item
                      name={['ltp_map_points', idx, 'xmap']}
                      label="目标 X"
                      rules={[{ required: true, message: '请输入目标 X' }]}
                    >
                      <Input style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item
                      name={['ltp_map_points', idx, 'ymap']}
                      label="目标 Y"
                      rules={[{ required: true, message: '请输入目标 Y' }]}
                    >
                      <Input style={{ width: 120 }} />
                    </Form.Item>
                  </Space>
                </Space>
              </Form.Item>
            ))}
          </>
        )}

        <Form.Item
          label={
            <span>
              项目状态
              <Tooltip title="已完成的项目将在部分选项中被隐藏">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          name="is_finished"
          valuePropName="checked"
        >
          <Switch checkedChildren="已完成" unCheckedChildren="未完成" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditForm;
