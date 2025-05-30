import { message } from 'antd';
import { ProcessedMapType, MergedDataset, SpecialElectrode, ElectrodeMapping } from '../types';

/**
 * 合并多个数据集
 * @param selectedDatasetIds 选中的数据集ID集合
 * @param mergedDatasets 所有数据集列表
 * @param mergedSetName 合并后的数据集名称
 * @param specialElectrodes 特殊电极列表 (可选)
 * @param setSpecialElectrodes 更新特殊电极的函数 (可选)
 * @returns 合并后的新数据集对象或null（如果合并失败）
 */
export const mergeDatasets = (
  selectedDatasetIds: Set<string>,
  mergedDatasets: MergedDataset[],
  mergedSetName: string,
  specialElectrodes?: SpecialElectrode[],
  setSpecialElectrodes?: React.Dispatch<React.SetStateAction<SpecialElectrode[]>>
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
    
    // 创建索引映射记录，用于跟踪每个原始电极映射到的新索引
    // 格式: { 数据集ID: { 原始索引: 新索引 } }
    const indexMappingByDataset: Record<string, Record<string, number>> = {};
    
    // 记录每个数据集在合并数据集中的行号范围
    // 格式: { 数据集ID: [开始行号, 结束行号] }
    const datasetRanges: Record<string, [number, number]> = {};
    
    // 处理所有数据集
    for (let datasetIdx = 0; datasetIdx < datasetsToMerge.length; datasetIdx++) {
      const currentDataset = datasetsToMerge[datasetIdx];
      const currentElectrodes = Object.entries(currentDataset.data);
      
      // 记录当前数据集开始的行号
      const startIndex = currentElectrodeIndex + 1;
      
      // 为当前数据集创建索引映射
      const indexMapping: {[originalIndex: string]: number} = {};
      
      // 为所有电极分配新索引，不考虑坐标匹配
      currentElectrodes.forEach(([originalIndex, _]) => {
        currentElectrodeIndex++;
        indexMapping[originalIndex] = currentElectrodeIndex;
      });
      
      // 存储当前数据集的映射关系
      indexMappingByDataset[currentDataset.id] = indexMapping;
      
      // 记录当前数据集的行号范围
      datasetRanges[currentDataset.id] = [startIndex, currentElectrodeIndex];
      
      console.log(`第${datasetIdx + 1}个数据集索引映射:`, indexMapping);
      console.log(`第${datasetIdx + 1}个数据集行号范围:`, datasetRanges[currentDataset.id]);
      
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
    
    // 若传入了特殊电极列表和设置函数，更新特殊电极关联
    if (specialElectrodes && setSpecialElectrodes) {
      // 遍历特殊电极数组，为与合并源数据集关联的电极添加到新数据集的关联
      setSpecialElectrodes(prevElectrodes => {
        let updatedCount = 0;
        let mappedCount = 0;
        
        const updatedElectrodes = prevElectrodes.map(electrode => {
          // 检查电极是否与被合并的任何数据集有关联
          // 1. 检查主数据集关联
          let primaryDatasetLinked = Array.from(selectedDatasetIds).includes(electrode.datasetId || '');
          
          // 2. 检查额外数据集关联
          let additionalDatasetsLinked = false;
          if (electrode.additionalDatasets && electrode.additionalDatasets.length > 0) {
            for (const ds of electrode.additionalDatasets) {
              if (selectedDatasetIds.has(ds.datasetId)) {
                additionalDatasetsLinked = true;
                break;
              }
            }
          }
          
          // 3. 如果任何一种关联存在，则添加新关联和映射
          if (primaryDatasetLinked || additionalDatasetsLinked) {
            updatedCount++;
            
            // 查找与特殊电极相关的所有被合并的数据集
            const relatedDatasetIds = new Set<string>();
            
            // 添加主数据集ID（如果被合并）
            if (primaryDatasetLinked) {
              relatedDatasetIds.add(electrode.datasetId || '');
            }
            
            // 添加额外数据集ID（如果被合并）
            if (electrode.additionalDatasets) {
              for (const ds of electrode.additionalDatasets) {
                if (selectedDatasetIds.has(ds.datasetId)) {
                  relatedDatasetIds.add(ds.datasetId);
                }
              }
            }
            
            const mappings: ElectrodeMapping[] = [];
            
            // 为每个关联的数据集寻找映射
            for (const relatedDatasetId of relatedDatasetIds) {
              // 获取该数据集在合并数据集中的行号范围
              const indexRange = datasetRanges[relatedDatasetId];
              
              // 检查与该电极关联的数据集是否有映射关系
              if (indexMappingByDataset[relatedDatasetId]) {
                // 获取电极在原始数据集中的行号范围
                const originalElectrodeRange = electrode.mappings?.find(
                  mapping => mapping.datasetId === relatedDatasetId
                )?.indexRange || [0, 0];
                
                if (originalElectrodeRange && originalElectrodeRange[0] && originalElectrodeRange[1]) {
                  // 映射原始行号范围到新的行号范围
                  const startMapped = indexMappingByDataset[relatedDatasetId][originalElectrodeRange[0].toString()];
                  const endMapped = indexMappingByDataset[relatedDatasetId][originalElectrodeRange[1].toString()];
                  
                  // 如果可以找到映射的行号
                  if (startMapped && endMapped) {
                    // 创建映射信息
                    mappings.push({
                      datasetId: newDataset.id,
                      datasetName: newDataset.name,
                      mappedIndex: startMapped, // 使用起始行作为主映射索引
                      indexRange: [startMapped, endMapped]
                    });
                  } else {
                    // 如果无法直接映射行号，使用整个数据集的行号范围
                    mappings.push({
                      datasetId: newDataset.id,
                      datasetName: newDataset.name,
                      mappedIndex: indexRange[0], // 使用数据集起始行
                      indexRange: indexRange
                    });
                  }
                } else {
                  // 如果没有原始行号范围，使用整个数据集的行号范围
                  mappings.push({
                    datasetId: newDataset.id,
                    datasetName: newDataset.name,
                    mappedIndex: indexRange[0],
                    indexRange: indexRange
                  });
                }
              }
            }
            
            // 创建电极的拷贝，保持原有关联的同时添加新的关联
            return {
              ...electrode,
              // 添加新合并数据集关联，不管是否已经有关联
              additionalDatasets: [
                ...(electrode.additionalDatasets || []),
                {
                  datasetId: newDataset.id,
                  datasetSource: mergedSetName
                }
              ],
              // 添加映射信息
              mappings: [
                ...(electrode.mappings || []),
                ...mappings
              ]
            };
          }
          return electrode;
        });
        
        if (updatedCount > 0) {
          message.info(`已将${updatedCount}个特殊电极关联到新合并的数据集，成功映射${mappedCount}个电极索引`);
        }
        
        return updatedElectrodes;
      });
    }
    
    message.success(`成功合并${datasetsToMerge.length}个数据集`);
    return newDataset;
    
  } catch (error: any) {
    message.error(`合并失败: ${error.message}`);
    return null;
  }
};
