import { Button, Upload, UploadFile, message, Space, Divider, Card, Table, Tag, Checkbox } from 'antd';
import { InboxOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';

interface FileUploaderProps {
  fileList: UploadFile[];
  selectedDatUid: string | null;
  selectedCsvUid: string | null;
  selectedFileUids: Set<string>;
  onFileListChange: (fileList: UploadFile[]) => void;
  onFileSelect: (file: UploadFile, checked: boolean) => void;
  onDeleteFile: (uid: string) => void;
  onClearSelection: () => void;
  onAssociateData: () => void;
  processing: boolean;
}

const { Dragger } = Upload;

const FileUploader: React.FC<FileUploaderProps> = ({
  fileList,
  selectedDatUid,
  selectedCsvUid,
  selectedFileUids,
  onFileListChange,
  onFileSelect,
  onDeleteFile,
  onClearSelection,
  onAssociateData,
  processing
}) => {
  // 处理文件上传
  const handleUpload = ({ fileList }: { fileList: UploadFile[] }) => {
    onFileListChange(fileList);
  };

  // 自定义文件列表渲染
  const renderFileList = () => {
    return (
      <Table
        columns={[
          {
            title: '选择',
            dataIndex: 'select',
            key: 'select',
            width: 60,
            render: (_: any, record: UploadFile) => (
              <Checkbox 
                checked={selectedFileUids.has(record.uid)}
                onChange={(e) => onFileSelect(record, e.target.checked)}
                disabled={
                  (!selectedFileUids.has(record.uid) && 
                  ((record.name.endsWith('.dat') && selectedDatUid !== null) ||
                    (record.name.endsWith('.csv') && selectedCsvUid !== null))) ||
                  !(record.name.endsWith('.dat') || record.name.endsWith('.csv'))
                }
              />
            ),
          },
          {
            title: '文件名',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: UploadFile) => (
              <Space>
                {name}
                {record.uid === selectedDatUid && <Tag color="blue"><CheckCircleOutlined /> 已选择(.dat)</Tag>}
                {record.uid === selectedCsvUid && <Tag color="green"><CheckCircleOutlined /> 已选择(.csv)</Tag>}
              </Space>
            ),
          },
          {
            title: '大小',
            dataIndex: 'size',
            key: 'size',
            render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
          },
          {
            title: '操作',
            key: 'action',
            width: 80,
            render: (_: any, record: UploadFile) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDeleteFile(record.uid)}
              />
            ),
          }
        ]}
        dataSource={fileList}
        rowKey="uid"
        size="small"
        pagination={false}
      />
    );
  };

  return (
    <Card title="文件上传" style={{ marginBottom: 16 }}>
      <Dragger
        multiple
        fileList={fileList}
        onChange={handleUpload}
        beforeUpload={() => false} // 阻止自动上传
        showUploadList={false} // 隐藏默认的上传列表
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">支持上传 .dat 和 .csv 格式的电测测线数据和坐标文件</p>
      </Dragger>
      
      <Divider />
      
      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          onClick={onAssociateData} 
          disabled={!selectedDatUid || !selectedCsvUid || processing}
        >
          关联选中的文件
        </Button>
        <Button 
          danger 
          onClick={onClearSelection}
          disabled={!selectedDatUid && !selectedCsvUid}
        >
          清除选择
        </Button>
      </Space>
      
      {fileList.length > 0 && renderFileList()}
    </Card>
  );
};

export default FileUploader;
