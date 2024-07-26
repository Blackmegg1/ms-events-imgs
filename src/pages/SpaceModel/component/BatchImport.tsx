import { batchAddPoint } from '@/services/point/PointController';
import { Button, Form, Modal, Upload, message } from 'antd';
import React, { PropsWithChildren } from 'react';

interface BatchImportProps {
  modalVisible: boolean;
  onCancel: () => void;
  onOk: () => void;
  model_id: number;
}

const BatchImport: React.FC<PropsWithChildren<BatchImportProps>> = ({
  modalVisible,
  onCancel,
  onOk,
  model_id,
}) => {
  const [form] = Form.useForm();

  const handleImport = () => {
    const values = form.getFieldsValue();
    console.log(values);

    const formData = new FormData();
    formData.append('model_id', model_id);
    formData.append('file', values.excel.file.originFileObj);

    batchAddPoint(formData)
      .then((res) => {
        onOk();
        message.success(res.message);
      })
      .catch((err) => {
        message.error(err.message);
      });
    onOk();
  };

  const handleCancle = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      open={modalVisible}
      onCancel={handleCancle}
      onOk={handleImport}
      title="批量导入模型点位"
    >
      <Form form={form} layout="horizontal">
        <Form.Item name="excel" label="CSV文件" required>
          <Upload>
            <Button>点击上传</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BatchImport;
