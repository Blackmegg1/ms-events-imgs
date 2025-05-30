import type { GetProp, UploadProps } from 'antd';

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

// 文件转base64
export const getBlob = (file: FileType) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      const blob = new Blob([reader.result], { type: file.type });
      resolve(blob);
    };
    reader.onerror = (error) => reject(error);
  });
};

// base64转blob
export function base64StringToBlob(base64String: string) {
  const byteString = atob(base64String);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const int8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    int8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer]);
}


// 将系统坐标转换为大地坐标（Geodetic 2000）
type Point2D = { x: number; y: number };
type Point3D = { x: number; y: number; z: number };

export function createAffineTransform2D(
  systemA: Point2D,
  geoA: Point2D,
  systemB: Point2D,
  geoB: Point2D
): (x: number, y: number, z: number) => Point3D {
  const { x: x1, y: y1 } = systemA;
  const { x: x2, y: y2 } = systemB;
  const { x: X1, y: Y1 } = geoA;
  const { x: X2, y: Y2 } = geoB;

  // 构造两个向量
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dX = X2 - X1;
  const dY = Y2 - Y1;

  // 计算缩放和旋转（仿射中线性部分）
  const norm2 = dx * dx + dy * dy || 1e-8; // 避免除零

  const a = (dx * dX + dy * dY) / norm2;
  const b = (dx * dY - dy * dX) / norm2;

  // 平移（T）= geoA - A * systemA
  const tx = X1 - a * x1 + b * y1;
  const ty = Y1 - b * x1 - a * y1;

  return (x: number, y: number, z: number) => {
    const geoX = a * x - b * y + tx;
    const geoY = b * x + a * y + ty;
    return { x: geoX, y: geoY, z };
  };
}


