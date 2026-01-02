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
      path: '/spectrum',
      name: 'spectrum',
      component: () => import('../views/SpectrumView.vue'),
    },
    {
      path: '/webgpu-showcase',
      name: 'webgpu-showcase',
      component: () => import('../views/WebGPUShowcaseView.vue'),
    },
    {
      path: '/tone-lab',
      name: 'tone-lab',
      component: () => import('../views/ToneLabView.vue'),
    },
    {
      path: '/color-gamut',
      name: 'color-gamut',
      component: () => import('../views/ColorGamutView.vue'),
    },
    {
      path: '/semantic-color-palette',
      name: 'semantic-color-palette',
      component: () => import('../views/SemanticColorPaletteView.vue'),
    },
    {
      path: '/site-builder',
      name: 'site-builder',
      component: () => import('../views/SiteBuilderView.vue'),
    },
    {
      path: '/image-auto-correction',
      name: 'image-auto-correction',
      component: () => import('../views/ImageAutoCorrectionView.vue'),
    },
    {
      path: '/image-clipper',
      name: 'image-clipper',
      component: () => import('../views/ImageClipperView.vue'),
    },
    {
      path: '/asset-manager',
      name: 'asset-manager',
      component: () => import('../views/AssetManagerView.vue'),
    },
    {
      path: '/hero-view-generator',
      name: 'hero-view-generator',
      component: () => import('../views/HeroViewGeneratorView.vue'),
    },
    {
      path: '/gradient-lab',
      name: 'gradient-lab',
      component: () => import('../views/GradientLabView.vue'),
    },
  ],
})

export default router
