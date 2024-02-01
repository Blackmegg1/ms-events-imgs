import { request } from '@umijs/max';

export async function getProjectList(params: {
  // query
  /** current */
  current?: number;
  /** pageSize */
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
