import { request } from '@umijs/max';

export function getModelList(params: {
  current?: number;
  pageSize?: number;
  project_id?: number;
}) {
  return request('/api/model/list', {
    method: 'get',
    params,
  });
}

export function addModel(data: { model_name: string; project_id: number }) {
  return request('/api/model', {
    method: 'post',
    data,
  });
}

export function editModel(
  model_id: number,
  data: {
    model_name: string;
    project_id: number;
  },
) {
  return request(`/api/model/${model_id}`, {
    method: 'put',
    data,
  });
}

export async function deleteModel(model_id: number) {
  return request(`/api/model/${model_id}`, {
    method: 'DELETE',
  });
}
