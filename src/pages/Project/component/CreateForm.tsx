import services from '@/services/project';
import { Button, DatePicker, Form, Input, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import React, { PropsWithChildren, useState } from 'react';

interface CreateFormProps {
  modalVisible: boolean;
  onCancel: () => void;
}
const { addProject } = services.ProjectController;

const CreateForm: React.FC<PropsWithChildren<CreateFormProps>> = (props) => {
  const { modalVisible, onCancel } = props;
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
            return addProject(validFields);
          })
          .then(() => {
            setLoading(false);
            message.success('创建成功');
            form.resetFields();
            onCancel();
          })
          .catch((err) => {
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
      width={600}
      open={modalVisible}
      onCancel={() => onCancel()}
      footer={modalFooter}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 16 }}
        form={form}
        initialValues={{ initTime: dayjs() }}
      >
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
      </Form>
    </Modal>
  );
};

export default CreateForm;
