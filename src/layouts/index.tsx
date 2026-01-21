import React from 'react';
import { AliveScope } from 'react-activation';
import { Outlet, useLocation } from '@umijs/max';
import TabsLayout from '@/components/TabsLayout';

export default () => {
    const location = useLocation();

    // 登录页直接渲染内容
    if (location.pathname === '/login' || location.pathname === '/') {
        return <Outlet />;
    }

    return (
        <AliveScope>
            <TabsLayout>
                <Outlet />
            </TabsLayout>
        </AliveScope>
    );
};
