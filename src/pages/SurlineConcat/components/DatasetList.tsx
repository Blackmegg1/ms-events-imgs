import { DeleteOutlined, MergeCellsOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, List, Space, Tag, Typography } from 'antd';
import React from 'react';
import { MergedDataset } from '../types';

// 组件属性接口
interface DatasetListProps {
  mergedDatasets: MergedDataset[];
  selectedDatasetId: string | null;
  selectedDatasetIds: Set<string>;
  onDatasetSelect: (datasetId: string) => void;
  onDatasetDelete: (datasetId: string) => void;
  onDatasetCheckboxChange: (datasetId: string, checked: boolean) => void;
  onMergeSelectedDatasets: () => void;
  onExportDataset: (datasetId: string) => void;
  onShowElectrodeScatter: (datasetId: string) => void;
}

const DatasetList: React.FC<DatasetListProps> = ({
  mergedDatasets,
  selectedDatasetId,
  selectedDatasetIds,
  onDatasetSelect,
  onDatasetDelete,
  onDatasetCheckboxChange,
  onMergeSelectedDatasets,
  onExportDataset,
  onShowElectrodeScatter,
}) => {
  return (
    <Card title="已关联的数据集" style={{ marginBottom: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<MergeCellsOutlined />}
          onClick={onMergeSelectedDatasets}
          disabled={selectedDatasetIds.size < 2}
        >
          合并电法数据
        </Button>
        <Typography.Text type="secondary">
          {selectedDatasetIds.size > 0
            ? `已选择 ${selectedDatasetIds.size} 个数据集`
            : '选择多个数据集进行合并'}
        </Typography.Text>
      </Space>

      <List
        bordered
        dataSource={mergedDatasets}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              <Button
                key="export"
                type="link"
                onClick={() => onExportDataset(item.id)}
                title="必须选择一个B极和一个N极才能导出"
              >
                导出
              </Button>,
              <Button
                key="view"
                type="link"
                onClick={() => onDatasetSelect(item.id)}
              >
                查看
              </Button>,
              <Button
                key="view"
                type="link"
                onClick={() => onShowElectrodeScatter(item.id)}
              >
                电极分布图
              </Button>,
              <Button
                key="delete"
                type="link"
                danger
                onClick={() => onDatasetDelete(item.id)}
              >
                <DeleteOutlined />
              </Button>,
            ]}
            style={{
              backgroundColor:
                item.id === selectedDatasetId ? '#e6f7ff' : 'transparent',
            }}
          >
            <Checkbox
              checked={selectedDatasetIds.has(item.id)}
              onChange={(e) =>
                onDatasetCheckboxChange(item.id, e.target.checked)
              }
              style={{ marginRight: 12 }}
            />
            <List.Item.Meta
              title={<Typography.Text strong>{item.name}</Typography.Text>}
              description={
                <Space direction="vertical" size="small">
                  <Typography.Text type="secondary">
                    合并于: {new Date(item.timestamp).toLocaleString('zh-CN')}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    文件: {item.datFileName} + {item.csvFileName}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    数据点数:{' '}
                    {Object.values(item.data).reduce(
                      (count, data) => count + Object.keys(data.voltage).length,
                      0,
                    )}
                  </Typography.Text>
                </Space>
              }
            />
            {item.id === selectedDatasetId && <Tag color="blue">当前选中</Tag>}
          </List.Item>
        )}
        locale={{ emptyText: '暂无保存的数据集，请合并并保存数据' }}
      />
    </Card>
  );
};

export default DatasetList;
