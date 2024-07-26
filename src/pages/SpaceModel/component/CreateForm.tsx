import { addModel } from '@/services/model/ModelController';
import { Button, Form, Input, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import React, { PropsWithChildren, useState } from 'react';

interface CreateFormProps {
  modalVisible: boolean;
  onCancel: () => void;
  projectArr: any[];
}

const CreateForm: React.FC<PropsWithChildren<CreateFormProps>> = (props) => {
  const { modalVisible, onCancel, projectArr } = props;
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
            return addModel(validFields);
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
      title="新建模型"
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
          label="模型名称"
          name="model_name"
          rules={[{ required: true, message: '请输入模型名称!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="所属项目"
          name="project_id"
          rules={[{ required: true, message: '请选择模型所属项目' }]}
        >
          <Select
            options={projectArr}
            style={{ width: 220 }}
            placeholder="请选择"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateForm;
