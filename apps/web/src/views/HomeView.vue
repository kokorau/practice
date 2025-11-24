<script setup lang="ts">
const pages = [
  {
    to: '/photo-filter',
    title: 'Photo Filter',
    description: 'LUTやカラーグレーディングで写真にフィルター効果を適用',
  },
  {
    to: '/css-lighting',
    title: 'CSS Lighting',
    description: 'CSSで光源と影を表現するライティングシミュレーション',
  },
  {
    to: '/css-lighting-demo',
    title: 'CSS Lighting Demo',
    description: '実際のUIでライティング効果を確認するデモページ',
  },
]
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8 flex justify-center">
    <div class="w-full max-w-3xl">
      <h1 class="text-3xl font-bold mb-8">Practice</h1>
      <nav>
        <ul class="space-y-4">
          <li v-for="page in pages" :key="page.to">
            <RouterLink
              :to="page.to"
              class="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
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
