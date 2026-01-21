import { useState, useCallback, useEffect } from 'react';
import { history } from '@umijs/max';

export interface TabItem {
    key: string;
    label: string;
    pathname: string;
    closable?: boolean;
}

export default () => {
    const [tabs, setTabs] = useState<TabItem[]>([
        { key: '/home', label: '首页', pathname: '/home', closable: false },
    ]);

    // 初始化 activeKey
    const [activeKey, setActiveKey] = useState(history.location.pathname.replace(/\/$/, '') || '/');

    // 监听路由变化，同步更新 activeKey
    // 这种方式不依赖 useLocation 钩子，比 useLocation 更早可用，且不会触发 Router Context 错误
    useEffect(() => {
        const unlisten = history.listen(({ location }) => {
            const path = location.pathname.replace(/\/$/, '') || '/';
            setActiveKey(path);
        });
        return () => unlisten();
    }, []);

    const addTab = useCallback((tab: TabItem) => {
        setTabs((prev) => {
            const normalizedKey = tab.key.replace(/\/$/, '') || '/';
            if (prev.find((t) => t.key === normalizedKey)) {
                return prev;
            }
            return [...prev, { ...tab, key: normalizedKey, pathname: normalizedKey }];
        });
    }, []);

    const removeTab = useCallback((targetKey: string) => {
        setTabs((prev) => {
            const index = prev.findIndex((t) => t.key === targetKey);
            if (index === -1) return prev;

            const newTabs = prev.filter((t) => t.key !== targetKey);

            // 如果关闭的是当前激活的页签，则切换到邻近页签
            if (targetKey === activeKey) {
                const nextTab = newTabs[index] || newTabs[index - 1];
                if (nextTab) {
                    history.push(nextTab.pathname);
                }
            }
            return newTabs;
        });
    }, [activeKey]);

    return {
        tabs,
        setTabs,
        activeKey,
        addTab,
        removeTab,
    };
};
