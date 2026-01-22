import { uploadModelCsv } from '@/services/model/ModelController';
import { InboxOutlined } from '@ant-design/icons';
import { Modal, Upload, message } from 'antd';
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

    return (
        <Modal
            title="上传模型CSV点位数据"
            open={modalVisible}
            onOk={handleUpload}
            onCancel={onCancel}
            confirmLoading={uploading}
            destroyOnClose
        >
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
