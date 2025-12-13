/**
 * FrustumCulling - Filter objects outside camera view
 *
 * For OrthographicCamera, the frustum is a simple box aligned with the view direction.
 * Objects outside this box are culled from rendering.
 * Shadow casters outside the view but casting shadows into the view are preserved.
 */

import { $Vector3, type Vector3 } from '../../Vector/Domain/ValueObject'
import type { OrthographicCamera, DirectionalLight } from '../Domain/ValueObject'
import type { AABB } from '../Domain/ValueObject/AABB'
import { $AABB } from '../Domain/ValueObject/AABB'
import type { RenderableObject } from '../Domain/ValueObject'

/** Default far plane distance */
const DEFAULT_FAR = 10000

/** Default shadow distance - how far back to look for shadow casters */
const DEFAULT_SHADOW_DISTANCE = 1000

/**
 * Calculate view frustum as AABB for OrthographicCamera
 *
 * The frustum extends from the camera position along the view direction.
 * Width and height define the visible area perpendicular to the view.
 */
export const calculateFrustum = (
  camera: OrthographicCamera,
  near: number = 0,
  far: number = DEFAULT_FAR
): AABB => {
  const { position, lookAt, up, width, height } = camera

  // View direction (normalized)
  const viewDir = $Vector3.normalize($Vector3.sub(lookAt, position))

  // Right vector (perpendicular to view and up)
  const right = $Vector3.normalize($Vector3.cross(viewDir, up))

  // Corrected up vector (perpendicular to view and right)
  const correctedUp = $Vector3.cross(right, viewDir)

  const halfW = width / 2
  const halfH = height / 2

  // Calculate 8 corners of the frustum box
  const nearCenter = $Vector3.add(position, $Vector3.scale(viewDir, near))
  const farCenter = $Vector3.add(position, $Vector3.scale(viewDir, far))

  const corners: Vector3[] = []

  for (const center of [nearCenter, farCenter]) {
    corners.push(
      $Vector3.add($Vector3.add(center, $Vector3.scale(right, halfW)), $Vector3.scale(correctedUp, halfH)),
      $Vector3.add($Vector3.add(center, $Vector3.scale(right, -halfW)), $Vector3.scale(correctedUp, halfH)),
      $Vector3.add($Vector3.add(center, $Vector3.scale(right, halfW)), $Vector3.scale(correctedUp, -halfH)),
      $Vector3.add($Vector3.add(center, $Vector3.scale(right, -halfW)), $Vector3.scale(correctedUp, -halfH))
    )
  }

  return {
    min: {
      x: Math.min(...corners.map(c => c.x)),
      y: Math.min(...corners.map(c => c.y)),
      z: Math.min(...corners.map(c => c.z)),
    },
    max: {
      x: Math.max(...corners.map(c => c.x)),
      y: Math.max(...corners.map(c => c.y)),
      z: Math.max(...corners.map(c => c.z)),
    },
  }
}

/**
 * Get geometry from a renderable object
 */
const getGeometry = (obj: RenderableObject) => {
  switch (obj.type) {
    case 'plane':
      return { ...obj.geometry, type: 'plane' as const }
    case 'box':
      return { ...obj.geometry, type: 'box' as const }
    case 'capsule':
      return { ...obj.geometry, type: 'capsule' as const }
    case 'sphere':
      return { ...obj.geometry, type: 'sphere' as const }
  }
}

/**
 * Check if an object is within the frustum
 */
export const isInFrustum = (obj: RenderableObject, frustum: AABB): boolean => {
  const geometry = getGeometry(obj)
  const aabb = $AABB.fromGeometry(geometry)

  // Unbounded objects (infinite planes) are always visible
  if (aabb === null) {
    return true
  }

  return $AABB.intersects(aabb, frustum)
}

/**
 * Filter objects to only those within the camera frustum
 */
export const cullObjects = <T extends RenderableObject>(
  objects: readonly T[],
  frustum: AABB
): T[] => {
  return objects.filter(obj => isInFrustum(obj, frustum))
}

/**
 * Extend frustum in the opposite direction of a light to capture shadow casters
 *
 * Objects outside the view frustum but within this extended region
 * can cast shadows into the visible area.
 */
export const extendFrustumForShadow = (
  frustum: AABB,
  lightDirection: Vector3,
  distance: number = DEFAULT_SHADOW_DISTANCE
): AABB => {
  // Light direction points where light goes, shadows come from opposite direction
  // Extend frustum in the opposite direction of light
  const extension = $Vector3.scale(lightDirection, -distance)

  return {
    min: {
      x: Math.min(frustum.min.x, frustum.min.x + extension.x),
      y: Math.min(frustum.min.y, frustum.min.y + extension.y),
      z: Math.min(frustum.min.z, frustum.min.z + extension.z),
    },
    max: {
      x: Math.max(frustum.max.x, frustum.max.x + extension.x),
      y: Math.max(frustum.max.y, frustum.max.y + extension.y),
      z: Math.max(frustum.max.z, frustum.max.z + extension.z),
    },
  }
}

/**
 * Calculate combined frustum that includes shadow caster regions for all lights
 */
export const calculateShadowFrustum = (
  baseFrustum: AABB,
  lights: readonly DirectionalLight[],
  shadowDistance: number = DEFAULT_SHADOW_DISTANCE
): AABB => {
  if (lights.length === 0) {
    return baseFrustum
  }

  // Start with base frustum
  let combined = baseFrustum

  // Extend for each light direction
  for (const light of lights) {
    const extended = extendFrustumForShadow(baseFrustum, light.direction, shadowDistance)
    combined = {
      min: {
        x: Math.min(combined.min.x, extended.min.x),
        y: Math.min(combined.min.y, extended.min.y),
        z: Math.min(combined.min.z, extended.min.z),
      },
      max: {
        x: Math.max(combined.max.x, extended.max.x),
        y: Math.max(combined.max.y, extended.max.y),
        z: Math.max(combined.max.z, extended.max.z),
      },
    }
  }

  return combined
}
