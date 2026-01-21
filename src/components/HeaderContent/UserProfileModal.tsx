import React, { useEffect } from 'react';
import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import { updateProfile, queryCurrentUser } from '@/services/auth';

interface UserProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUser: any;
    onSuccess: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ open, onOpenChange, currentUser, onSuccess }) => {
    return (
        <ModalForm
            title="修改个人信息"
            open={open}
            onOpenChange={onOpenChange}
            initialValues={{
                username: currentUser?.username,
                real_name: currentUser?.real_name,
            }}
            modalProps={{
                destroyOnClose: true,
            }}
            onFinish={async (values) => {
                try {
                    const res = await updateProfile(values);
                    if (res.success) {
                        message.success('更新成功');
                        onSuccess();
                        return true;
                    }
                    message.error(res.msg || '更新失败');
                } catch (error) {
                    message.error('请求失败');
                }
                return false;
            }}
        >
            <ProFormText
                name="username"
                label="用户名"
                placeholder="请输入用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
            />
            <ProFormText
                name="real_name"
                label="真实姓名"
                placeholder="请输入真实姓名"
            />
            <ProFormText.Password
                name="password"
                label="新密码"
                placeholder="不修改请留空"
            />
        </ModalForm>
    );
};

export default UserProfileModal;
