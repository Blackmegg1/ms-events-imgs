import { request } from '@umijs/max';

export async function login(body: any) {
  return request('/api/auth/login', {
    method: 'POST',
    data: body,
  });
}

export async function register(body: any) {
  return request('/api/auth/register', {
    method: 'POST',
    data: body,
  });
}
export async function queryCurrentUser() {
  return request('/api/auth/me', {
    method: 'GET',
  });
}

export async function updateProfile(body: any) {
  return request('/api/auth/profile', {
    method: 'PUT',
    data: body,
  });
}
