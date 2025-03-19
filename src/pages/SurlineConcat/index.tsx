import { PageContainer } from '@ant-design/pro-components';
import { Button, Upload, Table, UploadFile, message, Space, Card, Divider, Descriptions, Tag, Input, Modal, List, Typography, Checkbox } from 'antd';
import { useState } from 'react';
import { InboxOutlined, DownOutlined, RightOutlined, CheckCircleOutlined, SaveOutlined, DeleteOutlined, MergeCellsOutlined } from '@ant-design/icons';
// 需要安装: npm install encoding text-encoding
import * as encoding from 'encoding';
// 修改导入路径，指向本地组件
import FileUploader from './component/FileUploader';
import DataSummary from './component/DataSummary';
import DataPreview from './component/DataPreview';
import DatasetList from './component/DatasetList';
// 导入特殊电极列表组件
import SpecialElectrodesList from './component/SpecialElectrodesList';
// 导入类型定义
import { 
  DatDataMap, 
  CsvDataMap, 
  ProcessedMapType, 
  TableDisplayData, 
  // 删除未使用的类型
  MergedDataset, 
  SpecialElectrode 
} from './types';

// 导入工具函数
import { processFile } from './utils/fileProcessors';
import { handleFileSelect, handleDeleteFile, clearFileSelection } from './utils/fileSelectors';
// 导入合并数据集的工具函数
import { mergeDatasets } from './utils/mergeHelpers';
// 导入导出数据集的工具函数
import { exportDatasetFiles } from './utils/exportHelpers';

const { Dragger } = Upload;

// 删除冗余的 parseDatFile 和 parseCsvFile 函数，因为它们已经在 utils/fileProcessors 中实现

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

  // 添加状态记录最后成功关联的文件名
  const [lastDatFileName, setLastDatFileName] = useState<string>('');
  const [lastCsvFileName, setLastCsvFileName] = useState<string>('');

  // 使用导入的工具函数处理文件选择
  const handleFileSelectWrapper = (file: UploadFile, checked: boolean) => {
    handleFileSelect(
      file, 
      checked, 
      selectedFileUids, 
      setSelectedFileUids,
      selectedDatUid,
      setSelectedDatUid,
      selectedCsvUid,
      setSelectedCsvUid,
      setSelectedDatFile,
      setSelectedCsvFile
    );
  };

  // 清除选择
  const clearSelection = () => {
    clearFileSelection(
      setSelectedDatFile,
      setSelectedCsvFile,
      setSelectedDatUid,
      setSelectedCsvUid,
      setSelectedFileUids
    );
  };

  // 使用导入的工具函数处理文件删除
  const handleDeleteFileWrapper = (uid: string) => {
    handleDeleteFile(
      uid,
      fileList,
      setFileList,
      selectedDatUid,
      setSelectedDatUid,
      selectedCsvUid,
      setSelectedCsvUid,
      setSelectedDatFile,
      setSelectedCsvFile,
      selectedFileUids,
      setSelectedFileUids
    );
  };

  // 修改associateData函数，使用导入的处理文件函数
  const associateData = async () => {
    if (!selectedDatFile || !selectedCsvFile) {
      message.warning('请先选择一个.dat文件和一个.csv文件');
      return;
    }

    setProcessing(true);
    
    try {
      // 先保存当前选中的文件名
      const currentDatFileName = selectedDatFile.name;
      const currentCsvFileName = selectedCsvFile.name;
      
      // 先解析CSV文件并获取结果
      message.info('正在解析CSV文件...');
      const csvResult = await processFile(selectedCsvFile, setDatData, setCsvData, setSpecialElectrodes) as { 
        coordinates: CsvDataMap, 
        specialElectrodes: SpecialElectrode[] 
      };
      const csvParsedData = csvResult.coordinates;
      
      // 再解析DAT文件并获取结果
      message.info('正在解析DAT文件...');
      const datParsedData = await processFile(selectedDatFile, setDatData, setCsvData, setSpecialElectrodes) as DatDataMap;
      
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
      
      // 保存成功关联的文件名
      setLastDatFileName(currentDatFileName);
      setLastCsvFileName(currentCsvFileName);
      
      message.success('数据关联成功！');

      // 自动清除选择
      clearSelection();
    } catch (error: any) {
      message.error(`数据关联失败: ${error.message}`);
    } finally {
      setProcessing(false);
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
      datFileName: lastDatFileName || '未知文件',  // 使用保存的文件名
      csvFileName: lastCsvFileName || '未知文件',  // 使用保存的文件名
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
  
  // 确认合并多个数据集 - 使用工具函数替代原始实现
  const handleMergeDatasets = () => {
    const newDataset = mergeDatasets(selectedDatasetIds, mergedDatasets, mergedSetName);
    
    if (newDataset) {
      // 添加到数据集列表并选中
      setMergedDatasets([...mergedDatasets, newDataset]);
      setSelectedDatasetId(newDataset.id);
      setProcessedMapData(newDataset.data);
      
      // 清除选择
      setSelectedDatasetIds(new Set());
      setMergeModalVisible(false);
    }
  };

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
  const handleExportDataset = (datasetId: string) => {
    exportDatasetFiles(
      datasetId,
      mergedDatasets,
      specialElectrodes,
      selectedBElectrodeIndex,
      selectedNElectrodeIndex
    );
  };

  // 添加处理删除特殊电极的函数
  const handleDeleteSpecialElectrodes = (indexesToDelete: number[]) => {
    // 更新选中的B极和N极索引
    if (selectedBElectrodeIndex !== null && indexesToDelete.includes(selectedBElectrodeIndex)) {
      setSelectedBElectrodeIndex(null);
    }
    if (selectedNElectrodeIndex !== null && indexesToDelete.includes(selectedNElectrodeIndex)) {
      setSelectedNElectrodeIndex(null);
    }
    
    const newElectrodes = specialElectrodes.filter((_, idx) => 
      !indexesToDelete.includes(idx)
    );
    setSpecialElectrodes(newElectrodes);
    setSelectedSpecialElectrodes(new Set());
    message.success('删除成功');
  };

  return (
    <PageContainer ghost>
      {/* 替换原来的上传组件为新组件 */}
      <FileUploader
        fileList={fileList}
        selectedDatUid={selectedDatUid}
        selectedCsvUid={selectedCsvUid}
        selectedFileUids={selectedFileUids}
        onFileListChange={setFileList}
        onFileSelect={handleFileSelectWrapper}
        onDeleteFile={handleDeleteFileWrapper}
        onClearSelection={clearSelection}
        onAssociateData={associateData}
        processing={processing}
      />
      
      <DatasetList 
        mergedDatasets={mergedDatasets}
        selectedDatasetId={selectedDatasetId}
        selectedDatasetIds={selectedDatasetIds}
        onDatasetSelect={selectDataset}
        onDatasetDelete={deleteDataset}
        onDatasetCheckboxChange={handleDatasetCheckboxChange}
        onMergeSelectedDatasets={mergeSelectedDatasets}
        onExportDataset={handleExportDataset}
      />
      
      {/* 替换为DataSummary组件 */}
      <DataSummary 
        datData={datData}
        csvData={csvData}
        processedMapData={processedMapData}
        selectedDatFile={selectedDatFile}
        selectedCsvFile={selectedCsvFile}
        specialElectrodes={specialElectrodes}
        selectedBElectrodeIndex={selectedBElectrodeIndex}
        selectedNElectrodeIndex={selectedNElectrodeIndex}
      />
      
      {/* 使用独立的特殊电极列表组件 */}
      <SpecialElectrodesList
        specialElectrodes={specialElectrodes}
        selectedSpecialElectrodes={selectedSpecialElectrodes}
        selectedBElectrodeIndex={selectedBElectrodeIndex}
        selectedNElectrodeIndex={selectedNElectrodeIndex}
        onElectrodeSelect={handleSpecialElectrodeSelect}
        onElectrodesDelete={handleDeleteSpecialElectrodes}
      />
      
      {/* 使用新的DataPreview组件 */}
      <DataPreview 
        processedMapData={processedMapData}
        tableExpanded={tableExpanded}
        setTableExpanded={setTableExpanded}
        selectedDatasetId={selectedDatasetId}
        mergedDatasets={mergedDatasets}
        onSave={saveCurrentResult}
      />
      
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