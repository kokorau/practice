<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RayTracingRenderer, $Scene, $SceneObject } from '../modules/Lighting/Infra'
import { $Camera, $Light, $Geometry, $Color } from '../modules/Lighting/Domain/ValueObject'
import { $Vector3 } from '../modules/Vector/Domain/ValueObject'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: RayTracingRenderer | null = null

const WIDTH = 400
const HEIGHT = 400

const camera = $Camera.createOrthographic(
  $Vector3.create(0, 0, 0),
  $Vector3.create(0, 0, 1),
  $Vector3.create(0, 1, 0),
  2,
  2
)

const scene = $Scene.add(
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
      $Vector3.create(Math.PI / 6, Math.PI / 4, 0)
    ),
    $Color.fromRgb255(100, 150, 255)
  ),
)

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  renderer = new RayTracingRenderer(canvas)
  renderer.render(scene, camera)
})

onUnmounted(() => {
  renderer?.dispose()
  renderer = null
})
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
    <h1 class="text-2xl font-bold mb-6">Ray Tracing Demo</h1>
    <canvas
      ref="canvasRef"
      :width="WIDTH"
      :height="HEIGHT"
      class="border border-gray-600"
    />
    <p class="mt-4 text-gray-400">
      WebGL ray tracing - orthographic camera
    </p>
  </div>
</template>
