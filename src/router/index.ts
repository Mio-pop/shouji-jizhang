import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '首页' },
  },
  {
    path: '/parse',
    name: 'parse',
    component: () => import('../views/ParseView.vue'),
    meta: { title: '智能解析' },
  },
  {
    path: '/record',
    name: 'record',
    component: () => import('../views/RecordView.vue'),
    meta: { title: '记一笔' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('../views/StatsView.vue'),
    meta: { title: '统计' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { title: '我的' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

// 用 hash 模式：Capacitor 打包后是 file:// 协议，history 模式会 404
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = to.meta.title
  document.title = typeof title === 'string' ? `${title} · 随手记账` : '随手记账'
})

export default router
