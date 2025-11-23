<script setup lang="ts">
import { computed } from 'vue'
import { usePhotoUpload } from '../composables/PhotoLocal/usePhotoUpload'
import { usePhotoCanvas } from '../composables/Photo/usePhotoCanvas'
import { usePhotoAnalysis } from '../composables/Photo/usePhotoAnalysis'
import { useFilter } from '../composables/Filter/useFilter'
import HistogramCanvas from '../components/HistogramCanvas.vue'
import PhotoStats from '../components/PhotoStats.vue'
import CurveEditor from '../components/CurveEditor.vue'

const { photo, handleFileChange } = usePhotoUpload()
const { filter, lut, setMasterPoint, reset } = useFilter(7)
const { canvasRef } = usePhotoCanvas(photo, { lut: computed(() => lut.value) })

// Original analysis (before filter)
const { analysis: originalAnalysis } = usePhotoAnalysis(photo)
// Filtered analysis (after filter)
const { analysis: filteredAnalysis } = usePhotoAnalysis(photo, { lut })

const handlePointUpdate = (index: number, value: number) => {
  setMasterPoint(index, value)
}
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

    <div class="flex gap-8 items-start flex-wrap">
      <!-- Canvas -->
      <div class="border border-gray-700 rounded-lg p-4 inline-block">
        <canvas
          ref="canvasRef"
          :class="{ 'hidden': !photo }"
          class="max-w-full h-auto"
        />
        <p v-if="!photo" class="text-gray-500">画像をアップロードしてください</p>
      </div>

      <!-- Controls & Analysis -->
      <div class="space-y-4">
        <!-- Curve Editor -->
        <div class="border border-gray-700 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-sm text-gray-400">Tone Curve</h2>
            <button
              @click="reset"
              class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Reset
            </button>
          </div>
          <CurveEditor
            :curve="filter.master"
            :width="256"
            :height="150"
            @update:point="handlePointUpdate"
          />
          <div class="mt-2 text-xs text-gray-500">
            ポイントをドラッグして調整
          </div>
        </div>

        <!-- Histograms: Before / After -->
        <div v-if="originalAnalysis && filteredAnalysis" class="border border-gray-700 rounded-lg p-4">
          <h2 class="text-sm text-gray-400 mb-3">Histogram</h2>
          <div class="flex gap-4">
            <div>
              <div class="text-xs text-gray-500 mb-1">Before</div>
              <HistogramCanvas :data="originalAnalysis.histogram" :width="200" :height="80" />
            </div>
            <div>
              <div class="text-xs text-gray-500 mb-1">After</div>
              <HistogramCanvas :data="filteredAnalysis.histogram" :width="200" :height="80" />
            </div>
          </div>
        </div>

        <!-- Stats: Before / After -->
        <div v-if="originalAnalysis && filteredAnalysis" class="border border-gray-700 rounded-lg p-4">
          <h2 class="text-sm text-gray-400 mb-3">Statistics</h2>
          <div class="flex gap-6">
            <div>
              <div class="text-xs text-gray-500 mb-2">Before</div>
              <PhotoStats :stats="originalAnalysis.stats" />
            </div>
            <div class="border-l border-gray-700 pl-6">
              <div class="text-xs text-gray-500 mb-2">After</div>
              <PhotoStats :stats="filteredAnalysis.stats" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
