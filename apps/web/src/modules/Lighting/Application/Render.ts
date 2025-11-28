import type { OrthographicCamera, PlaneGeometry, Intersection } from '../Domain/ValueObject'
import { intersectPlane } from '../Domain/ValueObject'
import { generateRay } from './GenerateRay'

export interface ScenePlane {
  geometry: PlaneGeometry
  color: readonly [number, number, number] // RGB 0-255
}

export interface RenderOptions {
  width: number
  height: number
  camera: OrthographicCamera
  planes: ScenePlane[]
}

/**
 * Find closest intersection among all planes
 */
const findClosestHit = (
  ray: ReturnType<typeof generateRay>,
  planes: ScenePlane[]
): { hit: Intersection; plane: ScenePlane } | null => {
  let closest: { hit: Intersection; plane: ScenePlane } | null = null

  for (const plane of planes) {
    const hit = intersectPlane(ray, plane.geometry)
    if (hit && (!closest || hit.t < closest.hit.t)) {
      closest = { hit, plane }
    }
  }

  return closest
}

/**
 * Render scene to ImageData
 */
export const render = (options: RenderOptions): ImageData => {
  const { width, height, camera, planes } = options
  const imageData = new ImageData(width, height)
  const data = imageData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Convert pixel to UV coordinates (0-1)
      // Note: Canvas Y is top-down, we want bottom-up
      const u = x / width
      const v = 1 - y / height

      const ray = generateRay(camera, u, v)
      const result = findClosestHit(ray, planes)

      const index = (y * width + x) * 4

      if (result) {
        // Hit: use plane color
        data[index] = result.plane.color[0]     // R
        data[index + 1] = result.plane.color[1] // G
        data[index + 2] = result.plane.color[2] // B
        data[index + 3] = 255                   // A
      } else {
        // Miss: background color (dark blue)
        data[index] = 20      // R
        data[index + 1] = 20  // G
        data[index + 2] = 40  // B
        data[index + 3] = 255 // A
      }
    }
  }

  return imageData
}
