<script setup lang="ts">
import { ref, computed } from 'vue'
import { Point, Light, SceneObject, Shadow, Reflection, AmbientLight } from '../modules/Lighting/Domain'
import type { LightType, SceneObjectType, AmbientLightType } from '../modules/Lighting/Domain'
import { CssShadowRenderer } from '../modules/Lighting/Infra/Css/CssShadowRenderer'
import { CssReflectionRenderer } from '../modules/Lighting/Infra/Css/CssReflectionRenderer'
import ColorPalette from '../components/ColorPalette.vue'

// プリセット定義
type LightingPreset = {
  name: string
  description: string
  lights: Array<{ x: number; y: number; z: number; intensity: number; color: string }>
  objects: Array<{ x: number; y: number; depth: number }>
  ambient: { color: string; intensity: number }
}

const presets: LightingPreset[] = [
  {
    name: 'Natural Daylight',
    description: 'Soft overhead lighting with multiple objects',
    lights: [
      { x: 320, y: 180, z: 150, intensity: 0.9, color: '#fff4e6' },
    ],
    objects: [
      { x: 400, y: 300, depth: 15 },
      { x: 630, y: 300, depth: 8 },
      { x: 400, y: 510, depth: 20 },
      { x: 630, y: 510, depth: 5 },
    ],
    ambient: { color: '#fff8f0', intensity: 0.08 },
  },
  {
    name: 'Studio Setup',
    description: 'Three-point lighting for professional look',
    lights: [
      { x: 280, y: 150, z: 140, intensity: 1, color: '#ffffff' },
      { x: 700, y: 200, z: 120, intensity: 0.5, color: '#e0f2ff' },
      { x: 515, y: 500, z: 100, intensity: 0.3, color: '#fef3c7' },
    ],
    objects: [
      { x: 450, y: 320, depth: 12 },
      { x: 680, y: 320, depth: 18 },
      { x: 450, y: 530, depth: 8 },
    ],
    ambient: { color: '#f8fafc', intensity: 0.05 },
  },
  {
    name: 'Golden Hour',
    description: 'Warm sunset lighting from the side',
    lights: [
      { x: 280, y: 340, z: 90, intensity: 1, color: '#ff9500' },
      { x: 750, y: 300, z: 130, intensity: 0.4, color: '#ff6b35' },
    ],
    objects: [
      { x: 450, y: 350, depth: 10 },
      { x: 680, y: 350, depth: 15 },
      { x: 565, y: 530, depth: 8 },
    ],
    ambient: { color: '#ffd7aa', intensity: 0.15 },
  },
  {
    name: 'Neon Night',
    description: 'Colorful neon lights for dramatic effect',
    lights: [
      { x: 350, y: 260, z: 100, intensity: 0.9, color: '#ff6ec7' },
      { x: 680, y: 260, z: 100, intensity: 0.9, color: '#00d4ff' },
    ],
    objects: [
      { x: 515, y: 350, depth: 12 },
      { x: 515, y: 530, depth: 16 },
    ],
    ambient: { color: '#1e1b4b', intensity: 0.2 },
  },
]

// 光源リスト
const lights = ref<LightType[]>([
  Light.create('light-1', Point.create(320, 180, 150), { intensity: 0.9, color: '#fff4e6' }),
])

// オブジェクトリスト
const objects = ref<SceneObjectType[]>([
  SceneObject.create('obj-1', Point.create(400, 300), { width: 96, height: 96, depth: 15 }),
  SceneObject.create('obj-2', Point.create(630, 300), { width: 96, height: 96, depth: 8 }),
  SceneObject.create('obj-3', Point.create(400, 510), { width: 96, height: 96, depth: 20 }),
  SceneObject.create('obj-4', Point.create(630, 510), { width: 96, height: 96, depth: 5 }),
])

// 選択中のアイテム
const selectedLight = ref<string | null>('light-1')
const selectedObject = ref<string | null>('obj-1')

// 影・ハイライト・反射設定
const shadowStrength = ref(1)
const highlightStrength = ref(1)
const reflectionStrength = ref(1)

// 環境光
const ambientLight = ref<AmbientLightType>(AmbientLight.create('#fff8f0', 0.08))

// カードの基本色
const cardColors = {
  background: '#ffffff',
  headerFrom: '#60a5fa', // blue-400
  headerTo: '#a855f7', // purple-500
  title: '#1f2937', // gray-800
  text: '#6b7280', // gray-500
}

// 環境光を適用した色を取得
const getAdjustedColors = computed(() => {
  return AmbientLight.applyToColors(ambientLight.value, cardColors)
})

// DnD 状態
const dragging = ref<{ type: 'light' | 'object'; id: string } | null>(null)
const previewRef = ref<HTMLElement | null>(null)

// ID生成
let lightIdCounter = 4
let objectIdCounter = 4

// プリセット適用
const applyPreset = (preset: LightingPreset) => {
  // 光源をリセット
  lights.value = preset.lights.map((l, i) => {
    const id = `light-${i + 1}`
    lightIdCounter = Math.max(lightIdCounter, i + 1)
    return Light.create(
      id,
      Point.create(l.x, l.y, l.z),
      { intensity: l.intensity, color: l.color }
    )
  })

  // オブジェクトをリセット
  objects.value = preset.objects.map((o, i) => {
    const id = `obj-${i + 1}`
    objectIdCounter = Math.max(objectIdCounter, i + 1)
    return SceneObject.create(
      id,
      Point.create(o.x, o.y),
      { width: 96, height: 96, depth: o.depth }
    )
  })

  // 環境光を設定
  ambientLight.value = AmbientLight.create(preset.ambient.color, preset.ambient.intensity)

  // 選択をリセット
  selectedLight.value = lights.value[0]?.id ?? null
  selectedObject.value = objects.value[0]?.id ?? null
}

// 光源操作
const addLight = () => {
  if (lights.value.length >= 5) return
  lightIdCounter++
  const newLight = Light.create(
    `light-${lightIdCounter}`,
    Point.create(150 + lightIdCounter * 50, 150 + lightIdCounter * 30, 100),
    { intensity: 1 }
  )
  lights.value = [...lights.value, newLight]
  selectedLight.value = newLight.id
}

const removeLight = (id: string) => {
  lights.value = lights.value.filter((l) => l.id !== id)
  if (selectedLight.value === id) {
    selectedLight.value = lights.value[0]?.id ?? null
  }
}

const updateLight = (id: string, updates: Partial<Pick<LightType, 'intensity' | 'color'>> & { z?: number }) => {
  lights.value = lights.value.map((l) => {
    if (l.id !== id) return l
    let updated = l
    if (updates.intensity !== undefined) {
      updated = Light.setIntensity(updated, updates.intensity)
    }
    if (updates.z !== undefined) {
      updated = Light.moveTo(updated, Point.create(l.position.x, l.position.y, updates.z))
    }
    if (updates.color !== undefined) {
      updated = Light.setColor(updated, updates.color)
    }
    return updated
  })
}

// オブジェクト操作
const addObject = () => {
  objectIdCounter++
  const newObj = SceneObject.create(
    `obj-${objectIdCounter}`,
    Point.create(300 + objectIdCounter * 50, 250 + objectIdCounter * 30),
    { width: 96, height: 96, depth: 10 }
  )
  objects.value = [...objects.value, newObj]
  selectedObject.value = newObj.id
}

const removeObject = (id: string) => {
  objects.value = objects.value.filter((o) => o.id !== id)
  if (selectedObject.value === id) {
    selectedObject.value = objects.value[0]?.id ?? null
  }
}

const updateObjectDepth = (id: string, depth: number) => {
  objects.value = objects.value.map((o) => {
    if (o.id !== id) return o
    return SceneObject.resize(o, { depth })
  })
}

// 各オブジェクトのスタイルを計算
const getObjectStyle = (objId: string) => {
  const obj = objects.value.find((o) => o.id === objId)
  if (!obj) return {}

  const shadows = lights.value.map((light) => {
    const s = Shadow.calculate(light, obj)
    return { ...s, opacity: s.opacity * shadowStrength.value }
  })
  const highlights = lights.value.map((light) => {
    const h = Shadow.calculateHighlight(light, obj)
    return { ...h, opacity: h.opacity * highlightStrength.value }
  })

  return {
    boxShadow: CssShadowRenderer.toBoxShadowWithHighlight(shadows, highlights),
  }
}

// 各オブジェクトの反射スタイルを計算
const getReflectionStyle = (objId: string) => {
  const obj = objects.value.find((o) => o.id === objId)
  if (!obj) return {}

  const reflections = lights.value.map((light) => {
    const r = Reflection.calculate(light, obj)
    return { ...r, intensity: r.intensity * reflectionStrength.value }
  })

  return {
    background: CssReflectionRenderer.toBackgroundMultiple(reflections),
  }
}

// 選択中の Light/Object
const currentLight = computed(() => lights.value.find((l) => l.id === selectedLight.value))
const currentObject = computed(() => objects.value.find((o) => o.id === selectedObject.value))

// DnD ハンドラ
const startDrag = (type: 'light' | 'object', id: string, e: MouseEvent) => {
  e.preventDefault()
  dragging.value = { type, id }
  if (type === 'light') selectedLight.value = id
  else selectedObject.value = id
}

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.value || !previewRef.value) return

  const rect = previewRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))

  if (dragging.value.type === 'light') {
    lights.value = lights.value.map((l) => {
      if (l.id !== dragging.value!.id) return l
      return Light.moveTo(l, Point.create(Math.round(x), Math.round(y), l.position.z))
    })
  } else {
    objects.value = objects.value.map((o) => {
      if (o.id !== dragging.value!.id) return o
      return SceneObject.moveTo(o, Point.create(Math.round(x), Math.round(y)))
    })
  }
}

const stopDrag = () => {
  dragging.value = null
}
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white flex">
    <!-- 左パネル: Config -->
    <aside class="w-72 bg-gray-800 p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 class="text-lg font-bold">Config</h2>

      <!-- プリセット -->
      <div class="flex flex-col gap-2">
        <label class="text-sm text-gray-400">Presets</label>
        <div class="flex flex-col gap-1">
          <button
            v-for="preset in presets"
            :key="preset.name"
            class="text-xs px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-left"
            @click="applyPreset(preset)"
          >
            <div class="font-semibold">{{ preset.name }}</div>
            <div class="text-[0.65rem] text-gray-400">{{ preset.description }}</div>
          </button>
        </div>
      </div>

      <!-- 光源リスト -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-400">Lights ({{ lights.length }}/5)</label>
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
            :class="selectedLight === light.id ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-750'"
            @click="selectedLight = light.id"
          >
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: light.color }" />
            <span class="flex-1">{{ light.id }}</span>
            <button
              v-if="lights.length > 1"
              class="text-red-400 hover:text-red-300"
              @click.stop="removeLight(light.id)"
            >
              x
            </button>
          </div>
        </div>
        <!-- 選択中の光源設定 -->
        <div v-if="currentLight" class="flex flex-col gap-2 mt-2 p-2 bg-gray-700 rounded">
          <div class="text-xs text-gray-500">
            X: {{ currentLight.position.x }}, Y: {{ currentLight.position.y }}
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Z (Height): {{ currentLight.position.z }}</label>
            <input
              :value="currentLight.position.z"
              type="range"
              min="10"
              max="300"
              class="w-full"
              @input="(e) => updateLight(currentLight!.id, { z: Number((e.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Intensity: {{ currentLight.intensity.toFixed(2) }}</label>
            <input
              :value="currentLight.intensity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="w-full"
              @input="(e) => updateLight(currentLight!.id, { intensity: Number((e.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Color</label>
            <ColorPalette
              :model-value="currentLight.color"
              @update:model-value="(color) => updateLight(currentLight!.id, { color })"
            />
          </div>
        </div>
      </div>

      <!-- オブジェクトリスト -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-400">Objects ({{ objects.length }})</label>
          <button
            class="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
            @click="addObject"
          >
            + Add
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <div
            v-for="obj in objects"
            :key="obj.id"
            class="flex items-center gap-2 p-2 rounded cursor-pointer text-xs"
            :class="selectedObject === obj.id ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-750'"
            @click="selectedObject = obj.id"
          >
            <div class="w-3 h-3 bg-gray-500 rounded" />
            <span class="flex-1">{{ obj.id }}</span>
            <button
              v-if="objects.length > 1"
              class="text-red-400 hover:text-red-300"
              @click.stop="removeObject(obj.id)"
            >
              x
            </button>
          </div>
        </div>
        <!-- 選択中のオブジェクト設定 -->
        <div v-if="currentObject" class="flex flex-col gap-2 mt-2 p-2 bg-gray-700 rounded">
          <div class="text-xs text-gray-500">
            X: {{ currentObject.position.x }}, Y: {{ currentObject.position.y }}
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Depth: {{ currentObject.depth }}</label>
            <input
              :value="currentObject.depth"
              type="range"
              min="-20"
              max="30"
              class="w-full"
              @input="(e) => updateObjectDepth(currentObject!.id, Number((e.target as HTMLInputElement).value))"
            />
          </div>
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
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Reflection: {{ reflectionStrength.toFixed(2) }}</label>
          <input
            v-model.number="reflectionStrength"
            type="range"
            min="0"
            max="3"
            step="0.1"
            class="w-full"
          />
        </div>
      </div>

      <!-- 環境光設定 -->
      <div class="flex flex-col gap-2">
        <label class="text-sm text-gray-400">Ambient Light</label>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Color</label>
          <ColorPalette
            :model-value="ambientLight.color"
            @update:model-value="(color) => ambientLight = AmbientLight.setColor(ambientLight, color)"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Intensity: {{ ambientLight.intensity.toFixed(2) }}</label>
          <input
            :value="ambientLight.intensity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="w-full"
            @input="(e) => ambientLight = AmbientLight.setIntensity(ambientLight, Number((e.target as HTMLInputElement).value))"
          />
        </div>
      </div>

      <!-- デバッグ情報 -->
      <div class="flex flex-col gap-1 text-xs text-gray-500 mt-4">
        <div>Lights: {{ lights.length }}, Objects: {{ objects.length }}</div>
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
        <!-- 光源たち -->
        <div
          v-for="light in lights"
          :key="light.id"
          class="absolute w-4 h-4 rounded-full cursor-grab active:cursor-grabbing"
          :class="selectedLight === light.id ? 'ring-2 ring-white' : ''"
          :style="{
            left: `${light.position.x}px`,
            top: `${light.position.y}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: light.color,
            boxShadow: `0 0 20px 10px ${light.color}80`,
          }"
          @mousedown="(e) => startDrag('light', light.id, e)"
        />

        <!-- オブジェクトたち（カードデザイン） -->
        <div
          v-for="obj in objects"
          :key="obj.id"
          class="absolute w-48 rounded-xl cursor-grab active:cursor-grabbing overflow-hidden"
          :class="selectedObject === obj.id ? 'ring-2 ring-blue-500' : ''"
          :style="{
            left: `${obj.position.x}px`,
            top: `${obj.position.y}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: getAdjustedColors.background,
            ...getObjectStyle(obj.id),
          }"
          @mousedown="(e) => startDrag('object', obj.id, e)"
        >
          <!-- カードコンテンツ -->
          <div
            class="h-24"
            :style="{
              background: `linear-gradient(to bottom right, ${getAdjustedColors.headerFrom}, ${getAdjustedColors.headerTo})`,
            }"
          />
          <div class="p-3">
            <h3 class="text-sm font-semibold" :style="{ color: getAdjustedColors.title }">Card Title</h3>
            <p class="text-xs mt-1" :style="{ color: getAdjustedColors.text }">Sample card with lighting effects</p>
          </div>
          <!-- 反射オーバーレイ -->
          <div
            class="absolute inset-0 rounded-xl pointer-events-none"
            :style="getReflectionStyle(obj.id)"
          />
        </div>
      </div>
    </main>
  </div>
</template>
