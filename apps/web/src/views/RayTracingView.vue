<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import {
  RayTracingRenderer,
  $Scene,
  $SceneObject,
  RayTracingRendererWebGPU,
  $SceneWebGPU,
  $SceneObjectWebGPU,
  isWebGPUSupported,
} from '../modules/Lighting/Infra'
import { $Camera, $Light, $Geometry, $Color } from '../modules/Lighting/Domain/ValueObject'
import { $Vector3 } from '../modules/Vector/Domain/ValueObject'

const canvasRefWebGL = ref<HTMLCanvasElement | null>(null)
const canvasRefWebGPU = ref<HTMLCanvasElement | null>(null)
const webGPUSupported = ref(false)
const webGPUError = ref<string | null>(null)

let rendererWebGL: RayTracingRenderer | null = null
let rendererWebGPU: RayTracingRendererWebGPU | null = null
let animationFrameId: number | null = null

const WIDTH = 400
const HEIGHT = 400

const camera = $Camera.createOrthographic(
  $Vector3.create(0, 0, 0),
  $Vector3.create(0, 0, 1),
  $Vector3.create(0, 1, 0),
  2,
  2
)

// WebGL scene
function createSceneWebGL(rotationY: number) {
  return $Scene.add(
    $Scene.create(),
    $Light.createAmbient($Color.create(1.0, 1.0, 1.0), 0.2),
    $Light.createDirectional($Vector3.create(1, -1, 2), $Color.create(1.0, 0.2, 0.1), 0.6),
    $Light.createDirectional($Vector3.create(1, -2, 2), $Color.create(0.1, 0.3, 1.0), 0.6),
    $SceneObject.createPlane(
      $Geometry.createPlane($Vector3.create(0, 0, 5), $Vector3.create(0, 0, -1)),
      $Color.fromRgb255(255, 255, 255)
    ),
    $SceneObject.createBox(
      $Geometry.createBox(
        $Vector3.create(0, 0.05, 4.5),
        $Vector3.create(0.3, 0.3, 0.3),
        $Vector3.create(Math.PI / 6, rotationY, 0)
      ),
      $Color.fromRgb255(100, 150, 255)
    ),
  )
}

// WebGPU scene (uses same structure but different factory functions)
function createSceneWebGPU(rotationY: number) {
  return $SceneWebGPU.add(
    $SceneWebGPU.create(),
    $Light.createAmbient($Color.create(1.0, 1.0, 1.0), 0.2),
    $Light.createDirectional($Vector3.create(1, -1, 2), $Color.create(1.0, 0.2, 0.1), 0.6),
    $Light.createDirectional($Vector3.create(1, -2, 2), $Color.create(0.1, 0.3, 1.0), 0.6),
    $SceneObjectWebGPU.createPlane(
      $Geometry.createPlane($Vector3.create(0, 0, 5), $Vector3.create(0, 0, -1)),
      $Color.fromRgb255(255, 255, 255)
    ),
    $SceneObjectWebGPU.createBox(
      $Geometry.createBox(
        $Vector3.create(0, 0.05, 4.5),
        $Vector3.create(0.3, 0.3, 0.3),
        $Vector3.create(Math.PI / 6, rotationY, 0)
      ),
      $Color.fromRgb255(100, 150, 255)
    ),
  )
}

onMounted(async () => {
  // Initialize WebGL renderer
  const canvasGL = canvasRefWebGL.value
  if (canvasGL) {
    rendererWebGL = new RayTracingRenderer(canvasGL)
  }

  // Check and initialize WebGPU renderer
  webGPUSupported.value = await isWebGPUSupported()

  if (webGPUSupported.value) {
    // Wait for Vue to render the canvas element after webGPUSupported becomes true
    await nextTick()

    const canvasGPU = canvasRefWebGPU.value
    if (canvasGPU) {
      try {
        rendererWebGPU = await RayTracingRendererWebGPU.create(canvasGPU)
      } catch (e) {
        webGPUError.value = e instanceof Error ? e.message : 'Unknown error'
        webGPUSupported.value = false
      }
    }
  }

  let startTime: number | null = null

  function animate(timestamp: number) {
    if (startTime === null) startTime = timestamp
    const elapsed = timestamp - startTime

    const rotationY = (elapsed / 1000) * Math.PI * 0.5

    // Render WebGL
    if (rendererWebGL) {
      const sceneGL = createSceneWebGL(rotationY)
      rendererWebGL.render(sceneGL, camera)
    }

    // Render WebGPU
    if (rendererWebGPU) {
      const sceneGPU = createSceneWebGPU(rotationY)
      rendererWebGPU.render(sceneGPU, camera)
    }

    animationFrameId = requestAnimationFrame(animate)
  }

  animationFrameId = requestAnimationFrame(animate)
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  rendererWebGL?.dispose()
  rendererWebGL = null
  rendererWebGPU?.dispose()
  rendererWebGPU = null
})
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
    <h1 class="text-2xl font-bold mb-6">Ray Tracing Demo</h1>

    <div class="flex gap-8 flex-wrap justify-center">
      <!-- WebGL Canvas -->
      <div class="flex flex-col items-center">
        <h2 class="text-lg font-semibold mb-2 text-blue-400">WebGL</h2>
        <canvas
          ref="canvasRefWebGL"
          :width="WIDTH"
          :height="HEIGHT"
          class="border border-blue-600"
        />
        <p class="mt-2 text-gray-400 text-sm">WebGL 1.0</p>
      </div>

      <!-- WebGPU Canvas -->
      <div class="flex flex-col items-center">
        <h2 class="text-lg font-semibold mb-2 text-green-400">WebGPU</h2>
        <template v-if="webGPUSupported">
          <canvas
            ref="canvasRefWebGPU"
            :width="WIDTH"
            :height="HEIGHT"
            class="border border-green-600"
          />
          <p class="mt-2 text-gray-400 text-sm">WebGPU (WGSL)</p>
        </template>
        <template v-else>
          <div
            class="border border-red-600 flex items-center justify-center text-red-400"
            :style="{ width: WIDTH + 'px', height: HEIGHT + 'px' }"
          >
            <div class="text-center p-4">
              <p class="font-semibold">WebGPU Not Supported</p>
              <p v-if="webGPUError" class="text-sm mt-1">{{ webGPUError }}</p>
              <p v-else class="text-sm mt-1">
                Try Chrome 113+ or Edge 113+
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <p class="mt-6 text-gray-400">
      Orthographic camera - rotating box with directional lighting
    </p>
  </div>
</template>
