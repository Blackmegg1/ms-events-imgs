import { message } from 'antd';
import * as encoding from 'encoding';
import { MergedDataset, ProcessedMapType, SpecialElectrode } from '../types';

/**
 * 导出数据集为.dat和.csv文件（使用GBK编码）
 */
export const exportDatasetFiles = (
  datasetId: string,
  mergedDatasets: MergedDataset[],
  specialElectrodes: SpecialElectrode[],
  selectedBElectrodeIndex: number | null,
  selectedNElectrodeIndex: number | null
) => {
  // 检查是否选择了所需的特殊电极
  if (selectedBElectrodeIndex === null) {
    message.warning('请先选择一个B极电极');
    return;
  }

  if (selectedNElectrodeIndex === null) {
    message.warning('请先选择一个N极电极');
    return;
  }
  
  const dataset = mergedDatasets.find(ds => ds.id === datasetId);
  if (!dataset) {
    message.error('找不到数据集');
    return;
  }
  
  try {
    const dataToExport = dataset.data;
    const electrodeNumbers = Object.keys(dataToExport)
      .map(n => parseInt(n, 10))
      .sort((a, b) => a - b);
    
    // 获取选中的特殊电极
    const bElectrode = specialElectrodes[selectedBElectrodeIndex];
    const nElectrode = specialElectrodes[selectedNElectrodeIndex];
    
    // 1. 导出DAT文件 - 电流和电压数据
    let datContent = '电流\t  ,';
    
    // 创建DAT文件表头 - "电压N"
    electrodeNumbers.forEach((n, idx) => {
      datContent += `电压${n}\t  `;
      if (idx < electrodeNumbers.length - 1) datContent += ',';
    });
    datContent += '\r\n';
    
    // 收集所有唯一的行ID，按照数字大小排序
    const allRowIds = new Set<number>();
    Object.values(dataToExport).forEach(electrode => {
      Object.keys(electrode.voltage).forEach(rowId => {
        allRowIds.add(parseInt(rowId, 10));
      });
    });
    const sortedRowIds = Array.from(allRowIds).sort((a, b) => a - b);
    
    // 添加数据行
    sortedRowIds.forEach(rowId => {
      // 找到这一行的电流值（假设所有电极在同一行的电流值相同）
      let currentValue = '';
      for (const n of electrodeNumbers) {
        const voltageData = dataToExport[n]?.voltage?.[rowId];
        if (voltageData) {
          currentValue = voltageData[0].toFixed(10);
          break;
        }
      }
      
      datContent += `${currentValue}\t,`;
      
      // 添加每个电极的电压值
      electrodeNumbers.forEach((n, idx) => {
        const voltageData = dataToExport[n]?.voltage?.[rowId];
        const voltageValue = voltageData ? voltageData[1].toFixed(10) : '0.0000000';
        datContent += voltageValue;
        if (idx < electrodeNumbers.length - 1) datContent += '\t,';
      });
      datContent += '\r\n';
    });
    
    // 2. 导出CSV文件 - 坐标数据
    let csvContent = '序号,X(m),Y(m),Z(m)\r\n';
    
    // 添加电极坐标
    electrodeNumbers.forEach(n => {
      const pos = dataToExport[n].pos;
      csvContent += `${n},${pos[0]},${pos[1]},${pos[2]}\r\n`;
    });
    
    // 添加B极和N极坐标
    csvContent += `B,${bElectrode.position[0]},${bElectrode.position[1]},${bElectrode.position[2]}\r\n`;
    csvContent += `N,${nElectrode.position[0]},${nElectrode.position[1]},${nElectrode.position[2]}\r\n`;
    
    // 准备文件名（去除不合法字符）
    const safeFileName = dataset.name.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    
    // 转换为GBK编码
    const datContentGBK = encoding.convert(datContent, 'GBK', 'UTF-8');
    const csvContentGBK = encoding.convert(csvContent, 'GBK', 'UTF-8');
    
    // 创建并下载DAT文件 (使用GBK编码)
    const datBlob = new Blob([datContentGBK], { type: 'application/octet-stream' });
    const datUrl = URL.createObjectURL(datBlob);
    const datLink = document.createElement('a');
    datLink.href = datUrl;
    datLink.download = `${safeFileName}.dat`;
    datLink.style.display = 'none';
    document.body.appendChild(datLink);
    datLink.click();
    
    // 创建并下载CSV文件 (使用GBK编码)
    const csvBlob = new Blob([csvContentGBK], { type: 'application/octet-stream' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `${safeFileName}_坐标.csv`;
    csvLink.style.display = 'none';
    document.body.appendChild(csvLink);
    csvLink.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(datLink);
      document.body.removeChild(csvLink);
      URL.revokeObjectURL(datUrl);
      URL.revokeObjectURL(csvUrl);
    }, 100);
    
    message.success(`已导出 ${safeFileName}.dat 和 ${safeFileName}_坐标.csv`);
  } catch (error: any) {
    message.error(`导出失败: ${error.message}`);
  }
};
