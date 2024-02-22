import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '微震事件成图助手',
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
      path: '/creat',
      // component: './ImgMag',
    },
  ],
  npmClient: 'pnpm',
  proxy: {
    '/api': {
      'target': 'http://localhost:3000/',
      'changeOrigin': true,
      'pathRewrite': { '^/api' : '' },
    },
  },
});

