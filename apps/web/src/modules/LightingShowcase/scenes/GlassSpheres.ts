import { $SceneWebGPU, $SceneObjectWebGPU } from '../../Lighting/Infra'
import { $Camera, $Light, $Geometry, $Color } from '../../Lighting/Domain/ValueObject'
import { $Vector3 } from '@practice/vector'
import type { SceneDefinition } from '../SceneDefinition'

export const GlassSpheres: SceneDefinition = {
  id: 'glass-spheres',
  name: 'Glass Spheres',
  description: 'Transparent spheres with refraction',

  createCamera(aspectRatio) {
    const baseSize = 4
    const height = baseSize
    const width = baseSize * aspectRatio
    return $Camera.createOrthographic(
      $Vector3.create(0, 1, -6),
      $Vector3.create(0, 0, 0),
      $Vector3.create(0, 1, 0),
      width,
      height
    )
  },

  createScene(time) {
    const scene = $SceneWebGPU.create({
      backgroundColor: $Color.create(0.05, 0.05, 0.1),
      shadowBlur: 0.02,
    })

    // Lights
    const withLights = $SceneWebGPU.add(
      scene,
      $Light.createAmbient($Color.create(1.0, 1.0, 1.0), 0.3),
      $Light.createDirectional(
        $Vector3.create(0.5, -1, -0.3),
        $Color.create(1.0, 0.98, 0.95),
        0.9
      ),
      $Light.createDirectional(
        $Vector3.create(-0.4, -0.3, 0.8),
        $Color.create(0.7, 0.85, 1.0),
        0.3
      )
    )

    // Ground plane
    const ground = $SceneObjectWebGPU.createPlane(
      $Geometry.createPlane(
        $Vector3.create(0, -0.8, 0),
        $Vector3.create(0, 1, 0),
        10,
        10
      ),
      $Color.create(0.3, 0.35, 0.4)
    )

    // Back wall for refraction visibility
    const backWall = $SceneObjectWebGPU.createPlane(
      $Geometry.createPlane(
        $Vector3.create(0, 0, 3),
        $Vector3.create(0, 0, -1),
        8,
        4
      ),
      $Color.create(0.8, 0.3, 0.2) // Red-orange wall
    )

    // Colored boxes behind glass for refraction demo
    const boxes = [
      $SceneObjectWebGPU.createBox(
        $Geometry.createBox($Vector3.create(-1.2, -0.3, 1.5), $Vector3.create(0.4, 1, 0.4)),
        $Color.create(0.2, 0.6, 0.9) // Blue
      ),
      $SceneObjectWebGPU.createBox(
        $Geometry.createBox($Vector3.create(0, -0.3, 1.8), $Vector3.create(0.4, 1, 0.4)),
        $Color.create(0.9, 0.7, 0.2) // Yellow
      ),
      $SceneObjectWebGPU.createBox(
        $Geometry.createBox($Vector3.create(1.2, -0.3, 1.5), $Vector3.create(0.4, 1, 0.4)),
        $Color.create(0.2, 0.8, 0.4) // Green
      ),
    ]

    // Animation
    const bounce = Math.sin(time * 2) * 0.1
    const rotation = time * 0.5

    // Central glass sphere (large, IOR = 1.5 glass)
    const centralSphere = $SceneObjectWebGPU.createSphere(
      $Geometry.createSphere($Vector3.create(0, 0.2 + bounce, 0), 0.6),
      $Color.create(0.95, 0.97, 1.0), // Slight blue tint
      0.08, // Very low alpha (mostly transparent)
      1.5   // Glass IOR
    )

    // Orbiting smaller glass spheres with different IORs
    const orbitRadius = 1.3
    const orbitingSpheres = [
      // Diamond-like sphere (IOR = 2.4)
      $SceneObjectWebGPU.createSphere(
        $Geometry.createSphere(
          $Vector3.create(
            Math.cos(rotation) * orbitRadius,
            0.1 + Math.sin(time * 3) * 0.05,
            Math.sin(rotation) * orbitRadius
          ),
          0.25
        ),
        $Color.create(1.0, 1.0, 1.0),
        0.05,
        2.4 // Diamond IOR
      ),
      // Water-like sphere (IOR = 1.33)
      $SceneObjectWebGPU.createSphere(
        $Geometry.createSphere(
          $Vector3.create(
            Math.cos(rotation + Math.PI * 2 / 3) * orbitRadius,
            0.1 + Math.sin(time * 3 + 1) * 0.05,
            Math.sin(rotation + Math.PI * 2 / 3) * orbitRadius
          ),
          0.25
        ),
        $Color.create(0.8, 0.9, 1.0), // Blue tint for water
        0.1,
        1.33 // Water IOR
      ),
      // Semi-transparent colored sphere
      $SceneObjectWebGPU.createSphere(
        $Geometry.createSphere(
          $Vector3.create(
            Math.cos(rotation + Math.PI * 4 / 3) * orbitRadius,
            0.1 + Math.sin(time * 3 + 2) * 0.05,
            Math.sin(rotation + Math.PI * 4 / 3) * orbitRadius
          ),
          0.25
        ),
        $Color.create(1.0, 0.5, 0.7), // Pink
        0.3, // More opaque
        1.5
      ),
    ]

    // Semi-transparent capsule
    const capsule = $SceneObjectWebGPU.createCapsule(
      $Geometry.createCapsule(
        $Vector3.create(-1.8, -0.6, -0.5),
        $Vector3.create(-1.8, 0.4, -0.5),
        0.15
      ),
      $Color.create(0.6, 0.9, 0.7), // Mint green
      0.25,
      1.45
    )

    // Solid metallic sphere for contrast
    const solidSphere = $SceneObjectWebGPU.createSphere(
      $Geometry.createSphere($Vector3.create(1.8, -0.4, -0.3), 0.35),
      $Color.create(0.9, 0.85, 0.7) // Gold-ish
    )

    return $SceneWebGPU.add(
      withLights,
      ground,
      backWall,
      ...boxes,
      centralSphere,
      ...orbitingSpheres,
      capsule,
      solidSphere
    )
  },
}
