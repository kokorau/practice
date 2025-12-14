import { $SceneWebGPU, $SceneObjectWebGPU } from '../../Lighting/Infra'
import { $Camera, $Light, $Geometry, $Color } from '../../Lighting/Domain/ValueObject'
import { $Vector3 } from '@practice/vector'
import type { SceneDefinition } from '../SceneDefinition'

const buildings: [number, number, number, number, number][] = [
  [0, 0, 0.12, 0.12, 0.7],
  [0.22, -0.1, 0.09, 0.12, 0.55],
  [0.18, 0.22, 0.1, 0.1, 0.5],
  [0.35, -0.32, 0.08, 0.1, 0.45],
  [-0.2, -0.15, 0.1, 0.1, 0.3],
  [-0.15, 0.2, 0.11, 0.09, 0.28],
  [-0.38, -0.1, 0.1, 0.14, 0.25],
  [0.4, 0.05, 0.08, 0.12, 0.32],
  [0.05, -0.38, 0.14, 0.08, 0.22],
  [-0.05, 0.4, 0.12, 0.08, 0.26],
  [-0.35, 0.3, 0.09, 0.09, 0.3],
  [-0.42, 0.1, 0.07, 0.07, 0.28],
  [0.44, -0.12, 0.06, 0.08, 0.24],
  [-0.45, -0.35, 0.08, 0.08, 0.12],
  [0.45, 0.38, 0.1, 0.08, 0.14],
  [-0.1, -0.42, 0.12, 0.06, 0.1],
  [0.12, 0.45, 0.08, 0.06, 0.11],
]

const buildingColors = [
  $Color.fromRgb255(180, 180, 190),
  $Color.fromRgb255(150, 160, 170),
  $Color.fromRgb255(200, 195, 185),
  $Color.fromRgb255(160, 170, 180),
  $Color.fromRgb255(170, 165, 160),
]

function rotateY(x: number, z: number, angle: number): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [x * cos - z * sin, x * sin + z * cos]
}

const BASE_Z = 4.5

export const Cityscape: SceneDefinition = {
  id: 'cityscape',
  name: 'Cityscape',
  description: 'Rotating city with buildings and two-point lighting',

  createCamera(aspectRatio) {
    const baseSize = 2.5
    const height = baseSize
    const width = baseSize * aspectRatio
    return $Camera.createOrthographic(
      $Vector3.create(0, 2, -2),
      $Vector3.create(0, 0, 5),
      $Vector3.create(0, 1, 0),
      width,
      height
    )
  },

  createScene(time) {
    const rotationY = time * Math.PI * 0.25

    const scene = $SceneWebGPU.create()

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

    const buildingObjects = buildings.map((b, i) => {
      const [bx, bz, width, depth, height] = b
      const color = buildingColors[i % buildingColors.length]!
      const centerY = height / 2 - 0.3
      const [rx, rz] = rotateY(bx, bz, rotationY)

      return $SceneObjectWebGPU.createBox(
        $Geometry.createBox(
          $Vector3.create(rx, centerY, BASE_Z + rz),
          $Vector3.create(width, height, depth),
          $Vector3.create(0, rotationY, 0)
        ),
        color
      )
    })

    return $SceneWebGPU.add(withGround, ...buildingObjects)
  },
}
