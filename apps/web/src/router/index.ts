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
  ],
})

export default router
