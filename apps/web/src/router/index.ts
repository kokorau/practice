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
    {
      path: '/lighting-simulator',
      name: 'lighting-simulator',
      component: () => import('../views/LightingSimulatorView.vue'),
    },
    {
      path: '/color-picker',
      name: 'color-picker',
      component: () => import('../views/ColorPickerView.vue'),
    },
    {
      path: '/color-palette',
      name: 'color-palette',
      component: () => import('../views/ColorPaletteView.vue'),
    },
    {
      path: '/section-preview',
      name: 'section-preview',
      component: () => import('../views/SectionPreviewView.vue'),
    },
    {
      path: '/spectrum',
      name: 'spectrum',
      component: () => import('../views/SpectrumView.vue'),
    },
    {
      path: '/webgpu-showcase',
      name: 'webgpu-showcase',
      component: () => import('../views/WebGPUShowcaseView.vue'),
    },
  ],
})

export default router
