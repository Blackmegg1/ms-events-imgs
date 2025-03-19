import { ProcessedMapType, TableDisplayData, MatrixDisplayData } from '../types';

// 将processedMapData转换为表格可显示的格式
export const getTableData = (processedMapData: ProcessedMapType): TableDisplayData[] => {
  const tableData: TableDisplayData[] = [];
  
  Object.entries(processedMapData).forEach(([indexStr, data]) => {
    const index = parseInt(indexStr, 10);
    const [x, y, z] = data.pos;
    
    // 将每个电压点展开为单独的表格行
    Object.entries(data.voltage).forEach(([rowIdStr, [current, voltage]]) => {
      const rowId = parseInt(rowIdStr, 10); // 将行号解析为数字
      tableData.push({
        key: `${index}-${rowId}`,
        index,
        x,
        y,
        z,
        current,
        voltage,
        rowId
      });
    });
  });
  
  return tableData;
};

// 将processedMapData转换为矩阵表格格式
export const getMatrixTableData = (processedMapData: ProcessedMapType): { data: MatrixDisplayData[], columns: any[] } => {
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
      allRowIds.add(parseInt(rowId, 10)); 
    });
  });

  // 将行号排序
  const sortedRowIds = Array.from(allRowIds).sort((a, b) => a - b);

  // 创建数据行
  const dataRows: MatrixDisplayData[] = sortedRowIds.map(rowId => {
    // 找到这一行的第一个有效电流值
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
    
    // 填充每个电极的电压数据
    electrodeNumbers.forEach(n => {
      const voltageData = processedMapData[n]?.voltage?.[rowId];
      if (voltageData) {
        row[`electrode${n}`] = voltageData[1];
      } else {
        row[`electrode${n}`] = '-';
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
