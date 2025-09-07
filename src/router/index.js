import { createRouter, createWebHashHistory } from 'vue-router'

const ProgressDemo = () => import('../views/ProgressDemo.vue')
const ChartPage = () => import('../views/ChartPage.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/progress' },
    { path: '/progress', component: ProgressDemo },
    { path: '/chart', component: ChartPage },
  ],
})

export default router