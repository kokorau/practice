/**
 * Matrix utilities for GPU rendering
 * Provides rotation matrix creation from Euler angles
 */

import type { Vector3 } from '@practice/vector'

/**
 * Create rotation matrix from Euler angles (XYZ order)
 * Returns column-major mat3 as Float32Array (9 elements) for WebGL
 */
export const eulerToMat3 = (euler: Vector3): Float32Array => {
  const cx = Math.cos(euler.x), sx = Math.sin(euler.x)
  const cy = Math.cos(euler.y), sy = Math.sin(euler.y)
  const cz = Math.cos(euler.z), sz = Math.sin(euler.z)

  // Rotation matrix R = Rz * Ry * Rx (applied in order X, Y, Z)
  // Column-major order
  return new Float32Array([
    cy * cz,                      cy * sz,                      -sy,
    sx * sy * cz - cx * sz,       sx * sy * sz + cx * cz,       sx * cy,
    cx * sy * cz + sx * sz,       cx * sy * sz - sx * cz,       cx * cy,
  ])
}

/**
 * Create inverse rotation matrix (transpose of rotation matrix)
 * Returns column-major mat3 as Float32Array (9 elements) for WebGL
 */
export const eulerToMat3Inverse = (euler: Vector3): Float32Array => {
  const cx = Math.cos(euler.x), sx = Math.sin(euler.x)
  const cy = Math.cos(euler.y), sy = Math.sin(euler.y)
  const cz = Math.cos(euler.z), sz = Math.sin(euler.z)

  // Transpose of rotation matrix (column-major)
  return new Float32Array([
    cy * cz,                      sx * sy * cz - cx * sz,       cx * sy * cz + sx * sz,
    cy * sz,                      sx * sy * sz + cx * cz,       cx * sy * sz - sx * cz,
    -sy,                          sx * cy,                      cx * cy,
  ])
}

/**
 * Create rotation matrix from Euler angles (XYZ order)
 * Returns column-major mat3x3f as Float32Array (12 elements) for WebGPU/WGSL
 * Each column is padded to 16 bytes (vec3f alignment)
 */
export const eulerToMat3x3f = (euler: Vector3): Float32Array => {
  const cx = Math.cos(euler.x), sx = Math.sin(euler.x)
  const cy = Math.cos(euler.y), sy = Math.sin(euler.y)
  const cz = Math.cos(euler.z), sz = Math.sin(euler.z)

  // mat3x3f in WGSL: each column is vec3f (padded to 16 bytes)
  // 3 columns × 4 floats = 12 floats (48 bytes)
  return new Float32Array([
    cy * cz,
    cy * sz,
    -sy,
    0, // column 0 + padding
    sx * sy * cz - cx * sz,
    sx * sy * sz + cx * cz,
    sx * cy,
    0, // column 1 + padding
    cx * sy * cz + sx * sz,
    cx * sy * sz - sx * cz,
    cx * cy,
    0, // column 2 + padding
  ])
}

/**
 * Create inverse rotation matrix (transpose of rotation matrix)
 * Returns column-major mat3x3f as Float32Array (12 elements) for WebGPU/WGSL
 */
export const eulerToMat3x3fInverse = (euler: Vector3): Float32Array => {
  const cx = Math.cos(euler.x), sx = Math.sin(euler.x)
  const cy = Math.cos(euler.y), sy = Math.sin(euler.y)
  const cz = Math.cos(euler.z), sz = Math.sin(euler.z)

  // Transpose of rotation matrix (column-major with padding)
  return new Float32Array([
    cy * cz,
    sx * sy * cz - cx * sz,
    cx * sy * cz + sx * sz,
    0,
    cy * sz,
    sx * sy * sz + cx * cz,
    cx * sy * sz - sx * cz,
    0,
    -sy,
    sx * cy,
    cx * cy,
    0,
  ])
}
