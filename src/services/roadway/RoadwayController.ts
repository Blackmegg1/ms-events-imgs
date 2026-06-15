import { request } from '@umijs/max';

// 获取巷道列表
export function getRoadwayList(params: {
  current?: number;
  pageSize?: number;
  model_id?: number;
  name?: string;
}) {
  return request('/api/roadway/list', {
    method: 'GET',
    params: {
      pageSize: 1000,
      ...params,
    },
  });
}

// 删除巷道
export function deleteRoadway(id: number) {
  return request(`/api/roadway/${id}`, {
    method: 'DELETE',
  });
}

// 添加巷道
export function addRoadway(data: {
  model_id: number;
  name: string;
  position?: string;
  color?: string;
}) {
  return request('/api/roadway', {
    method: 'POST',
    data,
  });
}

// 修改巷道
export function updateRoadway(
  id: number,
  data: {
    model_id: number;
    name: string;
    position?: string;
    color?: string;
  },
) {
  return request(`/api/roadway/${id}`, {
    method: 'PUT',
    data,
  });
}
