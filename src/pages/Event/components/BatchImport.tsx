import eventServices from '@/services/event';
import { Button, Form, Modal, Select, Upload, message } from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';

const { batchAddEvent } = eventServices.EventController;

interface BatchImportProps {
  modalVisible: boolean;
  onCancel: () => void;
  onOk: () => void;
  projectDist: any;
}

const BatchImport: React.FC<PropsWithChildren<BatchImportProps>> = ({
  modalVisible,
  onCancel,
  onOk,
  projectDist,
}) => {
  const [form] = Form.useForm();
  const [options, setOptions] = useState<any[]>([]);

  useEffect(() => {
    if (projectDist !== null) {
      let tmp = Object.keys(projectDist).map((key) => {
        return {
          value: key,
          label: projectDist[key].text,
        };
      });
      setOptions(tmp);
    }
  }, [projectDist]);

  const handleImport = () => {
    const values = form.getFieldsValue();
    console.log(values);

    const formData = new FormData();
    formData.append('project_id', values.project_id);
    formData.append('file', values.excel.file.originFileObj);

    batchAddEvent(formData)
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

  const downloadSample = () => {
    const header = "\uFEFF发震时刻,x,y,z,能量(KJ),震级(M)\n";
    const rows = [
      "2023-10-27 10:00:00,100.5,200.3,300.1,5.5,1.2",
      "2023-10-27 11:30:00,150.2,250.6,350.8,8.2,2.1",
    ].join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "微震事件示例.csv");
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
      title="批量导入微震事件"
    >
      <div style={{ marginBottom: 16 }}>
        请按照示例文件格式上传数据：
        <Button type="link" onClick={downloadSample} style={{ padding: 0 }}>
          下载示例文件
        </Button>
      </div>
      <Form form={form} layout="horizontal">
        <Form.Item name="project_id" label="所属工程" required>
          <Select options={options} />
        </Form.Item>
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
