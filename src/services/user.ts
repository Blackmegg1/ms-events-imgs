import { request } from '@umijs/max';

export async function getUsers() {
    return request('/api/users', {
        method: 'GET',
    });
}

export async function addUser(data: any) {
    return request('/api/users', {
        method: 'POST',
        data,
    });
}

export async function updateUser(id: number, data: any) {
    return request(`/api/users/${id}`, {
        method: 'PUT',
        data,
    });
}

export async function deleteUser(id: number) {
    return request(`/api/users/${id}`, {
        method: 'DELETE',
    });
}
