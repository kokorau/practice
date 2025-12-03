import { $SceneWebGPU, $SceneObjectWebGPU } from '../../Infra'
import { $Camera, $Light, $Geometry, $Color } from '../../Domain/ValueObject'
import { $Vector3 } from '../../../Vector/Domain/ValueObject'
import type { SceneDefinition } from '../SceneDefinition'

function hslToRgb(h: number, s: number, l: number): ReturnType<typeof $Color.create> {
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return $Color.create(r, g, b)
}

export const SphereSpace: SceneDefinition = {
  id: 'sphere-space',
  name: 'Sphere Space',
  description: 'Capsules radiating from a spherical core',

  createCamera(aspectRatio) {
    const baseSize = 3.5
    const height = baseSize
    const width = baseSize * aspectRatio
    return $Camera.createOrthographic(
      $Vector3.create(0, 0, -5),
      $Vector3.create(0, 0, 5),
      $Vector3.create(0, 1, 0),
      width,
      height
    )
  },

  createScene(time) {
    const scene = $SceneWebGPU.create()

    const withLights = $SceneWebGPU.add(
      scene,
      $Light.createAmbient($Color.create(1.0, 1.0, 1.0), 0.2),
      $Light.createDirectional(
        $Vector3.create(0.5, -1, -0.5),
        $Color.create(1.0, 0.95, 0.9),
        0.8
      ),
      $Light.createDirectional(
        $Vector3.create(-0.3, -0.5, 0.8),
        $Color.create(0.8, 0.9, 1.0),
        0.3
      )
    )

    const capsuleObjects: ReturnType<typeof $SceneObjectWebGPU.createCapsule>[] = []
    const sphereRadius = 1.2
    const capsuleRadius = 0.015
    const capsuleLength = 0.4

    const rotY = time * 0.3
    const rotX = time * 0.2

    // Generate points on a sphere using Fibonacci lattice
    const numLines = 60
    const phi = (1 + Math.sqrt(5)) / 2 // Golden ratio

    for (let i = 0; i < numLines; i++) {
      const y = 1 - (i / (numLines - 1)) * 2
      const radiusAtY = Math.sqrt(1 - y * y)
      const theta = (2 * Math.PI * i) / phi

      let dx = radiusAtY * Math.cos(theta)
      let dy = y
      let dz = radiusAtY * Math.sin(theta)

      // Rotate around Y
      const cosY = Math.cos(rotY)
      const sinY = Math.sin(rotY)
      const rx = dx * cosY - dz * sinY
      const rz = dx * sinY + dz * cosY
      dx = rx
      dz = rz

      // Rotate around X
      const cosX = Math.cos(rotX)
      const sinX = Math.sin(rotX)
      const ry = dy * cosX - dz * sinX
      const rz2 = dy * sinX + dz * cosX
      dy = ry
      dz = rz2

      const startDist = sphereRadius - capsuleLength / 2
      const endDist = sphereRadius + capsuleLength / 2

      const startX = dx * startDist
      const startY = dy * startDist
      const startZ = dz * endDist + 5

      const endX = dx * endDist
      const endY = dy * endDist
      const endZ = dz * startDist + 5

      const hue = (theta / (2 * Math.PI) + rotY / (2 * Math.PI)) % 1
      const saturation = 0.7
      const lightness = 0.6
      const color = hslToRgb(hue, saturation, lightness)

      capsuleObjects.push(
        $SceneObjectWebGPU.createCapsule(
          $Geometry.createCapsule(
            $Vector3.create(startX, startY, startZ),
            $Vector3.create(endX, endY, endZ),
            capsuleRadius
          ),
          color
        )
      )
    }

    return $SceneWebGPU.add(withLights, ...capsuleObjects)
  },
}
