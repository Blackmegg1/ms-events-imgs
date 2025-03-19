import { UploadFile } from 'antd';
import { message } from 'antd';

// 处理文件选择
export const handleFileSelect = (
  file: UploadFile,
  checked: boolean,
  selectedFileUids: Set<string>,
  setSelectedFileUids: React.Dispatch<React.SetStateAction<Set<string>>>,
  selectedDatUid: string | null,
  setSelectedDatUid: React.Dispatch<React.SetStateAction<string | null>>,
  selectedCsvUid: string | null,
  setSelectedCsvUid: React.Dispatch<React.SetStateAction<string | null>>,
  setSelectedDatFile: React.Dispatch<React.SetStateAction<File | null>>,
  setSelectedCsvFile: React.Dispatch<React.SetStateAction<File | null>>
) => {
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

// 处理文件删除
export const handleDeleteFile = (
  uid: string,
  fileList: UploadFile[],
  setFileList: React.Dispatch<React.SetStateAction<UploadFile[]>>,
  selectedDatUid: string | null,
  setSelectedDatUid: React.Dispatch<React.SetStateAction<string | null>>,
  selectedCsvUid: string | null,
  setSelectedCsvUid: React.Dispatch<React.SetStateAction<string | null>>,
  setSelectedDatFile: React.Dispatch<React.SetStateAction<File | null>>,
  setSelectedCsvFile: React.Dispatch<React.SetStateAction<File | null>>,
  selectedFileUids: Set<string>,
  setSelectedFileUids: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
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

// 清除文件选择
export const clearFileSelection = (
  setSelectedDatFile: React.Dispatch<React.SetStateAction<File | null>>,
  setSelectedCsvFile: React.Dispatch<React.SetStateAction<File | null>>,
  setSelectedDatUid: React.Dispatch<React.SetStateAction<string | null>>,
  setSelectedCsvUid: React.Dispatch<React.SetStateAction<string | null>>,
  setSelectedFileUids: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  setSelectedDatFile(null);
  setSelectedCsvFile(null);
  setSelectedDatUid(null);
  setSelectedCsvUid(null);
  setSelectedFileUids(new Set());
};
