import { request } from '@umijs/max';

export function getModelList(params: { current?: number; pageSize?: number }) {
  return request('/api/Model/list', {
    method: 'get',
    params,
  });
}

export function addModel(data: { model_name: string; project_id: number }) {
  return request('/api/Model', {
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
  return request(`/api/Model/${model_id}`, {
    method: 'put',
    data,
  });
}

export async function deleteModel(model_id: number) {
  return request(`/api/Model/${model_id}`, {
    method: 'DELETE',
  });
}
