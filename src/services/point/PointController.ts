import { request } from '@umijs/max';

export function getPointList(params: {
  current?: number;
  pageSize?: number;
  model_id?: number;
}) {
  return request('/api/point/list', {
    method: 'get',
    params,
  });
}

export function batchAddPoint(formdata: any) {
  return request('/api/point/batch-import', {
    headers: { 'Content-Type': 'multipart/form-data' },
    method: 'post',
    data: formdata,
  });
}