<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RayTracingRenderer, HTMLToSceneAdapter, $Scene } from '../modules/Lighting/Infra'
import { $Light, $Color } from '../modules/Lighting/Domain/ValueObject'
import { $Vector3 } from '../modules/Vector/Domain/ValueObject'
import type { Viewport } from '../modules/Lighting/Application'

const htmlContainerRef = ref<HTMLElement | null>(null)
const sampleHtmlRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: RayTracingRenderer | null = null

// Debug state
const debugInfo = ref({
  viewport: { width: 0, height: 0, scrollX: 0, scrollY: 0 },
  elementsCount: 0,
  objectsCount: 0,
  lightsCount: 0,
  cameraPosition: { x: 0, y: 0, z: 0 },
  cameraSize: { width: 0, height: 0 },
})

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
  // Debug: log elements with borderRadius
  console.log('Elements with borderRadius:', elements.filter(e => e.borderRadius).map(e => ({ borderRadius: e.borderRadius, width: e.width, height: e.height })))
  let { scene, camera } = HTMLToSceneAdapter.toScene(elements, viewport)
  // Debug: log boxes with radius
  const boxesWithRadius = scene.objects.filter(o => o.type === 'box' && o.geometry.radius)
  console.log('Boxes with radius:', boxesWithRadius.map(b => b.type === 'box' ? { radius: b.geometry.radius, size: b.geometry.size } : null))

  // Add lights
  // Create directional lights first, then calculate ambient to make total = 1 for front-facing surfaces
  const white = $Color.create(1.0, 1.0, 1.0)
  const frontNormal = $Vector3.create(0, 0, -1)

  const directionalLights = [
    $Light.createDirectional($Vector3.create(1, -1, 2), white, 0.5),
    $Light.createDirectional($Vector3.create(-1, -0.5, 1), white, 0.3),
  ]

  // Calculate ambient so that ambient + directional contribution = 1 for front-facing surfaces
  const ambientIntensity = Math.max(0, 1.0 - directionalLights.reduce(
    (sum, light) => sum + $Light.intensityToward(light, frontNormal),
    0
  ))

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
}

onMounted(() => {
  if (!canvasRef.value) return
  renderer = new RayTracingRenderer(canvasRef.value)

  // Wait for layout to complete
  requestAnimationFrame(() => {
    updateScene()
  })
})

onUnmounted(() => {
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
    <div class="fixed bottom-4 right-4 bg-black/80 text-white text-xs font-mono p-3 rounded-lg max-w-xs">
      <div class="font-bold mb-2 text-green-400">Scene Debug</div>
      <div class="space-y-1">
        <div>Viewport: {{ debugInfo.viewport.width.toFixed(0) }} x {{ debugInfo.viewport.height.toFixed(0) }}</div>
        <div>Scroll: ({{ debugInfo.viewport.scrollX.toFixed(0) }}, {{ debugInfo.viewport.scrollY.toFixed(0) }})</div>
        <div class="border-t border-gray-600 pt-1 mt-1">Elements: {{ debugInfo.elementsCount }}</div>
        <div>Objects: {{ debugInfo.objectsCount }}</div>
        <div>Lights: {{ debugInfo.lightsCount }}</div>
        <div class="border-t border-gray-600 pt-1 mt-1">Camera pos: ({{ debugInfo.cameraPosition.x.toFixed(1) }}, {{ debugInfo.cameraPosition.y.toFixed(1) }}, {{ debugInfo.cameraPosition.z.toFixed(1) }})</div>
        <div>Camera size: {{ debugInfo.cameraSize.width.toFixed(0) }} x {{ debugInfo.cameraSize.height.toFixed(0) }}</div>
      </div>
    </div>
  </div>
</template>
