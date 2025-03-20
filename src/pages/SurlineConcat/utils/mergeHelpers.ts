import { message } from 'antd';
import { ProcessedMapType, MergedDataset } from '../types';

/**
 * 合并多个数据集
 * @param selectedDatasetIds 选中的数据集ID集合
 * @param mergedDatasets 所有数据集列表
 * @param mergedSetName 合并后的数据集名称
 * @returns 合并后的新数据集对象或null（如果合并失败）
 */
export const mergeDatasets = (
  selectedDatasetIds: Set<string>,
  mergedDatasets: MergedDataset[],
  mergedSetName: string
): MergedDataset | null => {
  try {
    // 获取所有选中的数据集
    const datasetsToMerge = mergedDatasets.filter(ds => selectedDatasetIds.has(ds.id));
    if (datasetsToMerge.length < 2) {
      message.warning('至少需要两个数据集才能合并');
      return null;
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

    // 记录当前最新的电极索引，用于分配新索引
    let currentElectrodeIndex = 0;
    
    // 处理所有数据集
    for (let datasetIdx = 0; datasetIdx < datasetsToMerge.length; datasetIdx++) {
      const currentDataset = datasetsToMerge[datasetIdx];
      const currentElectrodes = Object.entries(currentDataset.data);
      
      // 为当前数据集创建索引映射
      const indexMapping: {[originalIndex: string]: number} = {};
      
      // 为所有电极分配新索引，不考虑坐标匹配
      currentElectrodes.forEach(([originalIndex, _]) => {
        currentElectrodeIndex++;
        indexMapping[originalIndex] = currentElectrodeIndex;
      });
      
      console.log(`第${datasetIdx + 1}个数据集索引映射:`, indexMapping);
      
      // 应用映射，处理当前数据集
      currentElectrodes.forEach(([originalIndex, data]) => {
        const newIndex = indexMapping[originalIndex];
        
        // 创建新电极数据
        mergedData[newIndex] = {
          pos: [...data.pos],
          voltage: {}
        };
        
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
    // 收集被合并的数据集名称
    const datasetNames = datasetsToMerge.map(ds => ds.name);
    // 组合数据集名称（限制长度，避免太长）
    const combinedName = datasetNames.length > 2 
      ? `${datasetNames[0]}等${datasetNames.length}个数据集`
      : datasetNames.join(' + ');
      
    const newDataset: MergedDataset = {
      id: `dataset-${Date.now()}`,
      name: mergedSetName,
      timestamp: Date.now(),
      datFileName: combinedName,  // 使用组合后的名称
      csvFileName: combinedName,  // 使用组合后的名称
      data: mergedData
    };
    
    message.success(`成功合并${datasetsToMerge.length}个数据集`);
    return newDataset;
    
  } catch (error: any) {
    message.error(`合并失败: ${error.message}`);
    return null;
  }
};
