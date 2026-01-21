// 运行时配置
import { RequestConfig, history, useModel } from '@umijs/max';
import React, { useState } from 'react';
import logo from '@/favicon.ico';
import UserProfileModal from '@/components/HeaderContent/UserProfileModal';

import { queryCurrentUser } from '@/services/auth';

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{ currentUser?: any }> {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await queryCurrentUser();
      if (response.success) {
        return { currentUser: response.user };
      }
    } catch (error) {
      localStorage.removeItem('token');
      history.push('/login');
    }
  }
  return {};
}

import { LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';

const UserAvatarRender = ({ currentUser, setInitialState }: any) => {
  const [modalOpen, setModalOpen] = useState(false);

  return React.createElement(React.Fragment, null,
    React.createElement(Dropdown, {
      menu: {
        items: [
          {
            key: 'settings',
            icon: React.createElement(SettingOutlined),
            label: '个人设置',
            onClick: () => setModalOpen(true),
          },
          {
            type: 'divider',
          },
          {
            key: 'logout',
            icon: React.createElement(LogoutOutlined),
            label: '退出登录',
            onClick: () => {
              localStorage.removeItem('token');
              history.push('/login');
            },
          },
        ],
      }
    }, React.createElement('span', {
      style: {
        cursor: 'pointer',
        padding: '0 12px',
        display: 'inline-block',
        color: 'rgba(0, 0, 0, 0.85)',
        fontWeight: 500
      }
    }, currentUser?.real_name || currentUser?.username || '未知用户')),
    React.createElement(UserProfileModal, {
      open: modalOpen,
      onOpenChange: setModalOpen,
      currentUser: currentUser,
      onSuccess: async () => {
        const response = await queryCurrentUser();
        if (response.success) {
          setInitialState((s: any) => ({ ...s, currentUser: response.user }));
        }
      }
    })
  );
};

export const layout = ({ initialState, setInitialState }: any) => {
  const { currentUser } = initialState || {};
  return {
    logo: logo,
    title: '透明地质数据处理系统',
    layout: 'mix', // 采用顶部+侧边混合布局，看起来更高级
    splitMenus: false,
    fixedHeader: true,
    menu: {
      locale: false,
    },
    // 将用户信息移至右上角
    avatarProps: {
      title: currentUser?.real_name || currentUser?.username || '未知用户',
      size: 'small',
      render: () => React.createElement(UserAvatarRender, { currentUser, setInitialState }),
    },
  };
};

export const request: RequestConfig = {
  timeout: 10000,
  // other axios options you want
  errorConfig: {
    errorHandler: () => { },
    errorThrower: () => { },
  },
  requestInterceptors: [
    (url, options) => {
      const token = localStorage.getItem('token');
      if (token) {
        const headers = {
          ...options.headers,
          Authorization: token,
        };
        return {
          url,
          options: { ...options, headers },
        };
      }
      return { url, options };
    },
  ],
  responseInterceptors: [
    (response) => {
      return response;
    }
  ]
};
