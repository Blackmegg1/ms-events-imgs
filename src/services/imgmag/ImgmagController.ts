import { request } from '@umijs/max';

export async function getImgList(params: {
  current?: number;
  pageSize?: number;
}) {
  return request('/api/img/list', {
    method: 'get',
    params,
  });
}

export async function addImg(formdata: any) {
  return request('/api/img/add', {
    headers: { 'Content-Type': 'multipart/form-data' },
    method: 'post',
    data: formdata,
  });
}

export async function deleteImg(project_id: number, name: string) {
  return request('/api/img/delete', {
    method: 'DELETE',
    data: { project_id: project_id, name: name },
  });
}

export async function updateImg(formdata: any) {
    return request('/api/img/update', {
      headers: { 'Content-Type': 'multipart/form-data' },
      method: 'put',
      data: formdata,
    });
  }
