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
