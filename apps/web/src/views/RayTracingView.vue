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
} from '@practice/lighting/Infra'
import { $Camera, $Light, $Geometry, $Color } from '@practice/lighting'
import { $Vector3 } from '@practice/vector'

const canvasRefWebGL = ref<HTMLCanvasElement | null>(null)
const canvasRefWebGPU = ref<HTMLCanvasElement | null>(null)
const webGPUSupported = ref(false)
const webGPUError = ref<string | null>(null)

let rendererWebGL: RayTracingRenderer | null = null
let rendererWebGPU: RayTracingRendererWebGPU | null = null
let animationFrameId: number | null = null

const WIDTH = 400
const HEIGHT = 400

// Camera looking up at the scene from below (low angle / worm's eye view)
// position: カメラ位置, lookAt: 見るターゲット点
const camera = $Camera.createOrthographic(
  $Vector3.create(0, 2, -2),     // カメラ位置: 手前下から
  $Vector3.create(0, 0, 5),          // ターゲット: シーン中心（奥）
  $Vector3.create(0, 1, 0),
  2.5,
  2.5
)

// Building layout: [x, z, width, depth, height] - positions on the ground plane
// Mix of tall towers, medium buildings, and low structures
const buildings: [number, number, number, number, number][] = [
  // Center tower - tallest
  [0, 0, 0.12, 0.12, 0.7],
  // Tall towers (accent)
  [0.22, -0.1, 0.09, 0.12, 0.55],
  [0.18, 0.22, 0.1, 0.1, 0.5],
  [0.35, -0.32, 0.08, 0.1, 0.45],
  // Medium buildings (bulk of the cityscape)
  [-0.2, -0.15, 0.1, 0.1, 0.3],
  [-0.15, 0.2, 0.11, 0.09, 0.28],
  [-0.38, -0.1, 0.1, 0.14, 0.25],
  [0.4, 0.05, 0.08, 0.12, 0.32],
  [0.05, -0.38, 0.14, 0.08, 0.22],
  [-0.05, 0.4, 0.12, 0.08, 0.26],
  [-0.35, 0.3, 0.09, 0.09, 0.3],
  [-0.42, 0.1, 0.07, 0.07, 0.28],
  [0.44, -0.12, 0.06, 0.08, 0.24],
  // Low buildings for contrast
  [-0.45, -0.35, 0.08, 0.08, 0.12],
  [0.45, 0.38, 0.1, 0.08, 0.14],
  [-0.1, -0.42, 0.12, 0.06, 0.1],
  [0.12, 0.45, 0.08, 0.06, 0.11],
]

// Building colors - various concrete/glass tones
const buildingColors = [
  $Color.fromRgb255(180, 180, 190),  // Light gray
  $Color.fromRgb255(150, 160, 170),  // Blue-gray
  $Color.fromRgb255(200, 195, 185),  // Warm gray
  $Color.fromRgb255(160, 170, 180),  // Cool gray
  $Color.fromRgb255(170, 165, 160),  // Taupe
]

// Rotate a point around Y axis
function rotateY(x: number, z: number, angle: number): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [x * cos - z * sin, x * sin + z * cos]
}

// Building base Z (how far forward buildings come from ground)
const BASE_Z = 4.5

// Create buildings for a scene
function createBuildings<T>(
  rotationY: number,
  createBox: (geometry: ReturnType<typeof $Geometry.createBox>, color: ReturnType<typeof $Color.fromRgb255>) => T
): T[] {
  const result: T[] = []

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i]!
    const [bx, bz, width, depth, height] = b
    const color = buildingColors[i % buildingColors.length]!

    // Building center Y is half the height (sitting on ground)
    const centerY = height / 2 - 0.3

    // Rotate building position around Y axis (X-Z plane rotation)
    // bx, bz are the local positions on the platform
    const [rx, rz] = rotateY(bx, bz, rotationY)

    // Final position: rotated X, fixed Y, rotated Z offset from BASE_Z
    result.push(
      createBox(
        $Geometry.createBox(
          $Vector3.create(rx, centerY, BASE_Z + rz),
          $Vector3.create(width, height, depth),
          $Vector3.create(0, rotationY, 0)  // Rotate building orientation too
        ),
        color
      )
    )
  }

  return result
}

// WebGL scene
function createSceneWebGL(rotationY: number) {
  const scene = $Scene.create()

  // Add lights - two directional lights from different angles
  const withLights = $Scene.add(
    scene,
    $Light.createAmbient($Color.create(1.0, 1.0, 1.0), 0.15),
    // Warm light from top-left
    $Light.createDirectional(
      $Vector3.create(1, -1, 1),
      $Color.create(1.0, 0.9, 0.8),
      0.7
    ),
    // Cool fill light from top-right
    $Light.createDirectional(
      $Vector3.create(-0.5, -1, 0.5),
      $Color.create(0.8, 0.85, 1.0),
      0.3
    )
  )

  // Add ground plane (horizontal, under the platform)
  // Normal pointing up (0, 1, 0) = horizontal plane
  // Position at Y = -0.34 (just below the platform which is at Y = -0.32)
  const withGround = $Scene.add(
    withLights,
    // Horizontal ground plane under the platform
    $SceneObject.createPlane(
      $Geometry.createPlane($Vector3.create(0, -0.34, BASE_Z), $Vector3.create(0, 1, 0)),
      $Color.fromRgb255(240, 240, 245)
    ),
    // Ground platform (rotates with buildings) - centered at BASE_Z
    $SceneObject.createBox(
      $Geometry.createBox(
        $Vector3.create(0, -0.32, BASE_Z),
        $Vector3.create(1.3, 0.04, 1.3),
        $Vector3.create(0, rotationY, 0)
      ),
      $Color.fromRgb255(220, 215, 210)
    )
  )

  // Add buildings
  const buildingObjects = createBuildings(rotationY, $SceneObject.createBox)
  return $Scene.add(withGround, ...buildingObjects)
}

// WebGPU scene (uses same structure but different factory functions)
function createSceneWebGPU(rotationY: number) {
  const scene = $SceneWebGPU.create()

  // Add lights
  const withLights = $SceneWebGPU.add(
    scene,
    $Light.createAmbient($Color.create(1.0, 1.0, 1.0), 0.15),
    $Light.createDirectional(
      $Vector3.create(1, -1, 1),
      $Color.create(1.0, 0.9, 0.8),
      0.7
    ),
    $Light.createDirectional(
      $Vector3.create(-0.5, -1, 0.5),
      $Color.create(0.8, 0.85, 1.0),
      0.3
    )
  )

  // Add ground plane (horizontal, under the platform)
  const withGround = $SceneWebGPU.add(
    withLights,
    $SceneObjectWebGPU.createPlane(
      $Geometry.createPlane($Vector3.create(0, -0.34, BASE_Z), $Vector3.create(0, 1, 0)),
      $Color.fromRgb255(240, 240, 245)
    ),
    $SceneObjectWebGPU.createBox(
      $Geometry.createBox(
        $Vector3.create(0, -0.32, BASE_Z),
        $Vector3.create(1.3, 0.04, 1.3),
        $Vector3.create(0, rotationY, 0)
      ),
      $Color.fromRgb255(220, 215, 210)
    )
  )

  // Add buildings
  const buildingObjects = createBuildings(rotationY, $SceneObjectWebGPU.createBox)
  return $SceneWebGPU.add(withGround, ...buildingObjects)
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

    const rotationY = (elapsed / 1000) * Math.PI * 0.25  // 50% slower

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
      Rotating cityscape with two directional lights
    </p>
  </div>
</template>
