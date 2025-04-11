import services from '@/services/project';
import { Button, DatePicker, Form, Input, Modal, Select, message, Switch, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons'; // Import for question mark icon
import dayjs from 'dayjs';
import React, { PropsWithChildren, useEffect, useState } from 'react';

interface EditFormProps {
  modalVisible: boolean;
  currentRecord: {
    id: number;
    projectName: string;
    initTime: string;
    by_mag: number;
    is_finished: number; // Add is_finished to the interface
  };
  onCancel: () => void;
}
const { editProject } = services.ProjectController;

const EditForm: React.FC<PropsWithChildren<EditFormProps>> = (props) => {
  const { modalVisible, onCancel, currentRecord } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
            // Convert is_finished boolean to number (0 or 1) for backend
            const payload = {
              ...validFields,
              is_finished: validFields.is_finished ? 1 : 0,
            };
            return editProject(currentRecord.id, payload);
          })
          .then(() => {
            setLoading(false);
            message.success('修改成功');
            form.resetFields();
            onCancel();
          })
          .catch((err) => {
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
      form.setFieldValue('projectName', currentRecord?.projectName);
      const today = dayjs();
      form.setFieldValue('initTime', today);
      form.setFieldValue('by_mag', currentRecord?.by_mag);
      form.setFieldValue('is_finished', currentRecord?.is_finished === 1);
    }
  }, [currentRecord, form]);

  return (
    <Modal
      destroyOnClose
      title="编辑项目"
      width={600}
      open={modalVisible}
      onCancel={() => onCancel()}
      footer={modalFooter}
    >
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} form={form}>
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
          rules={[{ required: true, message: '请输入事件点尺寸' }]}
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
          label={
            <span>
              项目状态
              <Tooltip title="已完成的项目将在下拉框中隐藏">
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