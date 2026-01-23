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
    formData.append('model_id', model_id.toString());
    formData.append('file', values.excel.file.originFileObj);

    batchAddPoint(formData)
      .then((res) => {
        onOk();
        message.success(res.message);
      })
      .catch((err) => {
        message.error(err.message);
      });
    form.resetFields();
    onOk();
  };

  const handleCancle = () => {
    form.resetFields();
    onCancel();
  };

  const downloadSample = () => {
    const header = "\uFEFF点位名称,X坐标,Y坐标,Z坐标\n";
    const rows = [
      "P1,100.5,200.3,300.1",
      "P2,150.2,250.6,350.8",
    ].join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "批量导入点位示例.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      open={modalVisible}
      onCancel={handleCancle}
      onOk={handleImport}
      title="批量导入模型点位"
    >
      <div style={{ marginBottom: 16 }}>
        请按照示例文件格式上传数据：
        <Button type="link" onClick={downloadSample} style={{ padding: 0 }}>
          下载示例文件
        </Button>
      </div>
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
