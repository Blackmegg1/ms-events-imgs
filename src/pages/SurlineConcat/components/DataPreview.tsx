import React from 'react';
import { Button, Table, Card, Tag } from 'antd';
import { DownOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons';
import { ProcessedMapType, MergedDataset, MatrixDisplayData } from '../types';

interface DataPreviewProps {
  processedMapData: ProcessedMapType;
  tableExpanded: boolean;
  setTableExpanded: (expanded: boolean) => void;
  selectedDatasetId: string | null;
  mergedDatasets: MergedDataset[];
  onSave: () => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({
  processedMapData,
  tableExpanded,
  setTableExpanded,
  selectedDatasetId,
  mergedDatasets,
  onSave,
}) => {
  // 将processedMapData转换为矩阵表格格式
  const getMatrixTableData = (): { data: MatrixDisplayData[], columns: any[] } => {
    // 如果没有数据，返回空结果
    if (Object.keys(processedMapData).length === 0) {
      return { data: [], columns: [] };
    }

    // 获取所有电极编号并排序
    const electrodeNumbers = Object.keys(processedMapData)
      .map(n => parseInt(n, 10))
      .sort((a, b) => a - b);

    // 创建表格列配置
    const tableColumns = [
      {
        title: '行号',
        dataIndex: 'rowId',
        key: 'rowId',
        fixed: 'left',
        width: 80,
      },
      {
        title: '电流',
        dataIndex: 'current',
        key: 'current', 
        fixed: 'left',
        width: 100,
      },
      ...electrodeNumbers.map(n => ({
        title: `电极${n}`,
        dataIndex: `electrode${n}`,
        key: `electrode${n}`,
      })),
    ];

    // 创建坐标行数据
    const xRow: MatrixDisplayData = { rowId: 'x', current: '' };
    const yRow: MatrixDisplayData = { rowId: 'y', current: '' };
    const zRow: MatrixDisplayData = { rowId: 'z', current: '' };

    // 填充坐标数据
    electrodeNumbers.forEach(n => {
      const pos = processedMapData[n].pos;
      xRow[`electrode${n}`] = pos[0];
      yRow[`electrode${n}`] = pos[1];
      zRow[`electrode${n}`] = pos[2];
    });

    // 收集所有唯一的行号
    const allRowIds = new Set<number>();
    Object.values(processedMapData).forEach(electrode => {
      Object.keys(electrode.voltage).forEach(rowId => {
        allRowIds.add(parseInt(rowId, 10)); // 将字符串行号转换为数字
      });
    });

    // 将行号排序
    const sortedRowIds = Array.from(allRowIds).sort((a, b) => a - b);

    // 创建数据行
    const dataRows: MatrixDisplayData[] = sortedRowIds.map(rowId => {
      // 找到这一行的第一个有效电流值（所有电极在同一行的电流值应该相同）
      let currentValue = '';
      for (const n of electrodeNumbers) {
        const voltageData = processedMapData[n]?.voltage?.[rowId];
        if (voltageData) {
          currentValue = voltageData[0].toString();
          break;
        }
      }

      const row: MatrixDisplayData = { 
        rowId,
        current: currentValue 
      };
      
      // 填充每个电极的电压数据(不再包括电流)
      electrodeNumbers.forEach(n => {
        const voltageData = processedMapData[n]?.voltage?.[rowId];
        if (voltageData) {
          // 只显示电压值
          row[`electrode${n}`] = voltageData[1];
        } else {
          row[`electrode${n}`] = '-'; // 没有数据时显示短横线
        }
      });
      
      return row;
    });

    // 组合所有行
    const tableData = [
      xRow,
      yRow,
      zRow,
      ...dataRows
    ];

    return { data: tableData, columns: tableColumns };
  };

  // 如果没有数据则不显示组件
  if (Object.keys(processedMapData).length === 0) {
    return null;
  }

  return (
    <Card 
      title={
        <div style={{ cursor: 'pointer' }} onClick={() => setTableExpanded(!tableExpanded)}>
          {tableExpanded ? <DownOutlined /> : <RightOutlined />} 关联数据预览
          {selectedDatasetId && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {mergedDatasets.find(ds => ds.id === selectedDatasetId)?.name || ''}
            </Tag>
          )}
        </div>
      }
      extra={
        <Button 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={onSave}
        >
          保存当前关联结果
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      {tableExpanded && (
        <Table 
          columns={getMatrixTableData().columns}
          dataSource={getMatrixTableData().data} 
          rowKey="rowId"
          scroll={{ x: 'max-content' }}
          pagination={false}
          bordered
        />
      )}
    </Card>
  );
};

export default DataPreview;
