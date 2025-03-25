import { message } from 'antd';
import { SpecialElectrode } from '../types';

/**
 * 处理特殊电极的选择
 */
export const handleSpecialElectrodeSelect = (
  index: number, 
  checked: boolean,
  selectedSpecialElectrodes: Set<number>,
  setSelectedSpecialElectrodes: React.Dispatch<React.SetStateAction<Set<number>>>,
  selectedBElectrodeIndices: Set<number>,
  setSelectedBElectrodeIndices: React.Dispatch<React.SetStateAction<Set<number>>>,
  selectedNElectrodeIndices: Set<number>,
  setSelectedNElectrodeIndices: React.Dispatch<React.SetStateAction<Set<number>>>,
  specialElectrodes: SpecialElectrode[]
) => {
  const electrode = specialElectrodes[index];
  const newSelected = new Set(selectedSpecialElectrodes);
  
  if (checked) {
    // 添加到选择列表
    newSelected.add(index);
    
    // 根据类型添加到相应集合
    if (electrode.type === 'B') {
      const newBIndices = new Set(selectedBElectrodeIndices);
      newBIndices.add(index);
      setSelectedBElectrodeIndices(newBIndices);
    } else if (electrode.type === 'N') {
      const newNIndices = new Set(selectedNElectrodeIndices);
      newNIndices.add(index);
      setSelectedNElectrodeIndices(newNIndices);
    }
  } else {
    // 取消选择
    newSelected.delete(index);
    
    // 从相应集合中移除
    if (electrode.type === 'B') {
      const newBIndices = new Set(selectedBElectrodeIndices);
      newBIndices.delete(index);
      setSelectedBElectrodeIndices(newBIndices);
    } else if (electrode.type === 'N') {
      const newNIndices = new Set(selectedNElectrodeIndices);
      newNIndices.delete(index);
      setSelectedNElectrodeIndices(newNIndices);
    }
  }
  
  setSelectedSpecialElectrodes(newSelected);
};

/**
 * 处理特殊电极的删除
 */
export const handleDeleteSpecialElectrodes = (
  indexesToDelete: number[], 
  specialElectrodes: SpecialElectrode[],
  setSpecialElectrodes: React.Dispatch<React.SetStateAction<SpecialElectrode[]>>, 
  selectedBElectrodeIndices: Set<number>,
  setSelectedBElectrodeIndices: React.Dispatch<React.SetStateAction<Set<number>>>,
  selectedNElectrodeIndices: Set<number>,
  setSelectedNElectrodeIndices: React.Dispatch<React.SetStateAction<Set<number>>>,
  setSelectedSpecialElectrodes: React.Dispatch<React.SetStateAction<Set<number>>>
) => {
  // 更新选中的B极和N极索引集合
  const newBIndices = new Set(selectedBElectrodeIndices);
  const newNIndices = new Set(selectedNElectrodeIndices);
  
  indexesToDelete.forEach(index => {
    newBIndices.delete(index);
    newNIndices.delete(index);
  });
  
  setSelectedBElectrodeIndices(newBIndices);
  setSelectedNElectrodeIndices(newNIndices);
  
  const newElectrodes = specialElectrodes.filter((_, idx) => 
    !indexesToDelete.includes(idx)
  );
  setSpecialElectrodes(newElectrodes);
  setSelectedSpecialElectrodes(new Set());
  
  message.success('删除成功');
};
