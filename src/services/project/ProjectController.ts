import { request } from '@umijs/max';

export function getProjectList(params: {
  current?: number;
  pageSize?: number;
}) {
  return request('/api/project/list', {
    method: 'get',
    params,
  });
}

// 宽松的数据类型，便于后端新增字段（by_ltp、ltp_map、enable_time_format、time_format 等）
export function addProject(data: any) {
  return request('/api/project', {
    method: 'post',
    data,
  });
}

export function editProject(
  id: number,
  data: any,
) {
  return request(`/api/project/${id}`, {
    method: 'put',
    data,
  });
}

// 获取所有项目字典
export function getProjectDist() {
  return request('/api/project/all', {
    method: 'get',
  });
}

// 获取所有未完成的项目字典
export function getActiveProject() {
  return request('/api/project/all-active', {
    method: 'get',
  });
}
