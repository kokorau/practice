<script setup lang="ts">
const pages = [
  {
    to: '/photo-filter',
    title: 'Photo Filter',
    description: 'LUTやカラーグレーディングで写真にフィルター効果を適用',
  },
  {
    to: '/ray-tracing',
    title: 'Ray Tracing',
    description: 'シンプルなレイトレーシングで光の物理シミュレーション',
  },
  {
    to: '/lighting-simulator',
    title: 'Lighting Simulator',
    description: 'HTML構造を3D空間にマッピングして照明効果をシミュレート',
  },
  {
    to: '/color-picker',
    title: 'Color Picker',
    description: 'カラーピッカーで色を選択',
  },
  {
    to: '/webgpu-showcase',
    title: 'WebGPU Showcase',
    description: 'WebGPUによるレイトレーシングシーンのショーケース',
  },
  {
    to: '/tone-lab',
    title: 'Tone Lab',
    description: 'Oklabベースの輝度プロファイル抽出とトーンカーブ解析',
  },
  {
    to: '/color-gamut',
    title: 'Color Gamut',
    description: 'Rec.2020, Display-P3, ACESなど広色域の確認と比較',
  },
  {
    to: '/semantic-color-palette',
    title: 'Semantic Color Palette',
    description: 'セマンティックカラーパレットの生成と管理',
  },
  {
    to: '/semantic-color-palette-generator',
    title: 'Semantic Color Palette Generator',
    description: 'ベースカラーからセマンティックカラーパレットを自動生成',
  },
  {
    to: '/image-auto-correction',
    title: 'Image Auto Correction',
    description: '画像の色調補正を分析してノーマライズ・LUT適用',
  },
  {
    to: '/image-clipper',
    title: 'Image Clipper',
    description: '画像の切り抜きとクロッピングを試す',
  },
]
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8 flex justify-center">
    <div class="w-full max-w-5xl">
      <h1 class="text-3xl font-bold mb-8">Practice</h1>
      <nav>
        <ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <li v-for="page in pages" :key="page.to">
            <RouterLink
              :to="page.to"
              class="block h-full p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <h2 class="text-lg font-semibold text-blue-400">{{ page.title }}</h2>
              <p class="text-sm text-gray-400 mt-1">{{ page.description }}</p>
            </RouterLink>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
