import eventServices from '@/services/event';
import { Button, DatePicker, Form, Modal, Select, Upload, message } from 'antd';
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
  const [options, setOptions] = useState([]);

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
    formData.append('time', values.date.format('YYYY-MM-DD'));

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

  return (
    <Modal
      open={modalVisible}
      onCancel={handleCancle}
      onOk={handleImport}
      title="批量导入微震事件"
    >
      <Form form={form} layout="horizontal">
        <Form.Item name="project_id" label="所属工程" required>
          <Select options={options} />
        </Form.Item>
        <Form.Item name="excel" label="CSV文件" required>
          <Upload>
            <Button>点击上传</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="date" label="发震日期" required>
          <DatePicker />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BatchImport;
