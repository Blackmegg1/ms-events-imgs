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

export function editCompass(
  model_id: number,
  data: {
    show_compass: boolean;
    compass_start: string;
    compass_end: string;
  },
) {
  return request(`/api/model/compass/${model_id}`, {
    method: 'put',
    data,
  });
}

export function getCompass(model_id: number) {
  return request(`/api/model/compass/${model_id}`, {
    method: 'get',
  });
}

export function uploadModelCsv(model_id: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/api/model/upload/${model_id}`, {
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
