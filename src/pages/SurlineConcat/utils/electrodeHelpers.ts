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
  selectedBElectrodeIndex: number | null,
  setSelectedBElectrodeIndex: React.Dispatch<React.SetStateAction<number | null>>,
  selectedNElectrodeIndex: number | null,
  setSelectedNElectrodeIndex: React.Dispatch<React.SetStateAction<number | null>>,
  specialElectrodes: SpecialElectrode[]
) => {
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

/**
 * 处理特殊电极的删除
 */
export const handleDeleteSpecialElectrodes = (
  indexesToDelete: number[], 
  specialElectrodes: SpecialElectrode[],
  setSpecialElectrodes: React.Dispatch<React.SetStateAction<SpecialElectrode[]>>, 
  selectedBElectrodeIndex: number | null,
  setSelectedBElectrodeIndex: React.Dispatch<React.SetStateAction<number | null>>,
  selectedNElectrodeIndex: number | null,
  setSelectedNElectrodeIndex: React.Dispatch<React.SetStateAction<number | null>>,
  setSelectedSpecialElectrodes: React.Dispatch<React.SetStateAction<Set<number>>>
) => {
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
