import { request } from '@umijs/max';

export async function getEventList(params: {
  current?: number;
  pageSize?: number;
}) {
  return request('/api/event/list', {
    method: 'get',
    params,
  });
}

export function addEvent(data: {
  project_id: number;
  loc_x: number;
  loc_y: number;
  loc_z: number;
  energy?: number;
  magnitude?: number;
  time?: string;
}) {
  return request('/api/event', {
    method: 'post',
    data,
  });
}

export function batchDeleteEvents(eventIds: Array<Number>) {
  return request('/api/event/batch-delete', {
    method: 'post',
    data: { eventIds },
  });
}

export function batchAddEvent(formdata: any) {
  return request('/api/event/batch-import', {
    headers: { 'Content-Type': 'multipart/form-data' },
    method: 'post',
    data: formdata,
  });
}
