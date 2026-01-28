import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Alert, message } from 'antd';
import React, { useState } from 'react';
import { login } from '@/services/auth';
import styles from './index.less';

const LoginMessage: React.FC<{
    content: string;
}> = ({ content }) => {
    return (
        <Alert
            style={{
                marginBottom: 24,
            }}
            message={content}
            type="error"
            showIcon
        />
    );
};

const Login: React.FC = () => {
    const [userLoginState, setUserLoginState] = useState<any>({});
    // @ts-ignore
    const { initialState, setInitialState } = useModel('@@initialState');

    const fetchUserInfo = async () => {
        // 这里可以调用获取用户信息的接口，目前 auth.js 里有 me 接口
        // 不过 login 返回了 user 信息，我们可以直接用
        /* 
        const userInfo = await initialState?.fetchUserInfo?.();
        if (userInfo) {
          await setInitialState((s) => ({
            ...s,
            currentUser: userInfo,
          }));
        }
        */
    };

    const handleSubmit = async (values: any) => {
        try {
            // 登录
            const msg = await login({ ...values });
            if (msg.success) {
                message.success('登录成功！');

                // 保存 Token (建议放在 Cookie 或 LocalStorage)
                localStorage.setItem('token', msg.token);

                // 更新 InitialState
                await setInitialState((s) => ({
                    ...s,
                    currentUser: msg.user,
                }));

                /** 此方法会跳转到 redirect 参数所在的位置 */
                const urlParams = new URL(window.location.href).searchParams;
                history.push(urlParams.get('redirect') || '/');
                return;
            } else {
                // 如果失败去设置用户错误信息
                setUserLoginState({
                    status: 'error',
                    message: msg.msg
                });
            }
        } catch (error) {
            console.log(error);
            setUserLoginState({
                status: 'error',
                message: '登录失败，请重试！'
            });
        }
    };
    const { status, message: loginMsg } = userLoginState;

    return (
        <div className={styles.container}>
            <Alert
                className={styles.topNotice}
                message="因本系统部署在公网，为保障数据安全，请咨询管理员注册后使用！"
                type="info"
                showIcon
                closable
            />
            <div className={styles.content}>
                <div className={styles.login}>
                    <div className={styles.title}>透明地质数据处理系统 v2.0</div>
                    <LoginForm
                        subTitle=" "
                        initialValues={{
                            autoLogin: true,
                        }}
                        onFinish={async (values) => {
                            await handleSubmit(values as any);
                        }}
                    >
                        {status === 'error' && (
                            <LoginMessage
                                content={loginMsg || '账户或密码错误'}
                            />
                        )}
                        <ProFormText
                            name="username"
                            fieldProps={{
                                size: 'large',
                                prefix: <UserOutlined className={'prefixIcon'} />,
                            }}
                            placeholder={'请输入用户名'}
                            rules={[
                                {
                                    required: true,
                                    message: '请输入用户名!',
                                },
                            ]}
                        />
                        <ProFormText.Password
                            name="password"
                            fieldProps={{
                                size: 'large',
                                prefix: <LockOutlined className={'prefixIcon'} />,
                            }}
                            placeholder={'请输入密码'}
                            rules={[
                                {
                                    required: true,
                                    message: '请输入密码！',
                                },
                            ]}
                        />
                    </LoginForm>
                </div>
            </div>
        </div>
    );
};

export default Login;
