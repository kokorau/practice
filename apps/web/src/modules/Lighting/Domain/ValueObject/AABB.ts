import type { Vector3 } from '@practice/vector'
import type {
  PlaneGeometry,
  BoxGeometry,
  CapsuleGeometry,
  SphereGeometry,
  Geometry,
} from './Geometry'

/**
 * Axis-Aligned Bounding Box
 */
export interface AABB {
  readonly min: Vector3
  readonly max: Vector3
}

/**
 * Calculate AABB for a sphere
 */
const fromSphere = (geometry: SphereGeometry): AABB => {
  const { center, radius } = geometry
  return {
    min: { x: center.x - radius, y: center.y - radius, z: center.z - radius },
    max: { x: center.x + radius, y: center.y + radius, z: center.z + radius },
  }
}

/**
 * Calculate AABB for a box (handles rotation)
 */
const fromBox = (geometry: BoxGeometry): AABB => {
  const { center, size, rotation } = geometry
  const halfSize = { x: size.x / 2, y: size.y / 2, z: size.z / 2 }

  // No rotation - simple case
  if (!rotation || (rotation.x === 0 && rotation.y === 0 && rotation.z === 0)) {
    return {
      min: { x: center.x - halfSize.x, y: center.y - halfSize.y, z: center.z - halfSize.z },
      max: { x: center.x + halfSize.x, y: center.y + halfSize.y, z: center.z + halfSize.z },
    }
  }

  // With rotation - compute rotated corners and find extents
  const { x: rx, y: ry, z: rz } = rotation
  const cosX = Math.cos(rx), sinX = Math.sin(rx)
  const cosY = Math.cos(ry), sinY = Math.sin(ry)
  const cosZ = Math.cos(rz), sinZ = Math.sin(rz)

  // Build rotation matrix (ZYX order)
  const m00 = cosY * cosZ
  const m01 = cosY * sinZ
  const m02 = -sinY
  const m10 = sinX * sinY * cosZ - cosX * sinZ
  const m11 = sinX * sinY * sinZ + cosX * cosZ
  const m12 = sinX * cosY
  const m20 = cosX * sinY * cosZ + sinX * sinZ
  const m21 = cosX * sinY * sinZ - sinX * cosZ
  const m22 = cosX * cosY

  // For AABB of rotated box, we need extent along each axis
  // extent_i = sum(|m_ij| * halfSize_j) for j in {x,y,z}
  const extentX = Math.abs(m00) * halfSize.x + Math.abs(m01) * halfSize.y + Math.abs(m02) * halfSize.z
  const extentY = Math.abs(m10) * halfSize.x + Math.abs(m11) * halfSize.y + Math.abs(m12) * halfSize.z
  const extentZ = Math.abs(m20) * halfSize.x + Math.abs(m21) * halfSize.y + Math.abs(m22) * halfSize.z

  return {
    min: { x: center.x - extentX, y: center.y - extentY, z: center.z - extentZ },
    max: { x: center.x + extentX, y: center.y + extentY, z: center.z + extentZ },
  }
}

/**
 * Calculate AABB for a capsule
 */
const fromCapsule = (geometry: CapsuleGeometry): AABB => {
  const { pointA, pointB, radius } = geometry
  return {
    min: {
      x: Math.min(pointA.x, pointB.x) - radius,
      y: Math.min(pointA.y, pointB.y) - radius,
      z: Math.min(pointA.z, pointB.z) - radius,
    },
    max: {
      x: Math.max(pointA.x, pointB.x) + radius,
      y: Math.max(pointA.y, pointB.y) + radius,
      z: Math.max(pointA.z, pointB.z) + radius,
    },
  }
}

/**
 * Calculate AABB for a plane (returns null for infinite planes)
 */
const fromPlane = (geometry: PlaneGeometry): AABB | null => {
  const { point, normal, width, height } = geometry

  // Infinite plane - cannot cull
  if (width === undefined && height === undefined) {
    return null
  }

  // Build basis vectors for the plane
  const up = Math.abs(normal.y) < 0.999
    ? { x: 0, y: 1, z: 0 }
    : { x: 1, y: 0, z: 0 }

  // right = normalize(cross(up, normal))
  const crossX = up.y * normal.z - up.z * normal.y
  const crossY = up.z * normal.x - up.x * normal.z
  const crossZ = up.x * normal.y - up.y * normal.x
  const crossLen = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ)
  const right = { x: crossX / crossLen, y: crossY / crossLen, z: crossZ / crossLen }

  // planeUp = cross(normal, right)
  const planeUp = {
    x: normal.y * right.z - normal.z * right.y,
    y: normal.z * right.x - normal.x * right.z,
    z: normal.x * right.y - normal.y * right.x,
  }

  const halfW = (width ?? 1e6) / 2
  const halfH = (height ?? 1e6) / 2

  // Compute 4 corners
  const corners = [
    { x: point.x + right.x * halfW + planeUp.x * halfH, y: point.y + right.y * halfW + planeUp.y * halfH, z: point.z + right.z * halfW + planeUp.z * halfH },
    { x: point.x - right.x * halfW + planeUp.x * halfH, y: point.y - right.y * halfW + planeUp.y * halfH, z: point.z - right.z * halfW + planeUp.z * halfH },
    { x: point.x + right.x * halfW - planeUp.x * halfH, y: point.y + right.y * halfW - planeUp.y * halfH, z: point.z + right.z * halfW - planeUp.z * halfH },
    { x: point.x - right.x * halfW - planeUp.x * halfH, y: point.y - right.y * halfW - planeUp.y * halfH, z: point.z - right.z * halfW - planeUp.z * halfH },
  ]

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
 * Calculate AABB for any geometry (returns null if unbounded)
 */
const fromGeometry = (geometry: Geometry): AABB | null => {
  switch (geometry.type) {
    case 'sphere':
      return fromSphere(geometry)
    case 'box':
      return fromBox(geometry)
    case 'capsule':
      return fromCapsule(geometry)
    case 'plane':
      return fromPlane(geometry)
  }
}

/**
 * Check if two AABBs intersect
 */
const intersects = (a: AABB, b: AABB): boolean => {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  )
}

/**
 * Combine two AABBs into one that contains both
 */
const combine = (a: AABB | null, b: AABB | null): AABB | null => {
  if (!a) return b
  if (!b) return a
  return {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  }
}

/**
 * Calculate the surface area of an AABB
 */
const surfaceArea = (aabb: AABB): number => {
  const dx = aabb.max.x - aabb.min.x
  const dy = aabb.max.y - aabb.min.y
  const dz = aabb.max.z - aabb.min.z
  return 2 * (dx * dy + dy * dz + dz * dx)
}

/**
 * Calculate the centroid of an AABB
 */
const centroid = (aabb: AABB): Vector3 => ({
  x: (aabb.min.x + aabb.max.x) / 2,
  y: (aabb.min.y + aabb.max.y) / 2,
  z: (aabb.min.z + aabb.max.z) / 2,
})

export const $AABB = {
  fromSphere,
  fromBox,
  fromCapsule,
  fromPlane,
  fromGeometry,
  intersects,
  combine,
  surfaceArea,
  centroid,
}
