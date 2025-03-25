import React from 'react';
import { Card, Table, Checkbox, Tag, Space, Button, Modal, Typography, message, Tooltip } from 'antd';
import { DeleteOutlined, LinkOutlined, NumberOutlined } from '@ant-design/icons';
import { SpecialElectrode } from '../types';

interface SpecialElectrodesListProps {
  specialElectrodes: SpecialElectrode[];
  selectedSpecialElectrodes: Set<number>;
  selectedBElectrodeIndices: Set<number>;
  selectedNElectrodeIndices: Set<number>;
  onElectrodeSelect: (index: number, checked: boolean) => void;
  onElectrodesDelete: (indexesToDelete: number[]) => void;
}

// 确保组件声明正确
const SpecialElectrodesList: React.FC<SpecialElectrodesListProps> = ({
  specialElectrodes,
  selectedSpecialElectrodes,
  selectedBElectrodeIndices,
  selectedNElectrodeIndices,
  onElectrodeSelect,
  onElectrodesDelete,
}) => {
  if (specialElectrodes.length === 0) {
    return null;
  }

  return (
    <Card 
      title="特殊电极 (B/N)" 
      style={{ marginBottom: 16 }}
      extra={
        <Typography.Text type="secondary">
          可选择多对B极和N极用于导出数据
        </Typography.Text>
      }
    >
      <Table
        dataSource={specialElectrodes.map((electrode, idx) => ({
          key: idx,
          type: electrode.type,
          x: electrode.position[0],
          y: electrode.position[1],
          z: electrode.position[2],
          source: electrode.fileSource,
          datasetSource: electrode.datasetSource,
          datasetId: electrode.datasetId,
          additionalDatasets: electrode.additionalDatasets,
          mappings: electrode.mappings
        }))}
        columns={[
          {
            title: '选择',
            dataIndex: 'key',
            key: 'select',
            width: 60,
            render: (key: number, record: any) => (
              <Checkbox
                checked={selectedSpecialElectrodes.has(key)}
                onChange={(e) => onElectrodeSelect(key, e.target.checked)}
              />
            )
          },
          { 
            title: '类型', 
            dataIndex: 'type', 
            key: 'type',
            width: 80,
            render: (type: string, record: any) => (
              <>
                {type}
                {selectedBElectrodeIndices.has(record.key) && type === 'B' && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>已选择</Tag>
                )}
                {selectedNElectrodeIndices.has(record.key) && type === 'N' && (
                  <Tag color="green" style={{ marginLeft: 8 }}>已选择</Tag>
                )}
              </>
            )
          },
          { title: 'X(m)', dataIndex: 'x', key: 'x', width: 100 },
          { title: 'Y(m)', dataIndex: 'y', key: 'y', width: 100 },
          { title: 'Z(m)', dataIndex: 'z', key: 'z', width: 100 },
          { title: '来源文件', dataIndex: 'source', key: 'source', width: 180,
            ellipsis: {
              showTitle: false,
            },
            render: (source: string) => (
              <Tooltip title={source}>
                {source}
              </Tooltip>
            )
          },
          { 
            title: '关联数据集', 
            dataIndex: 'datasetSource', 
            key: 'datasetSource',
            width: 200,
            render: (datasetSource: string, record: any) => {
              // 主数据集关联
              const primaryLink = (
                datasetSource ? (
                  <Tooltip title={`主要关联: ${datasetSource}`}>
                    <Tag color="cyan" icon={<LinkOutlined />}>
                      {datasetSource.startsWith('临时关联') ? 
                        '临时关联' : 
                        datasetSource}
                    </Tag>
                  </Tooltip>
                ) : (
                  <Typography.Text type="secondary">未关联</Typography.Text>
                )
              );
              
              // 额外数据集关联
              const additionalLinks = record.additionalDatasets && record.additionalDatasets.length > 0 ? (
                record.additionalDatasets.map((dataset: any, idx: number) => (
                  <Tooltip key={idx} title={`合并集关联: ${dataset.datasetSource}`}>
                    <Tag color="purple" icon={<LinkOutlined />} style={{ marginLeft: 4 }}>
                      {dataset.datasetSource}
                    </Tag>
                  </Tooltip>
                ))
              ) : null;
              
              return (
                <Space size={0} wrap>
                  {primaryLink}
                  {additionalLinks}
                </Space>
              );
            }
          },
          {
            title: '映射行号',
            key: 'mappings',
            width: 250,
            render: (_: any, record: any) => {
              if (!record.mappings || record.mappings.length === 0) {
                return <Typography.Text type="secondary">无映射</Typography.Text>;
              }
              
              return (
                <Space size={[0, 4]} wrap>
                  {record.mappings.map((mapping: any, idx: number) => {
                    // 显示映射信息，优先显示行号范围
                    const rangeText = mapping.indexRange 
                      ? `${mapping.indexRange[0]}-${mapping.indexRange[1]}` 
                      : mapping.mappedIndex.toString();
                    
                    const tooltipTitle = mapping.indexRange
                      ? `在数据集 "${mapping.datasetName}" 中映射到索引 ${mapping.mappedIndex}，行号范围 ${mapping.indexRange[0]}-${mapping.indexRange[1]}`
                      : `在数据集 "${mapping.datasetName}" 中映射到索引 ${mapping.mappedIndex}`;
                    
                    return (
                      <Tooltip key={idx} title={tooltipTitle}>
                        <Tag color="orange" icon={<NumberOutlined />} style={{ marginRight: 4 }}>
                          {mapping.datasetName.length > 8 
                            ? `${mapping.datasetName.substring(0, 8)}..` 
                            : mapping.datasetName}: {rangeText}
                        </Tag>
                      </Tooltip>
                    );
                  })}
                </Space>
              );
            }
          }
        ]}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
      <Space style={{ marginTop: 16 }}>
        <Button 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => {
            if (selectedSpecialElectrodes.size === 0) {
              message.warning('请先选择要删除的电极');
              return;
            }
            
            Modal.confirm({
              title: '确认删除',
              content: `确定要删除选中的 ${selectedSpecialElectrodes.size} 个特殊电极吗？`,
              okText: '删除',
              okType: '危险',
              cancelText: '取消',
              onOk: () => {
                const indexesToDelete = Array.from(selectedSpecialElectrodes);
                onElectrodesDelete(indexesToDelete);
              }
            });
          }}
          disabled={selectedSpecialElectrodes.size === 0}
        >
          删除选中电极
        </Button>
      </Space>
    </Card>
  );
};

// 明确导出默认组件
export default SpecialElectrodesList;