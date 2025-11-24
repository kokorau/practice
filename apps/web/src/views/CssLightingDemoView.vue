<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Point, Light, SceneObject, Shadow, Reflection, AmbientLight } from '../modules/Lighting/Domain'
import type { LightType, AmbientLightType } from '../modules/Lighting/Domain'
import { CssShadowRenderer } from '../modules/Lighting/Infra/Css/CssShadowRenderer'
import { CssReflectionRenderer } from '../modules/Lighting/Infra/Css/CssReflectionRenderer'
import ColorPalette from '../components/ColorPalette.vue'

// 光源リスト (fixed position)
const lights = ref<LightType[]>([
  Light.create('light-1', Point.create(300, 200, 150), { intensity: 1, color: '#fff4e6' })
])

// 選択中の光源
const selectedLightId = ref<string>('light-1')
const selectedLight = computed(() => lights.value.find(l => l.id === selectedLightId.value) ?? lights.value[0])

// 光源ID カウンター
let lightIdCounter = 1

// 環境光
const ambientLight = ref<AmbientLightType>(AmbientLight.create('#fff8f0', 0.05))

// 背景スタイルを計算
const backgroundStyle = computed(() => {
  if (ambientLight.value.intensity === 0) {
    return { background: '#f5f5f5' }
  }
  // 薄い灰色ベースに環境光色を重ねる
  const opacity = Math.min(ambientLight.value.intensity * 0.3, 0.1)
  const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0')
  return {
    background: `linear-gradient(${ambientLight.value.color}${hexOpacity}, ${ambientLight.value.color}${hexOpacity}), #f5f5f5`,
    backgroundAttachment: 'fixed',
  }
})

// プリセット
type LightingPreset = {
  name: string
  description: string
  lights: Array<{ x: number; y: number; z: number; intensity: number; color: string }>
  ambient: { color: string; intensity: number }
}

const presets: LightingPreset[] = [
  {
    name: 'Natural Daylight',
    description: 'Soft overhead lighting like natural daylight',
    lights: [
      { x: 400, y: 200, z: 200, intensity: 0.8, color: '#fff4e6' },
    ],
    ambient: { color: '#fff8f0', intensity: 0.08 },
  },
  {
    name: 'Studio Setup',
    description: 'Three-point lighting for balanced illumination',
    lights: [
      { x: 300, y: 200, z: 180, intensity: 1, color: '#ffffff' }, // Key light
      { x: 600, y: 250, z: 150, intensity: 0.5, color: '#e0f2ff' }, // Fill light
      { x: 450, y: 400, z: 120, intensity: 0.3, color: '#fef3c7' }, // Back light
    ],
    ambient: { color: '#f8fafc', intensity: 0.05 },
  },
  {
    name: 'Golden Hour',
    description: 'Warm sunset lighting from the side',
    lights: [
      { x: 200, y: 300, z: 100, intensity: 1, color: '#ff9500' },
      { x: 700, y: 250, z: 150, intensity: 0.3, color: '#ff6b35' },
    ],
    ambient: { color: '#ffd7aa', intensity: 0.12 },
  },
  {
    name: 'Neon Night',
    description: 'Colorful neon lights for dramatic effect',
    lights: [
      { x: 250, y: 200, z: 120, intensity: 0.9, color: '#ff6ec7' },
      { x: 550, y: 200, z: 120, intensity: 0.9, color: '#00d4ff' },
    ],
    ambient: { color: '#1e1b4b', intensity: 0.15 },
  },
  {
    name: 'Dramatic Spotlight',
    description: 'Single strong light from above for high contrast',
    lights: [
      { x: 400, y: 150, z: 250, intensity: 1, color: '#ffffff' },
    ],
    ambient: { color: '#0f172a', intensity: 0.1 },
  },
]

const applyPreset = (preset: LightingPreset) => {
  lightIdCounter = 0
  lights.value = preset.lights.map((l) => {
    lightIdCounter++
    return Light.create(
      `light-${lightIdCounter}`,
      Point.create(l.x, l.y, l.z),
      { intensity: l.intensity, color: l.color }
    )
  })
  selectedLightId.value = lights.value[0]?.id ?? ''
  ambientLight.value = AmbientLight.create(preset.ambient.color, preset.ambient.intensity)
}

// 設定パネル表示
const showSettings = ref(true)

// 光源ドラッグ
const dragging = ref<string | null>(null)

const startDrag = (lightId: string, e: MouseEvent) => {
  e.preventDefault()
  dragging.value = lightId
  selectedLightId.value = lightId
}

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.value) return
  lights.value = lights.value.map(l => {
    if (l.id !== dragging.value) return l
    return Light.moveTo(l, Point.create(e.clientX, e.clientY, l.position.z))
  })
}

const stopDrag = () => {
  dragging.value = null
}

// 光源の追加・削除
const addLight = () => {
  if (lights.value.length >= 5) return
  lightIdCounter++
  const newLight = Light.create(
    `light-${lightIdCounter}`,
    Point.create(300 + lightIdCounter * 30, 200 + lightIdCounter * 30, 150),
    { intensity: 1, color: '#fff4e6' }
  )
  lights.value = [...lights.value, newLight]
  selectedLightId.value = newLight.id
}

const removeLight = (id: string) => {
  if (lights.value.length <= 1) return
  lights.value = lights.value.filter(l => l.id !== id)
  if (selectedLightId.value === id) {
    selectedLightId.value = lights.value[0]?.id ?? ''
  }
}

// 選択中の光源の更新
const updateSelectedLight = (updates: { z?: number; intensity?: number; color?: string }) => {
  lights.value = lights.value.map(l => {
    if (l.id !== selectedLightId.value) return l
    let updated = l
    if (updates.z !== undefined) {
      updated = Light.moveTo(updated, Point.create(l.position.x, l.position.y, updates.z))
    }
    if (updates.intensity !== undefined) {
      updated = Light.setIntensity(updated, updates.intensity)
    }
    if (updates.color !== undefined) {
      updated = Light.setColor(updated, updates.color)
    }
    return updated
  })
}

// グローバルイベント
onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopDrag)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopDrag)
})

// 要素のスタイルを計算
type LightingConfig = {
  depth: number
  colors: Record<string, string>
}

type CardStyle = {
  boxShadow: string
  reflection: string
  colors: Record<string, string>
}

const defaultCardStyle: CardStyle = {
  boxShadow: 'none',
  reflection: 'none',
  colors: { bg: '#ffffff' },
}

const computeStyles = (config: LightingConfig, rect: { x: number; y: number }): CardStyle => {
  const obj = SceneObject.create('temp', Point.create(rect.x, rect.y), {
    width: 100,
    height: 100,
    depth: config.depth,
  })

  const shadows = lights.value.map(light => Shadow.calculate(light, obj))
  const highlights = lights.value.map(light => Shadow.calculateHighlight(light, obj))
  const reflections = lights.value.map(light => Reflection.calculate(light, obj))

  const adjustedColors = AmbientLight.applyToColors(ambientLight.value, config.colors)

  return {
    boxShadow: CssShadowRenderer.toBoxShadowWithHighlight(shadows, highlights),
    reflection: CssReflectionRenderer.toBackgroundMultiple(reflections),
    colors: adjustedColors,
  }
}

// 各カードの設定と位置
const cards = ref<{ id: string; config: LightingConfig; rect: { x: number; y: number } }[]>([])
const cardRefs = ref<HTMLElement[]>([])

// カード位置の更新
const updateCardPositions = () => {
  cards.value = cardRefs.value.map((el, i) => {
    const rect = el.getBoundingClientRect()
    const config: LightingConfig = {
      depth: Number(el.dataset.lightingDepth ?? 10),
      colors: JSON.parse(el.dataset.lightingColors ?? '{"bg":"#ffffff"}'),
    }
    return {
      id: `card-${i}`,
      config,
      rect: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    }
  })
}

// スクロール・リサイズで更新
onMounted(() => {
  updateCardPositions()
  window.addEventListener('scroll', updateCardPositions)
  window.addEventListener('resize', updateCardPositions)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateCardPositions)
  window.removeEventListener('resize', updateCardPositions)
})

// カードのスタイルを取得
const getCardStyle = (index: number): CardStyle => {
  const card = cards.value[index]
  if (!card) return defaultCardStyle
  return computeStyles(card.config, card.rect)
}
</script>

<template>
  <div class="min-h-screen" :style="backgroundStyle">
    <!-- 固定光源たち -->
    <div
      v-for="light in lights"
      :key="light.id"
      class="fixed w-6 h-6 rounded-full cursor-grab active:cursor-grabbing z-50 border-1 border-gray-300"
      :class="selectedLightId === light.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''"
      :style="{
        left: `${light.position.x}px`,
        top: `${light.position.y}px`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: light.color,
        boxShadow: `0 0 40px 20px ${light.color}80`,
      }"
      @mousedown="(e) => startDrag(light.id, e)"
    />

    <!-- 設定パネル (固定) -->
    <aside
      v-if="showSettings"
      class="fixed top-4 right-4 w-64 bg-gray-900 text-white p-4 rounded-lg shadow-xl z-40 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
    >
      <div class="flex items-center justify-between">
        <h3 class="font-bold">Lighting Settings</h3>
        <button class="text-gray-400 hover:text-white" @click="showSettings = false">×</button>
      </div>

      <!-- プリセット -->
      <div class="flex flex-col gap-2">
        <label class="text-xs text-gray-400">Presets</label>
        <div class="flex flex-col gap-1">
          <button
            v-for="preset in presets"
            :key="preset.name"
            class="text-left p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
            @click="applyPreset(preset)"
          >
            <div class="text-xs font-semibold text-white">{{ preset.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5">{{ preset.description }}</div>
          </button>
        </div>
      </div>

      <!-- 光源リスト -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs text-gray-400">Lights ({{ lights.length }}/5)</label>
          <button
            class="text-xs bg-yellow-600 hover:bg-yellow-500 px-2 py-1 rounded disabled:opacity-50"
            :disabled="lights.length >= 5"
            @click="addLight"
          >
            + Add
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <div
            v-for="light in lights"
            :key="light.id"
            class="flex items-center gap-2 p-2 rounded cursor-pointer text-xs"
            :class="selectedLightId === light.id ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-750'"
            @click="selectedLightId = light.id"
          >
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: light.color }" />
            <span class="flex-1">{{ light.id }}</span>
            <button
              v-if="lights.length > 1"
              class="text-red-400 hover:text-red-300"
              @click.stop="removeLight(light.id)"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- 選択中の光源設定 -->
      <div v-if="selectedLight" class="flex flex-col gap-2 p-2 bg-gray-700 rounded">
        <div class="text-xs text-gray-500 font-semibold">{{ selectedLight.id }}</div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Z: {{ selectedLight.position.z }}</label>
          <input
            :value="selectedLight.position.z"
            type="range"
            min="50"
            max="400"
            class="w-full"
            @input="(e) => updateSelectedLight({ z: Number((e.target as HTMLInputElement).value) })"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Intensity: {{ selectedLight.intensity.toFixed(2) }}</label>
          <input
            :value="selectedLight.intensity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="w-full"
            @input="(e) => updateSelectedLight({ intensity: Number((e.target as HTMLInputElement).value) })"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Color</label>
          <div class="scale-75 origin-left">
            <ColorPalette
              :model-value="selectedLight.color"
              @update:model-value="(c) => updateSelectedLight({ color: c })"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-xs text-gray-400">Ambient Intensity: {{ ambientLight.intensity.toFixed(3) }}</label>
        <input
          :value="ambientLight.intensity"
          type="range"
          min="0"
          max="0.2"
          step="0.01"
          class="w-full"
          @input="(e) => ambientLight = AmbientLight.setIntensity(ambientLight, Number((e.target as HTMLInputElement).value))"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-xs text-gray-400">Ambient Color</label>
        <div class="scale-75 origin-left">
          <ColorPalette
            :model-value="ambientLight.color"
            @update:model-value="(c) => ambientLight = AmbientLight.setColor(ambientLight, c)"
          />
        </div>
      </div>
    </aside>

    <!-- 設定パネル トグル -->
    <button
      v-if="!showSettings"
      class="fixed top-4 right-4 bg-gray-900 text-white px-3 py-2 rounded-lg z-40"
      @click="showSettings = true"
    >
      Settings
    </button>

    <!-- メインコンテンツ -->
    <div class="max-w-5xl mx-auto px-6 py-12">
      <!-- Hero -->
      <header class="mb-16">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">CSS Lighting Demo</h1>
        <p class="text-gray-600">Drag the light source to see dynamic shadows and highlights.</p>
      </header>

      <!-- Feature Cards -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Features</h2>
        <div class="grid grid-cols-3 gap-6">
          <div
            v-for="(_, i) in 3"
            :key="i"
            :ref="(el) => { if (el) cardRefs[i] = el as HTMLElement }"
            :data-lighting-depth="12"
            :data-lighting-colors="JSON.stringify({ bg: '#ffffff', accent: ['#3b82f6', '#8b5cf6', '#ec4899'][i] })"
            class="rounded-xl overflow-hidden"
            :style="{
              backgroundColor: getCardStyle(i).colors?.bg ?? '#fff',
              boxShadow: getCardStyle(i).boxShadow,
            }"
          >
            <div
              class="h-32"
              :style="{ backgroundColor: getCardStyle(i).colors?.accent ?? '#3b82f6' }"
            />
            <div class="p-4 relative">
              <h3 class="font-semibold text-gray-800">Feature {{ i + 1 }}</h3>
              <p class="text-sm text-gray-500 mt-1">Description of this amazing feature.</p>
              <div
                class="absolute inset-0 pointer-events-none rounded-b-xl"
                :style="{ background: getCardStyle(i).reflection }"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Cards -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Statistics</h2>
        <div class="grid grid-cols-4 gap-4">
          <div
            v-for="(stat, i) in [
              { label: 'Users', value: '12,345' },
              { label: 'Revenue', value: '$98,765' },
              { label: 'Growth', value: '+23%' },
              { label: 'Rating', value: '4.9' },
            ]"
            :key="stat.label"
            :ref="(el) => { if (el) cardRefs[3 + i] = el as HTMLElement }"
            :data-lighting-depth="8"
            :data-lighting-colors="JSON.stringify({ bg: '#ffffff' })"
            class="p-6 rounded-lg text-center"
            :style="{
              backgroundColor: getCardStyle(3 + i).colors?.bg ?? '#fff',
              boxShadow: getCardStyle(3 + i).boxShadow,
            }"
          >
            <div class="text-2xl font-bold text-gray-900">{{ stat.value }}</div>
            <div class="text-sm text-gray-500">{{ stat.label }}</div>
          </div>
        </div>
      </section>

      <!-- Product Cards -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Products</h2>
        <div class="grid grid-cols-4 gap-6">
          <div
            v-for="(product, i) in [
              { name: 'Wireless Earbuds', price: '$79.99', color: '#fbbf24' },
              { name: 'Smart Watch', price: '$199.99', color: '#60a5fa' },
              { name: 'Laptop Stand', price: '$49.99', color: '#a78bfa' },
              { name: 'USB-C Hub', price: '$39.99', color: '#f472b6' },
            ]"
            :key="product.name"
            :ref="(el) => { if (el) cardRefs[7 + i] = el as HTMLElement }"
            :data-lighting-depth="15"
            :data-lighting-colors="JSON.stringify({ bg: '#ffffff', accent: product.color })"
            class="rounded-xl overflow-hidden"
            :style="{
              backgroundColor: getCardStyle(7 + i).colors?.bg ?? '#fff',
              boxShadow: getCardStyle(7 + i).boxShadow,
            }"
          >
            <div
              class="h-40 flex items-center justify-center text-white text-3xl font-bold"
              :style="{ backgroundColor: getCardStyle(7 + i).colors?.accent ?? product.color }"
            >
              {{ product.name[0] }}
            </div>
            <div class="p-4 relative">
              <h3 class="font-semibold text-gray-800 text-sm">{{ product.name }}</h3>
              <p class="text-lg font-bold text-gray-900 mt-1">{{ product.price }}</p>
              <div
                class="absolute inset-0 pointer-events-none rounded-b-xl"
                :style="{ background: getCardStyle(7 + i).reflection }"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Testimonials</h2>
        <div class="grid grid-cols-2 gap-6">
          <div
            v-for="i in 4"
            :key="`testimonial-${i}`"
            :ref="(el) => { if (el) cardRefs[11 + i - 1] = el as HTMLElement }"
            :data-lighting-depth="6"
            :data-lighting-colors="JSON.stringify({ bg: '#ffffff' })"
            class="p-6 rounded-xl"
            :style="{
              backgroundColor: getCardStyle(11 + i - 1).colors?.bg ?? '#fff',
              boxShadow: getCardStyle(11 + i - 1).boxShadow,
            }"
          >
            <p class="text-gray-600 italic mb-4">
              "This is an amazing product that has completely transformed how we work. Highly recommended!"
            </p>
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"
              />
              <div>
                <div class="font-semibold text-gray-800">User {{ i }}</div>
                <div class="text-xs text-gray-500">Customer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Buttons Showcase -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Buttons</h2>
        <div class="flex flex-wrap gap-4">
          <button
            v-for="(btn, i) in [
              { label: 'Primary', color: '#3b82f6' },
              { label: 'Success', color: '#10b981' },
              { label: 'Warning', color: '#f59e0b' },
              { label: 'Danger', color: '#ef4444' },
              { label: 'Purple', color: '#8b5cf6' },
              { label: 'Pink', color: '#ec4899' },
            ]"
            :key="btn.label"
            :ref="(el) => { if (el) cardRefs[15 + i] = el as HTMLElement }"
            :data-lighting-depth="4"
            :data-lighting-colors="JSON.stringify({ bg: btn.color })"
            class="px-6 py-3 rounded-lg text-white font-semibold"
            :style="{
              backgroundColor: getCardStyle(15 + i).colors?.bg ?? btn.color,
              boxShadow: getCardStyle(15 + i).boxShadow,
            }"
          >
            {{ btn.label }}
          </button>
        </div>
      </section>

      <!-- Large Hero Card -->
      <section class="mb-16">
        <div
          :ref="(el) => { if (el) cardRefs[21] = el as HTMLElement }"
          :data-lighting-depth="20"
          :data-lighting-colors="JSON.stringify({ bg: '#ffffff', hero: '#6366f1' })"
          class="rounded-2xl overflow-hidden"
          :style="{
            backgroundColor: getCardStyle(21).colors?.bg ?? '#fff',
            boxShadow: getCardStyle(21).boxShadow,
          }"
        >
          <div
            class="h-64 flex items-center justify-center text-white"
            :style="{ backgroundColor: getCardStyle(21).colors?.hero ?? '#6366f1' }"
          >
            <div class="text-center">
              <h2 class="text-4xl font-bold mb-2">Start Your Journey</h2>
              <p class="text-lg opacity-90">Experience the future today</p>
            </div>
          </div>
          <div class="p-8 relative">
            <h3 class="text-2xl font-bold text-gray-800 mb-4">Transform Your Workflow</h3>
            <p class="text-gray-600 mb-6">
              Join thousands of satisfied customers who have revolutionized their business with our cutting-edge solutions.
            </p>
            <div class="flex gap-4">
              <div class="flex-1 text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-gray-900">500+</div>
                <div class="text-sm text-gray-500">Companies</div>
              </div>
              <div class="flex-1 text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-gray-900">50k+</div>
                <div class="text-sm text-gray-500">Users</div>
              </div>
              <div class="flex-1 text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-gray-900">99.9%</div>
                <div class="text-sm text-gray-500">Uptime</div>
              </div>
            </div>
            <div
              class="absolute inset-0 pointer-events-none rounded-b-2xl"
              :style="{ background: getCardStyle(21).reflection }"
            />
          </div>
        </div>
      </section>

      <!-- Image Gallery -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Gallery</h2>
        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="i in 9"
            :key="`gallery-${i}`"
            :ref="(el) => { if (el) cardRefs[22 + i - 1] = el as HTMLElement }"
            :data-lighting-depth="12"
            :data-lighting-colors="JSON.stringify({ bg: ['#fef3c7', '#ddd6fe', '#fecaca', '#d1fae5', '#e0e7ff', '#fce7f3', '#fed7aa', '#bfdbfe', '#fde68a'][i - 1] })"
            class="aspect-square rounded-xl relative overflow-hidden"
            :style="{
              backgroundColor: getCardStyle(22 + i - 1).colors?.bg ?? '#e5e7eb',
              boxShadow: getCardStyle(22 + i - 1).boxShadow,
            }"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-400 text-4xl font-bold">
              {{ i }}
            </div>
            <div
              class="absolute inset-0 pointer-events-none rounded-xl"
              :style="{ background: getCardStyle(22 + i - 1).reflection }"
            />
          </div>
        </div>
      </section>

      <!-- Pricing Cards -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Pricing</h2>
        <div class="grid grid-cols-3 gap-6">
          <div
            v-for="(plan, i) in [
              { name: 'Basic', price: '$9', features: ['5 Projects', '10 GB Storage', 'Basic Support'] },
              { name: 'Pro', price: '$29', features: ['Unlimited Projects', '100 GB Storage', 'Priority Support'] },
              { name: 'Enterprise', price: '$99', features: ['Everything in Pro', 'Custom Integration', '24/7 Support'] },
            ]"
            :key="plan.name"
            :ref="(el) => { if (el) cardRefs[31 + i] = el as HTMLElement }"
            :data-lighting-depth="18"
            :data-lighting-colors="JSON.stringify({ bg: '#ffffff', accent: i === 1 ? '#6366f1' : '#94a3b8' })"
            class="rounded-2xl overflow-hidden relative"
            :style="{
              backgroundColor: getCardStyle(31 + i).colors?.bg ?? '#fff',
              boxShadow: getCardStyle(31 + i).boxShadow,
            }"
          >
            <div class="p-6 relative">
              <div
                v-if="i === 1"
                class="absolute top-0 right-0 px-3 py-1 text-xs font-semibold text-white rounded-bl-lg"
                :style="{ backgroundColor: getCardStyle(31 + i).colors?.accent ?? '#6366f1' }"
              >
                Popular
              </div>
              <h3 class="text-2xl font-bold text-gray-800 mb-2">{{ plan.name }}</h3>
              <div class="mb-4">
                <span class="text-4xl font-bold text-gray-900">{{ plan.price }}</span>
                <span class="text-gray-500">/month</span>
              </div>
              <ul class="space-y-2 mb-6">
                <li v-for="feature in plan.features" :key="feature" class="text-sm text-gray-600 flex items-center gap-2">
                  <span class="w-4 h-4 rounded-full" :style="{ backgroundColor: getCardStyle(31 + i).colors?.accent ?? '#94a3b8' }" />
                  {{ feature }}
                </li>
              </ul>
              <button
                class="w-full py-3 rounded-lg font-semibold"
                :class="i === 1 ? 'text-white' : 'text-gray-700 border border-gray-300'"
                :style="i === 1 ? { backgroundColor: getCardStyle(31 + i).colors?.accent ?? '#6366f1' } : {}"
              >
                Get Started
              </button>
              <div
                class="absolute inset-0 pointer-events-none rounded-2xl"
                :style="{ background: getCardStyle(31 + i).reflection }"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Long Content for Scroll -->
      <section class="mb-16">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">More Content</h2>
        <div class="grid grid-cols-2 gap-6">
          <div
            v-for="i in 20"
            :key="i"
            :ref="(el) => { if (el) cardRefs[34 + i - 1] = el as HTMLElement }"
            :data-lighting-depth="10"
            :data-lighting-colors="JSON.stringify({ bg: '#ffffff' })"
            class="p-6 rounded-xl"
            :style="{
              backgroundColor: getCardStyle(34 + i - 1).colors?.bg ?? '#fff',
              boxShadow: getCardStyle(34 + i - 1).boxShadow,
            }"
          >
            <h3 class="font-semibold text-gray-800 mb-2">Item {{ i }}</h3>
            <p class="text-sm text-gray-500">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
