import { message } from 'antd';
import * as encoding from 'encoding';
import { MergedDataset, ProcessedMapType, SpecialElectrode } from '../types';

/**
 * 导出数据集为.dat和.csv文件（使用GBK编码）
 */
export const exportDatasetFiles = (
  datasetId: string,
  mergedDatasets: MergedDataset[],
  specialElectrodes: SpecialElectrode[]
) => {
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
    
    // 查找与当前数据集关联的所有特殊电极
    const relatedElectrodes = specialElectrodes.filter(electrode => {
      // 检查主关联
      if (electrode.datasetId === datasetId) {
        return true;
      }
      
      // 检查额外关联
      if (electrode.additionalDatasets && electrode.additionalDatasets.length > 0) {
        return electrode.additionalDatasets.some(ds => ds.datasetId === datasetId);
      }
      
      // 检查映射关联
      if (electrode.mappings && electrode.mappings.length > 0) {
        return electrode.mappings.some(m => m.datasetId === datasetId);
      }
      
      return false;
    });
    
    // 分离B极和N极
    const bElectrodes = relatedElectrodes.filter(e => e.type === 'B');
    const nElectrodes = relatedElectrodes.filter(e => e.type === 'N');
    
    if (bElectrodes.length === 0) {
      message.warning('未找到与此数据集关联的B极电极');
    }
    
    if (nElectrodes.length === 0) {
      message.warning('未找到与此数据集关联的N极电极');
    }
    
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
    // 修改CSV表头，添加起始行号和结束行号列
    let csvContent = '序号,X(m),Y(m),Z(m),起始行号,结束行号\r\n';
    
    // 添加电极坐标
    electrodeNumbers.forEach(n => {
      const pos = dataToExport[n].pos;
      csvContent += `${n},${pos[0]},${pos[1]},${pos[2]},,\r\n`;
    });
    
    // 添加所有关联的B极电极
    bElectrodes.forEach(bElectrode => {
      // 获取映射行号范围
      let bStartRow = '';
      let bEndRow = '';
      if (bElectrode.mappings && bElectrode.mappings.length > 0) {
        const bMapping = bElectrode.mappings.find(m => m.datasetId === datasetId);
        if (bMapping && bMapping.indexRange) {
          bStartRow = bMapping.indexRange[0].toString();
          bEndRow = bMapping.indexRange[1].toString();
        }
      }
      
      csvContent += `B,${bElectrode.position[0]},${bElectrode.position[1]},${bElectrode.position[2]},${bStartRow},${bEndRow}\r\n`;
    });
    
    // 添加所有关联的N极电极
    nElectrodes.forEach(nElectrode => {
      // 获取映射行号范围
      let nStartRow = '';
      let nEndRow = '';
      if (nElectrode.mappings && nElectrode.mappings.length > 0) {
        const nMapping = nElectrode.mappings.find(m => m.datasetId === datasetId);
        if (nMapping && nMapping.indexRange) {
          nStartRow = nMapping.indexRange[0].toString();
          nEndRow = nMapping.indexRange[1].toString();
        }
      }
      
      csvContent += `N,${nElectrode.position[0]},${nElectrode.position[1]},${nElectrode.position[2]},${nStartRow},${nEndRow}\r\n`;
    });
    
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
    
    message.success(`已导出 ${safeFileName}.dat 和 ${safeFileName}_坐标.csv（包含${bElectrodes.length}个B极和${nElectrodes.length}个N极）`);
  } catch (error: any) {
    message.error(`导出失败: ${error.message}`);
  }
};
