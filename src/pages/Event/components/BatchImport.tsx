import eventServices from '@/services/event';
import { Button, Form, Modal, Select, Upload, message } from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

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

  const getImportFile = async (file: File) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      return file;
    }

    if (!fileName.endsWith('.xlsx')) {
      throw new Error('仅支持 CSV 或 XLSX 文件');
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('XLSX 文件中没有可导入的工作表');
    }
    const firstSheet = workbook.Sheets[firstSheetName];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    const csvFileName = file.name.replace(/\.xlsx$/i, '.csv');

    return new File([`\uFEFF${csv}`], csvFileName, {
      type: 'text/csv;charset=utf-8;',
    });
  };

  const handleImport = async () => {
    const values = form.getFieldsValue();
    console.log(values);
    const uploadFileInfo = values.excel?.file || values.excel?.fileList?.[0];
    const uploadFile = (uploadFileInfo?.originFileObj ||
      uploadFileInfo) as File | undefined;

    if (!values.project_id) {
      message.warning('请选择所属工程！');
      return;
    }

    if (!uploadFile) {
      message.warning('请上传 CSV 或 XLSX 文件！');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('project_id', values.project_id);
      formData.append('file', await getImportFile(uploadFile));
      const res = await batchAddEvent(formData);
      onOk();
      message.success(res.message);
    } catch (err: any) {
      message.error(err.message);
    }
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
        <Form.Item
          name="excel"
          label="CSV/XLSX文件"
          required
          getValueFromEvent={(event) => event}
        >
          <Upload accept=".csv,.xlsx" beforeUpload={() => false} maxCount={1}>
            <Button>点击上传</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BatchImport;
