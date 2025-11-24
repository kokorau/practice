<script setup lang="ts">
import { ref, computed } from 'vue'
import { Point, Light, SceneObject, Scene, Shadow } from '../modules/Lighting/Domain'
import { CssShadowRenderer } from '../modules/Lighting/Infra/Css/CssShadowRenderer'

// 光源設定
const lightX = ref(200)
const lightY = ref(200)
const lightZ = ref(100)
const lightIntensity = ref(1)

// オブジェクト設定
const objectX = ref(400)
const objectY = ref(300)
const objectDepth = ref(10)

// 影・ハイライト設定
const shadowStrength = ref(1)
const highlightStrength = ref(1)

// DnD 状態
const dragging = ref<'light' | 'object' | null>(null)
const previewRef = ref<HTMLElement | null>(null)

// Scene を構築
const scene = computed(() => {
  let s = Scene.create({ width: 800, height: 600 })

  // 光源を追加
  const light = Light.create(
    'light-1',
    Point.create(lightX.value, lightY.value, lightZ.value),
    { intensity: lightIntensity.value }
  )
  s = Scene.addLight(s, light)

  // オブジェクトを追加
  const obj = SceneObject.create(
    'obj-1',
    Point.create(objectX.value, objectY.value),
    { width: 96, height: 96, depth: objectDepth.value }
  )
  s = Scene.addObject(s, obj)

  return s
})

// 影とハイライトを計算
const objectStyle = computed(() => {
  const obj = scene.value.objects[0]
  if (!obj) return {}

  const shadows = scene.value.lights.map((light) => {
    const s = Shadow.calculate(light, obj)
    return { ...s, opacity: s.opacity * shadowStrength.value }
  })
  const highlights = scene.value.lights.map((light) => {
    const h = Shadow.calculateHighlight(light, obj)
    return { ...h, opacity: h.opacity * highlightStrength.value }
  })

  return {
    boxShadow: CssShadowRenderer.toBoxShadowWithHighlight(shadows, highlights),
  }
})

// DnD ハンドラ
const startDrag = (target: 'light' | 'object', e: MouseEvent) => {
  e.preventDefault()
  dragging.value = target
}

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.value || !previewRef.value) return

  const rect = previewRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))

  if (dragging.value === 'light') {
    lightX.value = Math.round(x)
    lightY.value = Math.round(y)
  } else {
    objectX.value = Math.round(x)
    objectY.value = Math.round(y)
  }
}

const stopDrag = () => {
  dragging.value = null
}
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white flex">
    <!-- 左パネル: Config -->
    <aside class="w-64 bg-gray-800 p-4 flex flex-col gap-4">
      <h2 class="text-lg font-bold">Config</h2>

      <!-- 光源設定 -->
      <div class="flex flex-col gap-2">
        <label class="text-sm text-gray-400">Light</label>
        <div class="text-xs text-gray-500">X: {{ lightX }}, Y: {{ lightY }}</div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Z (Height): {{ lightZ }}</label>
          <input
            v-model.number="lightZ"
            type="range"
            min="10"
            max="300"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Intensity: {{ lightIntensity.toFixed(2) }}</label>
          <input
            v-model.number="lightIntensity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="w-full"
          />
        </div>
      </div>

      <!-- オブジェクト設定 -->
      <div class="flex flex-col gap-2">
        <label class="text-sm text-gray-400">Object</label>
        <div class="text-xs text-gray-500">X: {{ objectX }}, Y: {{ objectY }}</div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Depth: {{ objectDepth }}</label>
          <input
            v-model.number="objectDepth"
            type="range"
            min="-20"
            max="30"
            class="w-full"
          />
        </div>
      </div>

      <!-- 影・ハイライト設定 -->
      <div class="flex flex-col gap-2">
        <label class="text-sm text-gray-400">Effects</label>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Shadow: {{ shadowStrength.toFixed(2) }}</label>
          <input
            v-model.number="shadowStrength"
            type="range"
            min="0"
            max="2"
            step="0.1"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Highlight: {{ highlightStrength.toFixed(2) }}</label>
          <input
            v-model.number="highlightStrength"
            type="range"
            min="0"
            max="3"
            step="0.1"
            class="w-full"
          />
        </div>
      </div>

      <!-- デバッグ情報 -->
      <div class="flex flex-col gap-1 text-xs text-gray-500 mt-4">
        <div>Lights: {{ scene.lights.length }}</div>
        <div>Dragging: {{ dragging }}</div>
        <div class="break-all">{{ objectStyle.boxShadow }}</div>
      </div>
    </aside>

    <!-- 右パネル: Preview -->
    <main class="flex-1 p-4">
      <div
        ref="previewRef"
        class="relative w-full h-full min-h-[600px] bg-gray-200 rounded-lg overflow-hidden select-none"
        @mousemove="onMouseMove"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
      >
        <!-- 光源 -->
        <div
          class="absolute w-4 h-4 bg-yellow-300 rounded-full cursor-grab active:cursor-grabbing"
          :style="{
            left: `${lightX}px`,
            top: `${lightY}px`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 20px 10px rgba(253, 224, 71, 0.5)',
          }"
          @mousedown="(e) => startDrag('light', e)"
        />

        <!-- オブジェクト -->
        <div
          class="absolute w-24 h-24 bg-gray-500 rounded-lg cursor-grab active:cursor-grabbing"
          :style="{
            left: `${objectX}px`,
            top: `${objectY}px`,
            transform: 'translate(-50%, -50%)',
            ...objectStyle,
          }"
          @mousedown="(e) => startDrag('object', e)"
        />
      </div>
    </main>
  </div>
</template>
