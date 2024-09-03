import { request } from '@umijs/max';

export async function getEData(id: number) {
  return request(`/api/edata/getData/${id}`, {
    method: 'get',
  });
}
