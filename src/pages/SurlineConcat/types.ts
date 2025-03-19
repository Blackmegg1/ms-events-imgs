// 定义数据结构接口
// 键为"N-行号"格式，值为[电流, 电压]数组
export type DatDataMap = Map<string, [number, number]>; // 保留原有格式用于解析

// 使用Map存储CSV数据，键为索引，值为坐标数组[x,y,z]
export type CsvDataMap = Map<number, [number, number, number]>;

// 定义processedMap的类型
export type ProcessedMapType = {
  [key: number]: {
    pos: [number, number, number],
    voltage: {
      [key: number]: [number, number] // 改为number类型键
    }
  }
};

// 表格数据展示使用的接口
export interface TableDisplayData {
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
export interface MatrixDisplayData {
  rowId: string | number; // 修改为string|number，因为坐标行仍使用"x","y","z"
  current: string; // 电流值
  [electrodeName: string]: any; // 动态列，每列是一个电极
}

// 定义合并数据集类型
export interface MergedDataset {
  id: string;
  name: string;
  timestamp: number;
  datFileName: string;
  csvFileName: string;
  data: ProcessedMapType;
}

// 添加特殊电极类型
export type SpecialElectrode = {
  type: string; // 'B' 或 'N'
  position: [number, number, number];
  fileSource: string; // 来源文件名
};
