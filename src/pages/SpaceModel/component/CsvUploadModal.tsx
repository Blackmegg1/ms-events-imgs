import { uploadModelCsv } from '@/services/model/ModelController';
import { InboxOutlined } from '@ant-design/icons';
import { Modal, Upload, message, Button } from 'antd';
import React, { useState } from 'react';

const { Dragger } = Upload;

interface CsvUploadModalProps {
    modalVisible: boolean;
    onCancel: () => void;
    currentRecord: any;
}

const CsvUploadModal: React.FC<CsvUploadModalProps> = (props) => {
    const { modalVisible, onCancel, currentRecord } = props;
    const [fileList, setFileList] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.error('请选择文件');
            return;
        }

        setUploading(true);
        try {
            await uploadModelCsv(currentRecord.model_id, fileList[0] as any);
            message.success('上传成功');
            setFileList([]);
            onCancel();
        } catch (error) {
            message.error('上传失败');
        } finally {
            setUploading(false);
        }
    };

    const uploadProps = {
        onRemove: (file: any) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
        beforeUpload: (file: any) => {
            setFileList([file]);
            return false;
        },
        fileList,
        accept: '.csv',
    };

    const downloadSample = () => {
        const header = "\uFEFF测点,X,Y,Z\n";
        const rows = [
            "1,-200,-10,-875.18",
            "2,-195,-10,-876.58",
            "3,-190,-10,-878.09"
        ].join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "模型参数示例.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Modal
            title="上传模型CSV数据"
            open={modalVisible}
            onOk={handleUpload}
            onCancel={onCancel}
            confirmLoading={uploading}
            destroyOnClose
        >
            <div style={{ marginBottom: 16 }}>
                请按照示例文件格式上传数据：
                <Button type="link" onClick={downloadSample} style={{ padding: 0 }}>
                    下载示例文件
                </Button>
            </div>
            <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或将文件拖拽到此区域上传</p>
                <p className="ant-upload-hint">支持 .csv 文件，包含大量的点用于构造基准面</p>
            </Dragger>
        </Modal>
    );
};

export default CsvUploadModal;
