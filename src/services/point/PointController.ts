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

export function batchDeletePoints(model_id: Number) {
  return request(`/api/point/batch-delete/${model_id}`, {
    method: 'DELETE',
  })
}
