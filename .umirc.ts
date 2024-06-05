import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '微震事件分析工具',
  },
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      name: '首页',
      path: '/home',
      component: './Home',
    },
    {
      name: '项目管理',
      path: '/project',
      component: './Project',
    },
    {
      name: '底图管理',
      path: '/img',
      component: './ImgMag',
    },
    {
      name: '事件管理',
      path: '/event',
      component: './Event',
    },
    {
      name: '事件成图',
      path: '/createImg',
      routes: [
        {
          name: '平面分布图',
          path: '/createImg/create',
          component: './Create',
        },
        {
          name: '频次密度图',
          path: '/createImg/frequency',
          component:'./Frequency'
        },
        // {
        //   name: '时空分布图',
        //   path: '/createImg/Timespace',
        //   component:'./TimeSpace'
        // },
      ],
    },
  ],
  npmClient: 'pnpm',
  proxy: {
    '/api': {
      target: 'http://localhost:3000/',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
});
