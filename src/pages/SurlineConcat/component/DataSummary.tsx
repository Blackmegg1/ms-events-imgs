import React from 'react';
import { Card, Descriptions, Tag, Space } from 'antd';
import { DatDataMap, CsvDataMap, ProcessedMapType, SpecialElectrode } from '../types';

interface DataSummaryProps {
  datData: DatDataMap;
  csvData: CsvDataMap;
  processedMapData: ProcessedMapType;
  selectedDatFile: File | null;
  selectedCsvFile: File | null;
  specialElectrodes: SpecialElectrode[];
  selectedBElectrodeIndex: number | null;
  selectedNElectrodeIndex: number | null;
}

const DataSummary: React.FC<DataSummaryProps> = ({
  datData,
  csvData,
  processedMapData,
  selectedDatFile,
  selectedCsvFile,
  specialElectrodes,
  selectedBElectrodeIndex,
  selectedNElectrodeIndex
}) => {
  return (
    <Card title="数据摘要" style={{ marginBottom: 16 }}>
      <Descriptions bordered>
        <Descriptions.Item label=".dat 文件数据点数">{datData.size}</Descriptions.Item>
        <Descriptions.Item label=".csv 文件坐标点数">{csvData.size}</Descriptions.Item>
        <Descriptions.Item label="选中文件">
          {selectedDatFile?.name || '未选择'} + {selectedCsvFile?.name || '未选择'}
        </Descriptions.Item>
        <Descriptions.Item label="关联后数据点数">
          {Object.values(processedMapData).reduce((count, data) => 
            count + Object.keys(data.voltage).length, 0)}
        </Descriptions.Item>
        <Descriptions.Item label="特殊电极数量" span={2}>
          {specialElectrodes.length} (B: {specialElectrodes.filter(e => e.type === 'B').length}, 
          N: {specialElectrodes.filter(e => e.type === 'N').length})
        </Descriptions.Item>
        <Descriptions.Item label="导出所需电极" span={3}>
          <Space>
            B极: {selectedBElectrodeIndex !== null && specialElectrodes[selectedBElectrodeIndex] ? (
              <Tag color="blue">已选择 ({specialElectrodes[selectedBElectrodeIndex].position.join(', ')})</Tag>
            ) : (
              <Tag color="red">未选择</Tag>
            )}
            N极: {selectedNElectrodeIndex !== null && specialElectrodes[selectedNElectrodeIndex] ? (
              <Tag color="green">已选择 ({specialElectrodes[selectedNElectrodeIndex].position.join(', ')})</Tag>
            ) : (
              <Tag color="red">未选择</Tag>
            )}
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default DataSummary;
