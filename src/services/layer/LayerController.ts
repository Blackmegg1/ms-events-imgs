import { request } from '@umijs/max';

// 获取图层列表
export function getLayerList(params: {
  current?: number;
  pageSize?: number;
  model_id?: number;
  layer_name?: string;
}) {
  return request('/api/layer/list', {
    method: 'GET',
    params,
  });
}

// 删除图层
export function deleteLayer(layer_id: number) {
  return request(`/api/layer/${layer_id}`, {
    method: 'DELETE',
  });
}

// 添加图层
export function addLayer(data: {
  model_id: number;
  layer_name: string;
  layer_depth: number;
  layer_distance?: number;
  layer_color: string;
  layer_type?: number;
}) {
  return request('/api/layer', {
    method: 'POST',
    data,
  });
}

// 修改图层
export function updateLayer(
  layer_id: number,
  data: {
    id: number;
    model_id: number;
    layer_name: string;
    layer_depth: number;
    layer_distance: number;
    layer_color: string;
    layer_type?: number;
  },
) {
  return request(`/api/layer/${layer_id}`, {
    method: 'PUT',
    data,
  });
}
