import { PageContainer } from '@ant-design/pro-components';
import { Button, Upload, Table, UploadFile } from 'antd'; // 添加UploadFile类型的导入
import { useState } from 'react';

const HomePage: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]); // 添加文件列表的类型声明

  const handleUpload = ({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList);
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`, // 添加size的类型声明
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
  ];

  return (
    <PageContainer ghost>
      {/* 修改按钮名称 */}
      <Upload
        multiple
        fileList={fileList}
        onChange={handleUpload}
        beforeUpload={() => false} // 阻止自动上传
      >
        <Button type="primary">上传</Button>
      </Upload>
      <Button type="default">合并</Button>
      <Button type="dashed">下载</Button>
      {/* 添加文件列表表格 */}
      <Table columns={columns} dataSource={fileList} rowKey="uid" />
    </PageContainer>
  );
};

export default HomePage;