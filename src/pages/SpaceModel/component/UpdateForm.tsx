import { editModel } from '@/services/model/ModelController';
import { Button, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';

interface EditFormProps {
  modalVisible: boolean;
  currentRecord: {
    model_id: number;
    project_id: string;
    model_name: string;
    x_offset?: number;
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
      form.setFieldValue('x_offset', currentRecord?.x_offset ?? 0);
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
        <Form.Item
          label="坐标偏移"
          name="x_offset"
          tooltip="回采位置 X 坐标的校正偏移(m)，随模型导出，供展示系统对齐回采线"
        >
          <InputNumber step={0.01} style={{ width: 220 }} placeholder="默认 0" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UpdateForm;
