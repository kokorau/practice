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
      path: '/ray-tracing',
      name: 'ray-tracing',
      component: () => import('../views/RayTracingView.vue'),
    },
  ],
})

export default router
