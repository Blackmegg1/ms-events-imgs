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

export function addProject(data: { porjectName: string; initTime: string }) {
  return request('/api/project', {
    method: 'post',
    data,
  });
}

export function editProject(
  id: number,
  data: {
    porjectName: string;
    initTime: string;
  },
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