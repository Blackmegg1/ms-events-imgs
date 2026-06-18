import { request } from '@umijs/max';

/* ---------- 巷道本体 ---------- */

export function getRoadwayList(params: {
  current?: number;
  pageSize?: number;
  model_id?: number;
  name?: string;
}) {
  return request('/api/roadway/list', {
    method: 'GET',
    params: { pageSize: 1000, ...params },
  });
}

export function deleteRoadway(id: number) {
  return request(`/api/roadway/${id}`, { method: 'DELETE' });
}

export function addRoadway(data: {
  model_id: number;
  name: string;
  color?: string;
  section_type?: string;
  sec_width?: number;
  sec_wall_height?: number;
  sec_diameter?: number;
}) {
  return request('/api/roadway', { method: 'POST', data });
}

export function updateRoadway(
  id: number,
  data: {
    model_id: number;
    name: string;
    color?: string;
    section_type?: string;
    sec_width?: number;
    sec_wall_height?: number;
    sec_diameter?: number;
  },
) {
  return request(`/api/roadway/${id}`, { method: 'PUT', data });
}

/* ---------- 巷道测点 ---------- */

export function getRoadwayPoints(roadway_id: number) {
  return request('/api/roadway/points', {
    method: 'GET',
    params: { roadway_id },
  });
}

export function addRoadwayPoint(data: {
  roadway_id: number;
  point_name?: string;
  seq?: number;
  x?: number;
  y?: number;
  z?: number;
}) {
  return request('/api/roadway/point', { method: 'POST', data });
}

export function updateRoadwayPoint(
  id: number,
  data: {
    roadway_id: number;
    point_name?: string;
    seq?: number;
    x?: number;
    y?: number;
    z?: number;
  },
) {
  return request(`/api/roadway/point/${id}`, { method: 'PUT', data });
}

export function deleteRoadwayPoint(id: number) {
  return request(`/api/roadway/point/${id}`, { method: 'DELETE' });
}

export function batchImportRoadwayPoints(formData: FormData) {
  return request('/api/roadway/point/batch-import', {
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function clearRoadwayPoints(roadway_id: number) {
  return request(`/api/roadway/point/batch-delete/${roadway_id}`, {
    method: 'DELETE',
  });
}
