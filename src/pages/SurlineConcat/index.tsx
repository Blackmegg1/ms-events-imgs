import { PageContainer } from '@ant-design/pro-components';
import { Button, Upload, Table, UploadFile, message, Space, Card, Divider, Descriptions, Tag, Input, Modal, List, Typography, Checkbox } from 'antd';
import { useState } from 'react';
import { InboxOutlined, DownOutlined, RightOutlined, CheckCircleOutlined, SaveOutlined, DeleteOutlined, MergeCellsOutlined } from '@ant-design/icons';
// 需要安装: npm install encoding text-encoding
import * as encoding from 'encoding';

// 定义新的数据结构接口
// 键为"N-行号"格式，值为[电流, 电压]数组
type DatDataMap = Map<string, [number, number]>; // 保留原有格式用于解析

// 使用Map存储CSV数据，键为索引，值为坐标数组[x,y,z]
type CsvDataMap = Map<number, [number, number, number]>;

// 定义processedMap的类型
type ProcessedMapType = {
  [key: number]: {
    pos: [number, number, number],
    voltage: {
      [key: number]: [number, number] // 改为number类型键
    }
  }
};

// 表格数据展示使用的接口
interface TableDisplayData {
  key: string;
  index: number;
  x: number;
  y: number;
  z: number;
  current: number;
  voltage: number;
  rowId: number; // 改为number类型
}

// 新的表格数据展示接口，适用于矩阵形式展示
interface MatrixDisplayData {
  rowId: string | number; // 修改为string|number，因为坐标行仍使用"x","y","z"
  current: string; // 电流值
  [electrodeName: string]: any; // 动态列，每列是一个电极
}

// 定义合并数据集类型
interface MergedDataset {
  id: string;
  name: string;
  timestamp: number;
  datFileName: string;
  csvFileName: string;
  data: ProcessedMapType;
}

// 添加特殊电极类型
type SpecialElectrode = {
  type: string; // 'B' 或 'N'
  position: [number, number, number];
  fileSource: string; // 来源文件名
};

const { Dragger } = Upload;

// 解析 .dat 文件 - 重写为新的解析逻辑
const parseDatFile = (content: string): DatDataMap => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const result = new Map<string, [number, number]>();
  
  if (lines.length < 2) {
    throw new Error('DAT文件格式错误，至少需要表头和一行数据');
  }
  
  // 处理表头行，提取"电压N"中的N值
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim());
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
    const rowValues = lines[rowIdx].split(',').map(v => parseFloat(v.trim()));
    
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
          // 键格式: "N-行号"，仍保留原格式但稍后会解析为数字
          const key = `${n}-${rowIdx}`;
          result.set(key, [current, voltage]);
        }
      }
    });
  }
  return result;
};

// 解析 .csv 文件 - 修改为返回Map结构和特殊电极
const parseCsvFile = (content: string, fileName: string = ''): { 
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
          newSpecialElectrodes.push({
            type: idPart,
            position: [x, y, z],
            fileSource: fileName
          });
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

const HomePage: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [datData, setDatData] = useState<DatDataMap>(new Map());
  const [csvData, setCsvData] = useState<CsvDataMap>(new Map());
  // 删除combinedData，只保留processedMapData
  const [processedMapData, setProcessedMapData] = useState<ProcessedMapType>({});
  const [processing, setProcessing] = useState<boolean>(false);
  // 添加表格展开/收起状态
  const [tableExpanded, setTableExpanded] = useState<boolean>(true);
  
  // 添加选中文件状态
  const [selectedDatFile, setSelectedDatFile] = useState<File | null>(null);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [selectedDatUid, setSelectedDatUid] = useState<string | null>(null);
  const [selectedCsvUid, setSelectedCsvUid] = useState<string | null>(null);
  // 添加复选框选择状态
  const [selectedFileUids, setSelectedFileUids] = useState<Set<string>>(new Set());

  // 添加保存合并数据的状态
  const [mergedDatasets, setMergedDatasets] = useState<MergedDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [saveModalVisible, setSaveModalVisible] = useState<boolean>(false);
  const [datasetName, setDatasetName] = useState<string>('');
  
  // 添加多选数据集的状态
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<string>>(new Set());
  const [mergeModalVisible, setMergeModalVisible] = useState<boolean>(false);
  const [mergedSetName, setMergedSetName] = useState<string>('');

  // 添加特殊电极状态
  const [specialElectrodes, setSpecialElectrodes] = useState<SpecialElectrode[]>([]);
  const [selectedSpecialElectrodes, setSelectedSpecialElectrodes] = useState<Set<number>>(new Set());

  // 添加状态记录选择的B极和N极
  const [selectedBElectrodeIndex, setSelectedBElectrodeIndex] = useState<number | null>(null);
  const [selectedNElectrodeIndex, setSelectedNElectrodeIndex] = useState<number | null>(null);

  // 处理文件上传
  const handleUpload = ({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList);
  };

  // 处理文件复选框选择
  const handleFileSelect = (file: UploadFile, checked: boolean) => {
    const newSelectedFileUids = new Set(selectedFileUids);
    
    if (checked) {
      // 检查文件类型
      if (file.name.endsWith('.dat')) {
        // 如果已经选了一个dat文件，不允许再选
        if (selectedDatUid !== null) {
          message.warning('已经选择了一个.dat文件');
          return;
        }
        setSelectedDatUid(file.uid);
        if (file.originFileObj) setSelectedDatFile(file.originFileObj);
      } else if (file.name.endsWith('.csv')) {
        // 如果已经选了一个csv文件，不允许再选
        if (selectedCsvUid !== null) {
          message.warning('已经选择了一个.csv文件');
          return;
        }
        setSelectedCsvUid(file.uid);
        if (file.originFileObj) setSelectedCsvFile(file.originFileObj);
      } else {
        message.warning('只能选择.dat或.csv文件');
        return;
      }
      
      newSelectedFileUids.add(file.uid);
    } else {
      // 取消选择
      newSelectedFileUids.delete(file.uid);
      
      if (file.uid === selectedDatUid) {
        setSelectedDatUid(null);
        setSelectedDatFile(null);
      } else if (file.uid === selectedCsvUid) {
        setSelectedCsvUid(null);
        setSelectedCsvFile(null);
      }
    }
    
    setSelectedFileUids(newSelectedFileUids);
  };

  // 修改processFile函数，让它返回解析后的数据
  const processFile = (file: File): Promise<DatDataMap | { coordinates: CsvDataMap, specialElectrodes: SpecialElectrode[] }> => {
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
            setDatData(parsedData); // 仍然更新状态
            message.success(`成功解析 .dat 文件: ${file.name}`);
            resolve(parsedData); // 返回解析后的数据
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
            
            // 更新特殊电极状态
            setSpecialElectrodes(prevElectrodes => [...prevElectrodes, ...newSpecialElectrodes]);
            
            message.success(`成功解析 .csv 文件: ${file.name}`);
            resolve({ coordinates, specialElectrodes: newSpecialElectrodes }); // 返回解析后的数据
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

  // 清除选择
  const clearSelection = () => {
    setSelectedDatFile(null);
    setSelectedCsvFile(null);
    setSelectedDatUid(null);
    setSelectedCsvUid(null);
    setSelectedFileUids(new Set());
  };

  // 修改associateData函数，使用返回的解析结果
  const associateData = async () => {
    if (!selectedDatFile || !selectedCsvFile) {
      message.warning('请先选择一个.dat文件和一个.csv文件');
      return;
    }

    setProcessing(true);
    
    try {
      // 先解析CSV文件并获取结果
      message.info('正在解析CSV文件...');
      const csvResult = await processFile(selectedCsvFile) as { coordinates: CsvDataMap, specialElectrodes: SpecialElectrode[] };
      const csvParsedData = csvResult.coordinates;
      
      // 再解析DAT文件并获取结果
      message.info('正在解析DAT文件...');
      const datParsedData = await processFile(selectedDatFile) as DatDataMap;
      
      if (csvParsedData.size === 0 || datParsedData.size === 0) {
        throw new Error('文件解析失败');
      }
      
      // 创建新的数据结构
      const processedMap: ProcessedMapType = {};
      
      // 遍历dat数据Map - 使用解析结果而不是状态
      datParsedData.forEach(([current, voltage], key) => {
        // 从key中分离N和行号
        const [nStr, rowIdxStr] = key.split('-');
        const n = parseInt(nStr, 10);
        const rowIdx = parseInt(rowIdxStr, 10); // 将行号解析为数字
        
        // 如果N是有效数字，查找对应坐标
        if (!isNaN(n) && csvParsedData.has(n)) {
          const [x, y, z] = csvParsedData.get(n)!;
          
          // 初始化该n的数据结构（如果不存在）
          if (!processedMap[n]) {
            processedMap[n] = {
              pos: [x, y, z],
              voltage: {}
            };
          }
          
          // 添加电流和电压数据，使用数字类型行号
          processedMap[n].voltage[rowIdx] = [current, voltage];
        }
      });
      
      console.log('处理后的数据结构:', processedMap);
      
      // 设置processedMapData
      setProcessedMapData(processedMap);
      message.success('数据关联成功！');

      // 自动清除选择
      clearSelection();
    } catch (error: any) {
      message.error(`数据关联失败: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 将processedMapData转换为表格可显示的格式
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTableData = (): TableDisplayData[] => {
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

  // 下载合并后的数据 - 使用processedMapData并更新CSV格式
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const downloadData = () => {
    if (Object.keys(processedMapData).length === 0) {
      message.warning('没有可下载的数据，请先合并数据');
      return;
    }

    try {
      // 获取表格数据并准备下载
      const { data, columns } = getMatrixTableData();
      
      // 创建CSV内容，从表格数据生成
      const headers = columns.map(col => col.title).join(',');
      let csvContent = headers + '\n';
      
      // 添加每一行数据
      data.forEach(row => {
        const values = columns.map(col => row[col.dataIndex] !== undefined ? row[col.dataIndex] : '');
        csvContent += values.join(',') + '\n';
      });
      
      // 创建下载链接
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'combined_data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('数据下载成功！');
    } catch (error: any) {
      message.error(`下载失败: ${error.message}`);
    }
  };

  // 保存当前关联结果
  const saveCurrentResult = () => {
    if (Object.keys(processedMapData).length === 0) {
      message.warning('没有可保存的数据，请先关联数据');
      return;
    }
    
    // 显示保存对话框
    setDatasetName(`关联-${new Date().toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric', 
      minute: 'numeric'
    })}`);
    setSaveModalVisible(true);
  };
  
  // 确认保存数据集
  const handleSaveDataset = () => {
    if (!datasetName.trim()) {
      message.warning('请输入数据集名称');
      return;
    }
    
    const newDataset: MergedDataset = {
      id: `dataset-${Date.now()}`,
      name: datasetName,
      timestamp: Date.now(),
      datFileName: selectedDatFile?.name || '未知文件',
      csvFileName: selectedCsvFile?.name || '未知文件',
      data: { ...processedMapData }
    };
    
    setMergedDatasets([...mergedDatasets, newDataset]);
    setSelectedDatasetId(newDataset.id);
    message.success(`数据集 "${datasetName}" 已保存`);
    setSaveModalVisible(false);
  };
  
  // 选择数据集
  const selectDataset = (datasetId: string) => {
    const dataset = mergedDatasets.find(ds => ds.id === datasetId);
    if (dataset) {
      setProcessedMapData(dataset.data);
      setSelectedDatasetId(datasetId);
    }
  };
  
  // 删除数据集
  const deleteDataset = (datasetId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个数据集吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const newDatasets = mergedDatasets.filter(ds => ds.id !== datasetId);
        setMergedDatasets(newDatasets);
        
        // 如果删除的是当前选中的数据集，重置选择
        if (datasetId === selectedDatasetId) {
          setSelectedDatasetId(null);
          setProcessedMapData({});
        }
        
        message.success('数据集已删除');
      }
    });
  };

  // 处理数据集选择框改变
  const handleDatasetCheckboxChange = (datasetId: string, checked: boolean) => {
    const newSelected = new Set(selectedDatasetIds);
    if (checked) {
      newSelected.add(datasetId);
    } else {
      newSelected.delete(datasetId);
    }
    setSelectedDatasetIds(newSelected);
  };
  
  // 合并多个选中的数据集
  const mergeSelectedDatasets = () => {
    if (selectedDatasetIds.size < 2) {
      message.warning('请至少选择两个数据集进行合并');
      return;
    }
    
    // 显示合并命名对话框
    setMergedSetName(`合并集-${new Date().toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric', 
      minute: 'numeric'
    })}`);
    setMergeModalVisible(true);
  };
  
  // 确认合并多个数据集
  const handleMergeDatasets = () => {
    try {
      // 获取所有选中的数据集
      const datasetsToMerge = mergedDatasets.filter(ds => selectedDatasetIds.has(ds.id));
      if (datasetsToMerge.length < 2) {
        throw new Error('至少需要两个数据集才能合并');
      }
      
      // 创建新的合并后的数据结构
      const mergedData: ProcessedMapType = {};
      
      // 确保有序处理数据集
      datasetsToMerge.sort((a, b) => {
        // 根据被选中的顺序排序
        const aIndex = Array.from(selectedDatasetIds).indexOf(a.id);
        const bIndex = Array.from(selectedDatasetIds).indexOf(b.id);
        return aIndex - bIndex;
      });

      // 存储所有已处理的电极坐标，用于后续查找匹配
      const processedElectrodes: {[key: number]: [number, number, number]} = {};
      
      // 记录最大的电极索引，用于生成新的连续索引
      let maxElectrodeIndex = 0;
      
      // 处理第一个数据集作为基准
      const firstDataset = datasetsToMerge[0];
      const firstDatasetElectrodes = Object.entries(firstDataset.data);
      
      // 为第一个数据集创建索引映射
      const firstIndexMapping: {[originalIndex: string]: number} = {};
      let newElectrodeIndex = 1; // 从1开始编号
      
      // 第一个数据集的电极从1开始重新编号
      firstDatasetElectrodes.forEach(([originalIndex, _]) => {
        firstIndexMapping[originalIndex] = newElectrodeIndex++;
      });
      
      console.log('第一个数据集索引映射:', firstIndexMapping);
      
      // 应用第一个数据集的映射
      firstDatasetElectrodes.forEach(([originalIndex, data]) => {
        const newIndex = firstIndexMapping[originalIndex];
        
        // 保存电极坐标用于后续匹配
        processedElectrodes[newIndex] = [...data.pos];
        
        // 复制位置数据到合并结果
        mergedData[newIndex] = {
          pos: [...data.pos],
          voltage: {}
        };
        
        // 处理电压数据，同时调整行号
        Object.entries(data.voltage).forEach(([rowIdStr, values]) => {
          const rowId = parseInt(rowIdStr, 10);
          let newRowId = rowId;
          
          // 对行号也应用相同的映射规则（如果可以）
          if (firstIndexMapping[rowId.toString()]) {
            newRowId = firstIndexMapping[rowId.toString()];
          }
          
          // 添加电压数据
          mergedData[newIndex].voltage[newRowId] = values;
        });
        
        // 更新最大电极索引
        if (newIndex > maxElectrodeIndex) {
          maxElectrodeIndex = newIndex;
        }
      });
      
      // 处理其余数据集
      for (let datasetIdx = 1; datasetIdx < datasetsToMerge.length; datasetIdx++) {
        const currentDataset = datasetsToMerge[datasetIdx];
        const currentElectrodes = Object.entries(currentDataset.data);
        
        // 为当前数据集创建映射关系
        const indexMapping: {[originalIndex: string]: number} = {};
        const matchedElectrodes: Set<string> = new Set(); // 记录已匹配到坐标的电极
        
        // 第一步：查找坐标匹配的电极
        currentElectrodes.forEach(([originalIndex, data]) => {
          const electrodePos = data.pos;
          let matched = false;
          
          // 检查是否与已有电极坐标匹配
          for (const [existingIndex, pos] of Object.entries(processedElectrodes)) {
            if (
              Math.abs(electrodePos[0] - pos[0]) < 0.0001 &&
              Math.abs(electrodePos[1] - pos[1]) < 0.0001 &&
              Math.abs(electrodePos[2] - pos[2]) < 0.0001
            ) {
              // 找到匹配的电极，映射到已有索引
              indexMapping[originalIndex] = parseInt(existingIndex, 10);
              matchedElectrodes.add(originalIndex);
              matched = true;
              break;
            }
          }
          
          // 如果没有匹配，则分配新索引
          if (!matched) {
            const newIndex = maxElectrodeIndex + 1; // 使用局部变量来避免闭包问题
            indexMapping[originalIndex] = newIndex;
            
            // 保存新电极坐标供后续查找
            processedElectrodes[newIndex] = [...electrodePos];
            
            // 安全更新maxElectrodeIndex
            maxElectrodeIndex = newIndex;
          }
        });
        
        console.log(`第${datasetIdx + 1}个数据集索引映射:`, indexMapping);
        console.log(`匹配的电极数量: ${matchedElectrodes.size}/${currentElectrodes.length}`);
        
        // 应用映射，处理当前数据集
        currentElectrodes.forEach(([originalIndex, data]) => {
          const newIndex = indexMapping[originalIndex];
          
          // 如果是新电极，创建新电极数据
          if (!mergedData[newIndex]) {
            mergedData[newIndex] = {
              pos: [...data.pos],
              voltage: {}
            };
          }
          
          // 处理电压数据
          Object.entries(data.voltage).forEach(([rowIdStr, values]) => {
            const rowId = parseInt(rowIdStr, 10);
            let newRowId = rowId;
            
            // 对行号也应用相同的映射规则（如果可以）
            if (indexMapping[rowId.toString()]) {
              // 如果行号可以映射到新索引，使用映射后的索引
              newRowId = indexMapping[rowId.toString()];
            } else {
              // 否则使用偏移量确保不同数据集的行号不冲突
              newRowId = rowId + datasetIdx * 1000;
            }
            
            // 添加电压数据
            mergedData[newIndex].voltage[newRowId] = values;
          });
        });
      }
      
      // 创建新的数据集
      const newDataset: MergedDataset = {
        id: `dataset-${Date.now()}`,
        name: mergedSetName,
        timestamp: Date.now(),
        datFileName: '多个数据集合并',
        csvFileName: '多个数据集合并',
        data: mergedData
      };
      
      // 添加到数据集列表并选中
      setMergedDatasets([...mergedDatasets, newDataset]);
      setSelectedDatasetId(newDataset.id);
      setProcessedMapData(mergedData);
      
      // 清除选择
      setSelectedDatasetIds(new Set());
      setMergeModalVisible(false);
      message.success(`成功合并${datasetsToMerge.length}个数据集`);
      
    } catch (error: any) {
      message.error(`合并失败: ${error.message}`);
    }
  };

  // 表格列定义 - 修改为使用复选框
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const columns = [
    {
      title: '选择',
      dataIndex: 'select',
      key: 'select',
      width: 60,
      render: (_: any, record: UploadFile) => (
        <Checkbox 
          checked={selectedFileUids.has(record.uid)}
          onChange={(e) => handleFileSelect(record, e.target.checked)}
          disabled={
            // 如果当前文件未选中且已经选择了同类型的文件，禁用复选框
            (!selectedFileUids.has(record.uid) && 
             ((record.name.endsWith('.dat') && selectedDatUid !== null) ||
              (record.name.endsWith('.csv') && selectedCsvUid !== null))) ||
            // 或者不是.dat或.csv文件
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    }
    // 删除操作列，不再需要解析和选择按钮
  ];

  // 更新合并数据的表格列定义
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const combinedColumns = [
    {
      title: '索引',
      dataIndex: 'index',
      key: 'index',
    },
    {
      title: 'X(m)',
      dataIndex: 'x',
      key: 'x',
    },
    {
      title: 'Y(m)',
      dataIndex: 'y',
      key: 'y',
    },
    {
      title: 'Z(m)',
      dataIndex: 'z',
      key: 'z',
    },
    {
      title: '行号',
      dataIndex: 'rowId',
      key: 'rowId',
    },
    {
      title: '电流',
      dataIndex: 'current',
      key: 'current',
    },
    {
      title: '电压',
      dataIndex: 'voltage',
      key: 'voltage',
    }
  ];

  // 修改特殊电极选择处理函数
  const handleSpecialElectrodeSelect = (index: number, checked: boolean) => {
    const electrode = specialElectrodes[index];
    const newSelected = new Set(selectedSpecialElectrodes);
    
    if (checked) {
      // 检查是否已选择了相同类型的电极
      if (electrode.type === 'B') {
        if (selectedBElectrodeIndex !== null) {
          // 取消之前选择的B极
          newSelected.delete(selectedBElectrodeIndex);
        }
        setSelectedBElectrodeIndex(index);
      } else if (electrode.type === 'N') {
        if (selectedNElectrodeIndex !== null) {
          // 取消之前选择的N极
          newSelected.delete(selectedNElectrodeIndex);
        }
        setSelectedNElectrodeIndex(index);
      }
      newSelected.add(index);
    } else {
      // 取消选择
      newSelected.delete(index);
      if (index === selectedBElectrodeIndex) {
        setSelectedBElectrodeIndex(null);
      } else if (index === selectedNElectrodeIndex) {
        setSelectedNElectrodeIndex(null);
      }
    }
    
    setSelectedSpecialElectrodes(newSelected);
  };

  // 导出数据集为两个文件（.dat和.csv），使用GBK编码
  const exportDatasetFiles = (datasetId: string) => {
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
      datContent += '\n';
      
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
        
        datContent += `${currentValue},`;
        
        // 添加每个电极的电压值
        electrodeNumbers.forEach((n, idx) => {
          const voltageData = dataToExport[n]?.voltage?.[rowId];
          const voltageValue = voltageData ? voltageData[1].toFixed(10) : '0.0000000';
          datContent += voltageValue;
          if (idx < electrodeNumbers.length - 1) datContent += ',';
        });
        datContent += '\n';
      });
      
      // 2. 导出CSV文件 - 坐标数据
      let csvContent = '索引,X(m),Y(m),Z(m)\n';
      
      // 添加电极坐标
      electrodeNumbers.forEach(n => {
        const pos = dataToExport[n].pos;
        csvContent += `${n},${pos[0]},${pos[1]},${pos[2]}\n`;
      });
      
      // 添加B极和N极坐标
      csvContent += `B,${bElectrode.position[0]},${bElectrode.position[1]},${bElectrode.position[2]}\n`;
      csvContent += `N,${nElectrode.position[0]},${nElectrode.position[1]},${nElectrode.position[2]}\n`;
      
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

  // 添加删除文件的处理函数
  const handleDeleteFile = (uid: string) => {
    // 更新文件列表
    const updatedFiles = fileList.filter(file => file.uid !== uid);
    setFileList(updatedFiles);

    // 如果删除的是已选择的文件，清除相应选择状态
    if (uid === selectedDatUid) {
      setSelectedDatUid(null);
      setSelectedDatFile(null);
    } else if (uid === selectedCsvUid) {
      setSelectedCsvUid(null);
      setSelectedCsvFile(null);
    }

    // 从选中集合中移除
    const newSelectedFileUids = new Set(selectedFileUids);
    newSelectedFileUids.delete(uid);
    setSelectedFileUids(newSelectedFileUids);
  };

  // 添加特殊电极显示组件
  const SpecialElectrodesList = () => {
    if (specialElectrodes.length === 0) {
      return null;
    }
    
    return (
      <Card 
        title="特殊电极 (B/N)" 
        style={{ marginBottom: 16 }}
        extra={
          <Typography.Text type="secondary">
            请选择一个B极和一个N极用于导出数据
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
            source: electrode.fileSource
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
                  onChange={(e) => handleSpecialElectrodeSelect(key, e.target.checked)}
                />
              )
            },
            { 
              title: '类型', 
              dataIndex: 'type', 
              key: 'type',
              render: (type: string, record: any) => (
                <>
                  {type}
                  {record.key === selectedBElectrodeIndex && type === 'B' && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>已选择</Tag>
                  )}
                  {record.key === selectedNElectrodeIndex && type === 'N' && (
                    <Tag color="green" style={{ marginLeft: 8 }}>已选择</Tag>
                  )}
                </>
              )
            },
            { title: 'X(m)', dataIndex: 'x', key: 'x' },
            { title: 'Y(m)', dataIndex: 'y', key: 'y' },
            { title: 'Z(m)', dataIndex: 'z', key: 'z' },
            { title: '来源', dataIndex: 'source', key: 'source' },
          ]}
          pagination={false}
          size="small"
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
                okType: 'danger',
                cancelText: '取消',
                onOk: () => {
                  // 更新选中的B极和N极索引
                  if (selectedBElectrodeIndex !== null && selectedSpecialElectrodes.has(selectedBElectrodeIndex)) {
                    setSelectedBElectrodeIndex(null);
                  }
                  if (selectedNElectrodeIndex !== null && selectedSpecialElectrodes.has(selectedNElectrodeIndex)) {
                    setSelectedNElectrodeIndex(null);
                  }
                  
                  const newElectrodes = specialElectrodes.filter((_, idx) => 
                    !selectedSpecialElectrodes.has(idx)
                  );
                  setSpecialElectrodes(newElectrodes);
                  setSelectedSpecialElectrodes(new Set());
                  message.success('删除成功');
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

  // 修改数据集列表，添加导出按钮
  const renderDatasetList = () => {
    return (
      <List
        bordered
        dataSource={mergedDatasets}
        renderItem={item => (
          <List.Item
            key={item.id}
            actions={[
              <Button 
                key="export"
                type="link" 
                onClick={() => exportDatasetFiles(item.id)}
                title="必须选择一个B极和一个N极才能导出"
              >
                导出
              </Button>,
              <Button key="view" type="link" onClick={() => selectDataset(item.id)}>查看</Button>,
              <Button key="delete" type="link" danger onClick={() => deleteDataset(item.id)}><DeleteOutlined /></Button>
            ]}
            style={{ 
              backgroundColor: item.id === selectedDatasetId ? '#e6f7ff' : 'transparent'
            }}
          >
            <Checkbox
              checked={selectedDatasetIds.has(item.id)}
              onChange={(e) => handleDatasetCheckboxChange(item.id, e.target.checked)}
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
                    数据点数: {
                      Object.values(item.data).reduce(
                        (count, data) => count + Object.keys(data.voltage).length, 0
                      )
                    }
                  </Typography.Text>
                </Space>
              }
            />
            {item.id === selectedDatasetId && (
              <Tag color="blue">当前选中</Tag>
            )}
          </List.Item>
        )}
        locale={{ emptyText: '暂无保存的数据集，请合并并保存数据' }}
      />
    );
  };

  // 修改数据摘要卡片，显示已选择的B/N极
  const renderDataSummary = () => {
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
              B极: {selectedBElectrodeIndex !== null ? (
                <Tag color="blue">已选择 ({specialElectrodes[selectedBElectrodeIndex].position.join(', ')})</Tag>
              ) : (
                <Tag color="red">未选择</Tag>
              )}
              N极: {selectedNElectrodeIndex !== null ? (
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
                onChange={(e) => handleFileSelect(record, e.target.checked)}
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
                onClick={() => handleDeleteFile(record.uid)}
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
    <PageContainer ghost>
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
            onClick={associateData} 
            disabled={!selectedDatFile || !selectedCsvFile || processing}
          >
            关联选中的文件
          </Button>
          <Button 
            danger 
            onClick={clearSelection}
            disabled={!selectedDatFile && !selectedCsvFile}
          >
            清除选择
          </Button>
        </Space>
        
        {/* 使用自定义文件列表 */}
        {fileList.length > 0 && renderFileList()}
      </Card>
      
      <Card title="已关联的数据集" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<MergeCellsOutlined />}
            onClick={mergeSelectedDatasets}
            disabled={selectedDatasetIds.size < 2}
          >
            合并电法数据
          </Button>
          <Typography.Text type="secondary">
            {selectedDatasetIds.size > 0 ? `已选择 ${selectedDatasetIds.size} 个数据集` : '选择多个数据集进行合并'}
          </Typography.Text>
        </Space>
        
        {renderDatasetList()}
      </Card>
      
      {renderDataSummary()}
      
      {/* 添加特殊电极列表组件 */}
      <SpecialElectrodesList />
      
      {Object.keys(processedMapData).length > 0 && (
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
              onClick={saveCurrentResult}
              disabled={Object.keys(processedMapData).length === 0}
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
              pagination={false} // 禁用分页以便查看所有数据
              bordered
            />
          )}
        </Card>
      )}
      
      {/* 保存数据集的模态框 */}
      <Modal
        title="保存数据集"
        open={saveModalVisible}
        onOk={handleSaveDataset}
        onCancel={() => setSaveModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>请为此数据集命名：</Typography.Text>
          <Input 
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="请输入数据集名称"
            maxLength={50}
          />
        </Space>
      </Modal>
      
      {/* 合并多个数据集的模态框 */}
      <Modal
        title="合并多个数据集"
        open={mergeModalVisible}
        onOk={handleMergeDatasets}
        onCancel={() => setMergeModalVisible(false)}
        okText="合并"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>
            您将合并 {selectedDatasetIds.size} 个数据集。请为合并后的数据集命名：
          </Typography.Text>
          <Input 
            value={mergedSetName}
            onChange={(e) => setMergedSetName(e.target.value)}
            placeholder="请输入合并后的数据集名称"
            maxLength={50}
          />
          <Typography.Text type="secondary">
            选中的数据集：
            {Array.from(selectedDatasetIds).map(id => {
              const ds = mergedDatasets.find(d => d.id === id);
              return ds ? ` "${ds.name}"` : '';
            }).join(',')}
          </Typography.Text>
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default HomePage;