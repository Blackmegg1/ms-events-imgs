import { editModel } from '@/services/model/ModelController';
import { Button, Form, Input, Modal, Select, message } from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';

interface EditFormProps {
  modalVisible: boolean;
  currentRecord: {
    model_id: number;
    project_id: string;
    model_name: string;
  };
  onCancel: () => void;
  projectArr: any[];
}

const UpdateForm: React.FC<PropsWithChildren<EditFormProps>> = (props) => {
  const { modalVisible, onCancel, currentRecord, projectArr } = props;
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
            return editModel(currentRecord.model_id, validFields);
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
      form.setFieldValue('model_name', currentRecord?.model_name);
      form.setFieldValue('project_id', currentRecord?.project_id);
    }
  }, [currentRecord]);

  return (
    <Modal
      destroyOnClose
      title="编辑模型"
      width={600}
      open={modalVisible}
      onCancel={() => onCancel()}
      footer={modalFooter}
    >
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} form={form}>
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

export default UpdateForm;
