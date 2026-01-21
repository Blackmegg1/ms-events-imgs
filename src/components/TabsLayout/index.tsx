import React, { useEffect, useMemo } from 'react';
import { Tabs } from 'antd';
import { history, useLocation, useModel, useSelectedRoutes } from '@umijs/max';
import KeepAlive, { useAliveController } from 'react-activation';
import './index.css';

const TabsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { drop } = useAliveController();
    const model = useModel('tabs' as any) as any;
    const { tabs = [], addTab = () => { }, removeTab = () => { } } = model || {};

    const location = useLocation();
    const routes = useSelectedRoutes();

    // 直接在组件内获取最新的 activeKey，确保响应式
    const activeKey = location.pathname.replace(/\/$/, '') || '/';

    const currentRouteTitle = useMemo(() => {
        const route = routes[routes.length - 1];
        return (route?.route as any)?.name || '未知页面';
    }, [routes]);

    useEffect(() => {
        if (!model) return;

        // 过滤掉登录页和根路径
        if (location.pathname === '/login' || location.pathname === '/') return;

        // 规范化路径，避免因为末尾斜杠导致匹配失败
        const normalizedPath = location.pathname.replace(/\/$/, '') || '/';

        addTab({
            key: normalizedPath,
            label: currentRouteTitle,
            pathname: normalizedPath,
            closable: normalizedPath !== '/home',
        });
    }, [location.pathname, currentRouteTitle, addTab, !!model]);

    const onChange = (key: string) => {
        // 查找对应的 tab
        const tab = tabs.find((t: any) => t.key === key);
        if (tab) {
            // 如果已经在当前页，不需要 push
            if (activeKey === tab.pathname) return;

            console.log(`Switching to tab: ${tab.pathname}`);
            history.push(tab.pathname);
        }
    };

    const onEdit = (targetKey: any, action: 'add' | 'remove') => {
        if (action === 'remove') {
            const pathToDelete = targetKey as string;
            removeTab(pathToDelete);
            // 清理缓存
            drop(pathToDelete);
        }
    };

    const isLoginPage = activeKey === '/login' || activeKey === '/';

    if (!model || isLoginPage) {
        return <>{children}</>;
    }

    // 确保 activeKey 在 tabs 中存在，或者使用从 location 解析出的 key
    const safeActiveKey = tabs.find((t: any) => t.key === activeKey) ? activeKey : activeKey;

    return (
        <div className="tabs-layout-container">
            <div className="tabs-header">
                <Tabs
                    type="editable-card"
                    hideAdd
                    activeKey={safeActiveKey}
                    onChange={onChange}
                    onEdit={onEdit}
                    items={tabs.map((tab: any) => ({
                        key: tab.key,
                        label: tab.label,
                        closable: tab.closable,
                    }))}
                    tabBarStyle={{
                        margin: 0,
                        padding: '4px 16px 0',
                        background: '#fff',
                    }}
                />
            </div>
            <div className="tabs-content">
                {/* 
                   使用 id="main-content" 固化标识，
                   cacheKey 随路径变化实现不同页面的缓存。
                */}
                <KeepAlive id={activeKey} cacheKey={activeKey} name={activeKey}>
                    {children}
                </KeepAlive>
            </div>
        </div>
    );
};

export default TabsLayout;
