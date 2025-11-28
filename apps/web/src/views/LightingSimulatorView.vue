<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { RayTracingRenderer, HTMLToSceneAdapter, $Scene, createPCFShadowShader } from '../modules/Lighting/Infra'
import { $Light, $Color } from '../modules/Lighting/Domain/ValueObject'
import { $Vector3 } from '../modules/Vector/Domain/ValueObject'
import { computeBoxShadows, type Viewport, type BoxShadowResult } from '../modules/Lighting/Application'
import { $Hex, type Hex } from '../modules/Color/Domain/ValueObject'

const htmlContainerRef = ref<HTMLElement | null>(null)
const sampleHtmlRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: RayTracingRenderer | null = null

// Debug panel state
const debugPanelOpen = ref(true)

// Lighting presets
type LightPreset = {
  name: string
  primary: { x: number; y: number; z: number; intensity: number; colorHex: Hex }
  secondary: { x: number; y: number; z: number; intensity: number; colorHex: Hex }
  shadowBlur: number
}

const lightPresets: LightPreset[] = [
  {
    name: 'Default',
    primary: { x: 1, y: -1, z: 2, intensity: 0.5, colorHex: '#ffffff' },
    secondary: { x: -1, y: 1, z: 3, intensity: 0.1, colorHex: '#ffffff' },
    shadowBlur: 1.0,
  },
  {
    name: 'Outdoor Daylight',
    primary: { x: 1, y: -2, z: 3, intensity: 0.7, colorHex: '#fff5e6' },
    secondary: { x: -1, y: 0.5, z: 2, intensity: 0.15, colorHex: '#e6f0ff' },
    shadowBlur: 0.8,
  },
  {
    name: 'Indoor Cool',
    primary: { x: 0, y: -1, z: 2, intensity: 0.5, colorHex: '#e8f4ff' },
    secondary: { x: -1, y: 0, z: 1.5, intensity: 0.2, colorHex: '#ffffff' },
    shadowBlur: 1.5,
  },
  {
    name: 'Indoor Warm',
    primary: { x: 0.5, y: -1, z: 2, intensity: 0.5, colorHex: '#ffe4c4' },
    secondary: { x: -0.5, y: 0.5, z: 1.5, intensity: 0.15, colorHex: '#ffd9b3' },
    shadowBlur: 1.2,
  },
  {
    name: 'Sunset',
    primary: { x: 2, y: -0.5, z: 1, intensity: 0.6, colorHex: '#ff9966' },
    secondary: { x: -1, y: 0, z: 2, intensity: 0.1, colorHex: '#6699cc' },
    shadowBlur: 1.0,
  },
  {
    name: 'Studio',
    primary: { x: 1, y: -1, z: 2, intensity: 0.6, colorHex: '#ffffff' },
    secondary: { x: -1, y: 1, z: 2, intensity: 0.3, colorHex: '#ffffff' },
    shadowBlur: 0.5,
  },
  {
    name: 'Dramatic',
    primary: { x: 2, y: -1, z: 1.5, intensity: 0.8, colorHex: '#ffffff' },
    secondary: { x: -1, y: 0, z: 3, intensity: 0.05, colorHex: '#4466aa' },
    shadowBlur: 0.3,
  },
]

const currentPreset = ref<string | null>('Default')

// Light settings (reactive for UI binding)
const lightSettings = reactive({
  primary: { ...lightPresets[0].primary },
  secondary: { ...lightPresets[0].secondary },
  shadowBlur: lightPresets[0].shadowBlur,
})

// Apply preset
const applyPreset = (preset: LightPreset) => {
  currentPreset.value = preset.name
  lightSettings.primary = { ...preset.primary }
  lightSettings.secondary = { ...preset.secondary }
  lightSettings.shadowBlur = preset.shadowBlur
}

// Clear preset selection when manually adjusting
watch(lightSettings, () => {
  // Check if current settings match any preset
  const matchingPreset = lightPresets.find(p =>
    p.primary.x === lightSettings.primary.x &&
    p.primary.y === lightSettings.primary.y &&
    p.primary.z === lightSettings.primary.z &&
    p.primary.intensity === lightSettings.primary.intensity &&
    p.primary.colorHex === lightSettings.primary.colorHex &&
    p.secondary.x === lightSettings.secondary.x &&
    p.secondary.y === lightSettings.secondary.y &&
    p.secondary.z === lightSettings.secondary.z &&
    p.secondary.intensity === lightSettings.secondary.intensity &&
    p.secondary.colorHex === lightSettings.secondary.colorHex &&
    p.shadowBlur === lightSettings.shadowBlur
  )
  currentPreset.value = matchingPreset?.name ?? null
}, { deep: true })

// Convert hex to normalized RGB (0-1)
const hexToNormalizedRgb = (hex: Hex) => {
  const srgb = $Hex.toSrgb(hex)
  return { r: srgb.r / 255, g: srgb.g / 255, b: srgb.b / 255 }
}

// Debug state
const debugInfo = ref({
  viewport: { width: 0, height: 0, scrollX: 0, scrollY: 0 },
  elementsCount: 0,
  objectsCount: 0,
  lightsCount: 0,
  cameraPosition: { x: 0, y: 0, z: 0 },
  cameraSize: { width: 0, height: 0 },
})

// Box shadow results
const boxShadows = ref<BoxShadowResult[]>([])

const updateScene = () => {
  if (!htmlContainerRef.value || !sampleHtmlRef.value || !canvasRef.value || !renderer) return

  // Use container size for viewport (visible area)
  const containerRect = htmlContainerRef.value.getBoundingClientRect()
  const viewport: Viewport = {
    width: containerRect.width,
    height: containerRect.height,
    scrollX: htmlContainerRef.value.scrollLeft,
    scrollY: htmlContainerRef.value.scrollTop,
  }

  // Parse HTML to scene
  const elements = HTMLToSceneAdapter.parseElements(sampleHtmlRef.value, viewport)
  let { scene, camera } = HTMLToSceneAdapter.toScene(elements, viewport)

  // Create lights from settings
  const primaryRgb = hexToNormalizedRgb(lightSettings.primary.colorHex)
  const primaryColor = $Color.create(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  const secondaryRgb = hexToNormalizedRgb(lightSettings.secondary.colorHex)
  const secondaryColor = $Color.create(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b)
  const frontNormal = $Vector3.create(0, 0, -1)

  const directionalLights = [
    $Light.createDirectional(
      $Vector3.create(lightSettings.primary.x, lightSettings.primary.y, lightSettings.primary.z),
      primaryColor,
      lightSettings.primary.intensity
    ),
    $Light.createDirectional(
      $Vector3.create(lightSettings.secondary.x, lightSettings.secondary.y, lightSettings.secondary.z),
      secondaryColor,
      lightSettings.secondary.intensity
    ),
  ]

  // Calculate ambient so that ambient + directional contribution = 1 for front-facing surfaces
  const white = $Color.create(1.0, 1.0, 1.0)
  const ambientIntensity = Math.max(0, 1.0 - directionalLights.reduce(
    (sum, light) => sum + $Light.intensityToward(light, frontNormal),
    0
  ))

  // Add shadowShader to scene (PCF for CSS box-shadow-like blur)
  scene = { ...scene, shadowShader: createPCFShadowShader(0.3), shadowBlur: lightSettings.shadowBlur }

  scene = $Scene.add(
    scene,
    $Light.createAmbient(white, ambientIntensity),
    ...directionalLights,
  )

  // Update canvas size to match viewport
  canvasRef.value.width = viewport.width
  canvasRef.value.height = viewport.height

  // Update debug info
  debugInfo.value = {
    viewport,
    elementsCount: elements.length,
    objectsCount: scene.objects.length,
    lightsCount: scene.lights.length,
    cameraPosition: camera.position,
    cameraSize: { width: camera.width, height: camera.height },
  }

  renderer.render(scene, camera)

  // Compute box shadows from scene
  boxShadows.value = computeBoxShadows(scene, {
    shadowOpacity: 0.25,
    depthScale: 0.5,
    blurScale: 2.0,
  })
}

// Handle scroll sync
const onScroll = () => {
  updateScene()
}

// Handle resize
const onResize = () => {
  updateScene()
}

// Watch light settings changes
watch(lightSettings, () => {
  updateScene()
}, { deep: true })

onMounted(() => {
  if (!canvasRef.value) return
  renderer = new RayTracingRenderer(canvasRef.value)

  // Add event listeners
  window.addEventListener('resize', onResize)
  htmlContainerRef.value?.addEventListener('scroll', onScroll)

  // Wait for layout to complete
  requestAnimationFrame(() => {
    updateScene()
  })
})

onUnmounted(() => {
  // Remove event listeners
  window.removeEventListener('resize', onResize)
  htmlContainerRef.value?.removeEventListener('scroll', onScroll)

  renderer?.dispose()
  renderer = null
})
</script>

<template>
  <div class="flex h-screen bg-gray-900">
    <!-- Left: HTML Sample -->
    <div ref="htmlContainerRef" class="w-1/2 overflow-auto bg-white">
      <div ref="sampleHtmlRef" class="sample-html p-6">
        <!-- Header -->
        <header class="bg-slate-800 text-white p-4 rounded-lg mb-6">
          <nav class="flex items-center justify-between">
            <div class="text-xl font-bold">Sample Site</div>
            <ul class="flex gap-4">
              <li><a href="#" class="hover:text-blue-300">Home</a></li>
              <li><a href="#" class="hover:text-blue-300">About</a></li>
              <li><a href="#" class="hover:text-blue-300">Contact</a></li>
            </ul>
          </nav>
        </header>

        <!-- Hero Section -->
        <section class="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg mb-6">
          <h1 class="text-3xl font-bold mb-4">Welcome to Our Site</h1>
          <p class="text-lg mb-4">This is a sample HTML structure for lighting simulation.</p>
          <button class="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold">
            Get Started
          </button>
        </section>

        <!-- Content Grid -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-red-100 p-4 rounded-lg">
            <div class="bg-red-500 text-white p-3 rounded mb-2">
              <h3 class="font-bold">Card 1</h3>
            </div>
            <p class="text-gray-700 text-sm">Some content here with nested elements.</p>
          </div>
          <div class="bg-green-100 p-4 rounded-lg">
            <div class="bg-green-500 text-white p-3 rounded mb-2">
              <h3 class="font-bold">Card 2</h3>
            </div>
            <p class="text-gray-700 text-sm">Another card with different styling.</p>
          </div>
          <div class="bg-blue-100 p-4 rounded-lg">
            <div class="bg-blue-500 text-white p-3 rounded mb-2">
              <h3 class="font-bold">Card 3</h3>
            </div>
            <p class="text-gray-700 text-sm">Third card to show depth.</p>
          </div>
        </div>

        <!-- Nested Structure -->
        <div class="bg-gray-100 p-4 rounded-lg mb-6">
          <div class="bg-gray-200 p-4 rounded-lg">
            <div class="bg-gray-300 p-4 rounded-lg">
              <div class="bg-gray-400 p-4 rounded-lg">
                <div class="bg-gray-500 text-white p-4 rounded-lg text-center">
                  Deeply Nested Element (5 levels)
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <footer class="bg-slate-900 text-gray-400 p-6 rounded-lg">
          <div class="flex justify-between">
            <div>
              <h4 class="text-white font-bold mb-2">Company</h4>
              <ul class="space-y-1 text-sm">
                <li>About Us</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-bold mb-2">Resources</h4>
              <ul class="space-y-1 text-sm">
                <li>Documentation</li>
                <li>Blog</li>
                <li>Support</li>
              </ul>
            </div>
            <div>
              <h4 class="text-white font-bold mb-2">Legal</h4>
              <ul class="space-y-1 text-sm">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </div>

    <!-- Right: Canvas Simulation -->
    <div class="w-1/2 bg-gray-800 flex items-center justify-center">
      <canvas ref="canvasRef" class="max-w-full max-h-full" />
    </div>

    <!-- Debug Panel -->
    <div class="fixed bottom-4 right-4 bg-black/90 text-white text-xs font-mono rounded-lg shadow-xl">
      <!-- Toggle Button -->
      <button
        class="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 rounded-t-lg"
        @click="debugPanelOpen = !debugPanelOpen"
      >
        <span class="font-bold text-green-400">Debug Panel</span>
        <span class="text-gray-400">{{ debugPanelOpen ? '▼' : '▲' }}</span>
      </button>

      <!-- Panel Content -->
      <div v-show="debugPanelOpen" class="p-3 pt-0 w-80 max-h-[32rem] overflow-auto">
        <!-- Presets -->
        <div class="mb-3">
          <div class="font-bold mb-2 text-green-400">Presets</div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="preset in lightPresets"
              :key="preset.name"
              @click="applyPreset(preset)"
              :class="[
                'px-2 py-1 rounded text-[10px] transition-colors',
                currentPreset === preset.name
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              ]"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <!-- Scene Info -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="font-bold mb-1 text-blue-400">Scene Info</div>
          <div class="space-y-0.5 text-[11px]">
            <div>Viewport: {{ debugInfo.viewport.width.toFixed(0) }} x {{ debugInfo.viewport.height.toFixed(0) }}</div>
            <div>Scroll: ({{ debugInfo.viewport.scrollX.toFixed(0) }}, {{ debugInfo.viewport.scrollY.toFixed(0) }})</div>
            <div>Elements: {{ debugInfo.elementsCount }} | Objects: {{ debugInfo.objectsCount }}</div>
          </div>
        </div>

        <!-- Primary Light Controls -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="font-bold mb-2 text-yellow-400">Primary Light</div>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Direction</label>
              <input type="number" v-model.number="lightSettings.primary.x" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
              <input type="number" v-model.number="lightSettings.primary.y" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
              <input type="number" v-model.number="lightSettings.primary.z" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
            </div>
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Intensity</label>
              <input type="range" v-model.number="lightSettings.primary.intensity" min="0" max="1" step="0.05" class="flex-1" />
              <span class="w-10 text-right">{{ lightSettings.primary.intensity.toFixed(2) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Color</label>
              <input type="color" v-model="lightSettings.primary.colorHex" class="w-10 h-8 rounded cursor-pointer" />
              <span class="text-gray-500">{{ lightSettings.primary.colorHex }}</span>
            </div>
          </div>
        </div>

        <!-- Secondary Light Controls -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="font-bold mb-2 text-yellow-400">Secondary Light</div>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Direction</label>
              <input type="number" v-model.number="lightSettings.secondary.x" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
              <input type="number" v-model.number="lightSettings.secondary.y" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
              <input type="number" v-model.number="lightSettings.secondary.z" step="0.1" class="w-14 px-1 py-0.5 bg-gray-800 rounded text-center" />
            </div>
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Intensity</label>
              <input type="range" v-model.number="lightSettings.secondary.intensity" min="0" max="1" step="0.05" class="flex-1" />
              <span class="w-10 text-right">{{ lightSettings.secondary.intensity.toFixed(2) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <label class="w-16 text-gray-400">Color</label>
              <input type="color" v-model="lightSettings.secondary.colorHex" class="w-10 h-8 rounded cursor-pointer" />
              <span class="text-gray-500">{{ lightSettings.secondary.colorHex }}</span>
            </div>
          </div>
        </div>

        <!-- Shadow Settings -->
        <div class="border-t border-gray-700 pt-2 mb-3">
          <div class="font-bold mb-2 text-purple-400">Shadow</div>
          <div class="flex items-center gap-2">
            <label class="w-16 text-gray-400">Blur</label>
            <input type="range" v-model.number="lightSettings.shadowBlur" min="0" max="5" step="0.1" class="flex-1" />
            <span class="w-10 text-right">{{ lightSettings.shadowBlur.toFixed(1) }}</span>
          </div>
        </div>

        <!-- Box Shadow Output -->
        <div class="border-t border-gray-700 pt-2">
          <div class="font-bold mb-1 text-cyan-400">CSS Box Shadows ({{ boxShadows.length }})</div>
          <div class="space-y-1 text-[10px] max-h-32 overflow-auto">
            <div v-for="(shadow, i) in boxShadows.slice(0, 10)" :key="i" class="bg-gray-900 p-1 rounded">
              <span class="text-gray-500">[{{ shadow.objectIndex }}]</span> {{ shadow.boxShadow }}
            </div>
            <div v-if="boxShadows.length > 10" class="text-gray-500">... and {{ boxShadows.length - 10 }} more</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
