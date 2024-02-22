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
