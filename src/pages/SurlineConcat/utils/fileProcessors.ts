import * as encoding from 'encoding';
import { message } from 'antd';
import { 
  DatDataMap, 
  CsvDataMap,
  SpecialElectrode,
} from '../types';

// 解析 .dat 文件
export const parseDatFile = (content: string): DatDataMap => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const result = new Map<string, [number, number]>();
  
  if (lines.length < 2) {
    throw new Error('DAT文件格式错误，至少需要表头和一行数据');
  }
  
  // 处理表头行，提取"电压N"中的N值
  const headerLine = lines[0];
  let isT = false;
  if (!headerLine.includes(','))
    isT = true;
  ;
  let headers: string[];
  if (isT) 
    headers = headerLine.split('\t').map(h => h.trim());
  else
    headers = headerLine.split(',').map(h => h.trim());
  const voltageIndices: number[] = [];
  
  // 查找所有表头中包含"电压"的列，并提取N值
  headers.forEach((header) => {
    // 使用正则表达式提取"电压"后面的数字
    const match = header.match(/电压(\d+)/);
    if (match && match[1]) {
      voltageIndices.push(Number(match[1]));
    } else if (header.includes('电压') && !isNaN(Number(header.replace(/[^0-9]/g, '')))) {
      // 尝试另一种提取方式，移除所有非数字字符
      const num = Number(header.replace(/[^0-9]/g, ''));
      if (num > 0) voltageIndices.push(num);
    }
  });
  
  // 处理数据行
  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    let rowValues: number[];
    if (isT) 
      rowValues = lines[rowIdx].split('\t').map(v => parseFloat(v.trim()));
    else
      rowValues = lines[rowIdx].split(',').map(v => parseFloat(v.trim()));
    
    
    // 确保有足够的数据
    if (rowValues.length < 2) continue;
    
    // 电流值通常在第一列
    const current = rowValues[0];
    
    // 处理每个电压值，将"N-行号"作为键
    voltageIndices.forEach((n, colIdx) => {
      // 电压值在第N+1列（假设第一列是电流）
      if (colIdx + 1 < rowValues.length) {
        const voltage = rowValues[colIdx + 1];
        if (!isNaN(current) && !isNaN(voltage)) {
          // 键格式: "N-行号"
          const key = `${n}-${rowIdx}`;
          result.set(key, [current, voltage]);
        }
      }
    });
  }
  return result;
};

// 解析 .csv 文件
export const parseCsvFile = (content: string, fileName: string = ''): { 
  coordinates: CsvDataMap, 
  specialElectrodes: SpecialElectrode[] 
} => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const result = new Map<number, [number, number, number]>();
  const newSpecialElectrodes: SpecialElectrode[] = [];
  
  // 跳过表头行
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 4) {
      const idPart = parts[0].trim();
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      
      // 检查是否是特殊电极(B或N)
      if (idPart === 'B' || idPart === 'N') {
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          // 检查是否已存在相同坐标的同类型特殊电极
          const exists = newSpecialElectrodes.some(electrode => 
            electrode.type === idPart && 
            Math.abs(electrode.position[0] - x) < 0.0001 && 
            Math.abs(electrode.position[1] - y) < 0.0001 && 
            Math.abs(electrode.position[2] - z) < 0.0001
          );
          
          // 只有当不存在相同坐标的同类型电极时才添加
          if (!exists) {
            newSpecialElectrodes.push({
              type: idPart,
              position: [x, y, z],
              fileSource: fileName
            });
          }
        }
      } else {
        // 常规电极
        const index = parseInt(idPart, 10);
        if (!isNaN(index) && !isNaN(x) && !isNaN(y) && !isNaN(z)) {
          result.set(index, [x, y, z]);
        }
      }
    }
  }
  
  return { coordinates: result, specialElectrodes: newSpecialElectrodes };
};

// 统一文件处理函数
export const processFile = (
  file: File, 
  setDatData: React.Dispatch<React.SetStateAction<DatDataMap>>,
  setCsvData: React.Dispatch<React.SetStateAction<CsvDataMap>>,
  setSpecialElectrodes: React.Dispatch<React.SetStateAction<SpecialElectrode[]>>
): Promise<DatDataMap | { coordinates: CsvDataMap, specialElectrodes: SpecialElectrode[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    if (file.name.endsWith('.dat')) {
      // DAT文件使用ArrayBuffer读取，然后按ANSI(GBK)编码转换
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          // 使用encoding库将GBK编码的Buffer转换为UTF-8字符串
          const content = encoding.convert(new Uint8Array(buffer), 'UTF-8', 'GBK').toString();
          
          const parsedData = parseDatFile(content);
          setDatData(parsedData); // 更新状态
          message.success(`成功解析 .dat 文件: ${file.name}`);
          resolve(parsedData);
        } catch (error: any) {
          message.error(`解析DAT文件失败: ${error.message}`);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        message.error('读取DAT文件时出错');
        reject(new Error('File reading error'));
      };
      
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.csv')) {
      // CSV文件可以使用UTF-8读取
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const { coordinates, specialElectrodes: newSpecialElectrodes } = parseCsvFile(content, file.name);
          setCsvData(coordinates); // 更新坐标状态
          
          // 更新特殊电极状态 - 去重添加
          setSpecialElectrodes(prevElectrodes => {
            const updatedElectrodes = [...prevElectrodes];
            
            // 遍历新解析的特殊电极
            newSpecialElectrodes.forEach(newElectrode => {
              // 检查是否已存在相同坐标的同类型电极
              const existingIndex = updatedElectrodes.findIndex(existing => 
                existing.type === newElectrode.type && 
                Math.abs(existing.position[0] - newElectrode.position[0]) < 0.0001 &&
                Math.abs(existing.position[1] - newElectrode.position[1]) < 0.0001 &&
                Math.abs(existing.position[2] - newElectrode.position[2]) < 0.0001
              );
              
              // 如果不存在，则添加新电极
              if (existingIndex === -1) {
                updatedElectrodes.push(newElectrode);
              }
            });
            
            return updatedElectrodes;
          });
          
          message.success(`成功解析 .csv 文件: ${file.name}`);
          resolve({ coordinates, specialElectrodes: newSpecialElectrodes });
        } catch (error: any) {
          message.error(`解析CSV文件失败: ${error.message}`);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        message.error('读取CSV文件时出错');
        reject(new Error('File reading error'));
      };
      
      reader.readAsText(file);
    } else {
      message.error('不支持的文件格式，请上传 .dat 或 .csv 文件');
      reject(new Error('Unsupported file format'));
    }
  });
};
