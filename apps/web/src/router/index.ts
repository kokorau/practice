import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/photo-filter',
      name: 'photo-filter',
      component: () => import('../views/PhotoFilterView.vue'),
    },
    {
      path: '/css-lighting',
      name: 'css-lighting',
      component: () => import('../views/CssLightingView.vue'),
    },
    {
      path: '/css-lighting-demo',
      name: 'css-lighting-demo',
      component: () => import('../views/CssLightingDemoView.vue'),
    },
  ],
})

export default router
