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
