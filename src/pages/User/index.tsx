import { PlusOutlined } from '@ant-design/icons';
import {
    ModalForm,
    PageContainer,
    ProFormSelect,
    ProFormText,
    ProTable,
    ActionType,
    ProColumns,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { getUsers, addUser, updateUser, deleteUser } from '@/services/user';

const UserList: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [createModalVisible, handleModalVisible] = useState<boolean>(false);
    const [updateModalVisible, handleUpdateModalVisible] = useState<boolean>(false);
    const [currentRow, setCurrentRow] = useState<any>();

    const columns: ProColumns<any>[] = [
        {
            title: 'ID',
            dataIndex: 'id',
            hideInSearch: true,
            width: 60,
        },
        {
            title: '用户名',
            dataIndex: 'username',
            copyable: true,
        },
        {
            title: '真实姓名',
            dataIndex: 'real_name',
        },
        {
            title: '角色',
            dataIndex: 'role',
            valueEnum: {
                admin: { text: '管理员', status: 'Success' },
                user: { text: '普通用户', status: 'Default' },
                guest: { text: '访客', status: 'Processing' },
            },
            render: (_, record) => {
                const colors = { admin: 'red', user: 'blue', guest: 'green' };
                return <Tag color={colors[record.role as keyof typeof colors]}>{_}</Tag>;
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            valueEnum: {
                1: { text: '正常', status: 'Success' },
                0: { text: '停用', status: 'Error' },
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            valueType: 'dateTime',
            hideInSearch: true,
        },
        {
            title: '操作',
            dataIndex: 'option',
            valueType: 'option',
            render: (_, record) => [
                <a
                    key="edit"
                    onClick={() => {
                        setCurrentRow(record);
                        handleUpdateModalVisible(true);
                    }}
                >
                    修改
                </a>,
                <Popconfirm
                    key="delete"
                    title="确定删除该用户吗？"
                    onConfirm={async () => {
                        const res = await deleteUser(record.id);
                        if (res.success) {
                            message.success('删除成功');
                            actionRef.current?.reload();
                        } else {
                            message.error(res.msg);
                        }
                    }}
                >
                    <a style={{ color: 'red' }}>删除</a>
                </Popconfirm>,
            ],
        },
    ];

    return (
        <PageContainer>
            <ProTable<any>
                headerTitle="用户列表"
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 120,
                }}
                toolBarRender={() => [
                    <Button
                        type="primary"
                        key="primary"
                        onClick={() => {
                            handleModalVisible(true);
                        }}
                    >
                        <PlusOutlined /> 新建用户
                    </Button>,
                ]}
                request={async () => {
                    const res = await getUsers();
                    return {
                        data: res.data || [],
                        success: true,
                    };
                }}
                columns={columns}
            />

            {/* 新建用户弹窗 */}
            <ModalForm
                title="新建用户"
                visible={createModalVisible}
                onVisibleChange={handleModalVisible}
                onFinish={async (value) => {
                    const res = await addUser(value);
                    if (res.success) {
                        message.success('创建成功');
                        handleModalVisible(false);
                        actionRef.current?.reload();
                        return true;
                    } else {
                        message.error(res.msg);
                        return false;
                    }
                }}
            >
                <ProFormText
                    name="username"
                    label="用户名"
                    rules={[{ required: true, message: '请输入用户名' }]}
                />
                <ProFormText.Password
                    name="password"
                    label="密码"
                    rules={[{ required: true, message: '请输入密码' }]}
                />
                <ProFormText name="real_name" label="真实姓名" />
                <ProFormSelect
                    name="role"
                    label="角色"
                    initialValue="user"
                    options={[
                        { label: '管理员', value: 'admin' },
                        { label: '普通用户', value: 'user' },
                        { label: '访客', value: 'guest' },
                    ]}
                />
                <ProFormSelect
                    name="status"
                    label="状态"
                    initialValue={1}
                    options={[
                        { label: '正常', value: 1 },
                        { label: '停用', value: 0 },
                    ]}
                />
            </ModalForm>

            {/* 修改用户弹窗 */}
            <ModalForm
                title="修改用户"
                key={currentRow?.id || 'update'}
                visible={updateModalVisible}
                onVisibleChange={handleUpdateModalVisible}
                initialValues={currentRow}
                onFinish={async (value) => {
                    const res = await updateUser(currentRow.id, value);
                    if (res.success) {
                        message.success('修改成功');
                        handleUpdateModalVisible(false);
                        actionRef.current?.reload();
                        return true;
                    } else {
                        message.error(res.msg);
                        return false;
                    }
                }}
            >
                <ProFormText name="username" label="用户名" disabled />
                <ProFormText.Password name="password" label="新密码 (留空则不修改)" />
                <ProFormText name="real_name" label="真实姓名" />
                <ProFormSelect
                    name="role"
                    label="角色"
                    options={[
                        { label: '管理员', value: 'admin' },
                        { label: '普通用户', value: 'user' },
                        { label: '访客', value: 'guest' },
                    ]}
                />
                <ProFormSelect
                    name="status"
                    label="状态"
                    options={[
                        { label: '正常', value: 1 },
                        { label: '停用', value: 0 },
                    ]}
                />
            </ModalForm>
        </PageContainer>
    );
};

export default UserList;
