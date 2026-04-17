import React from 'react';
import { AliveScope } from 'react-activation';
import { Outlet, useLocation, useModel } from '@umijs/max';
import TabsLayout from '@/components/TabsLayout';

export default () => {
    const location = useLocation();
    const { initialState } = useModel('@@initialState');
    const isGuest = initialState?.currentUser?.role === 'guest';

    // 登录页直接渲染内容
    if (location.pathname === '/login' || location.pathname === '/') {
        return <Outlet />;
    }

    if (isGuest) {
        return (
            <AliveScope>
                <Outlet />
            </AliveScope>
        );
    }

    return (
        <AliveScope>
            <TabsLayout>
                <Outlet />
            </TabsLayout>
        </AliveScope>
    );
};
