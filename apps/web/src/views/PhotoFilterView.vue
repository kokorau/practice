<script setup lang="ts">
import { usePhotoUpload } from '../composables/PhotoLocal/usePhotoUpload'
import HistogramCanvas from '../components/HistogramCanvas.vue'

const { photo, analysis, canvasRef, handleFileChange } = usePhotoUpload()
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <h1 class="text-3xl font-bold mb-4">Photo Filter</h1>

    <div class="mb-4">
      <label class="block mb-2 text-sm text-gray-400">画像を選択</label>
      <input
        type="file"
        accept="image/*"
        @change="handleFileChange"
        class="block w-full text-sm text-gray-400
          file:mr-4 file:py-2 file:px-4
          file:rounded file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-600 file:text-white
          hover:file:bg-blue-700
          cursor-pointer"
      />
    </div>

    <div class="flex gap-8 items-start">
      <div class="border border-gray-700 rounded-lg p-4 inline-block">
        <canvas
          ref="canvasRef"
          :class="{ 'hidden': !photo }"
          class="max-w-full h-auto"
        />
        <p v-if="!photo" class="text-gray-500">画像をアップロードしてください</p>
      </div>

      <div v-if="analysis" class="border border-gray-700 rounded-lg p-4">
        <h2 class="text-sm text-gray-400 mb-2">Histogram</h2>
        <HistogramCanvas :data="analysis.histogram" :width="256" :height="100" />
      </div>
    </div>
  </div>
</template>
