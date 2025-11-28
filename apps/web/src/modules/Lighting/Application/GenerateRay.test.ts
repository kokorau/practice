import { describe, it, expect } from 'vitest'
import { generateRay } from './GenerateRay'
import type { OrthographicCamera } from '../Domain/ValueObject'

describe('generateRay', () => {
  const camera: OrthographicCamera = {
    type: 'orthographic',
    position: { x: 0, y: 0, z: 0 },
    lookAt: { x: 0, y: 0, z: 1 },
    up: { x: 0, y: 1, z: 0 },
    width: 2,
    height: 2,
  }

  it('generates ray at center', () => {
    const ray = generateRay(camera, 0.5, 0.5)

    expect(ray.origin.x).toBeCloseTo(0)
    expect(ray.origin.y).toBeCloseTo(0)
    expect(ray.origin.z).toBeCloseTo(0)
    expect(ray.direction).toEqual({ x: 0, y: 0, z: 1 })
  })

  it('generates ray at top-right corner', () => {
    const ray = generateRay(camera, 1, 1)

    expect(ray.origin.x).toBeCloseTo(1) // right edge
    expect(ray.origin.y).toBeCloseTo(1) // top edge
    expect(ray.origin.z).toBeCloseTo(0)
    expect(ray.direction).toEqual({ x: 0, y: 0, z: 1 })
  })

  it('generates ray at bottom-left corner', () => {
    const ray = generateRay(camera, 0, 0)

    expect(ray.origin.x).toBeCloseTo(-1) // left edge
    expect(ray.origin.y).toBeCloseTo(-1) // bottom edge
    expect(ray.origin.z).toBeCloseTo(0)
    expect(ray.direction).toEqual({ x: 0, y: 0, z: 1 })
  })

  it('all rays have same direction (orthographic)', () => {
    const ray1 = generateRay(camera, 0, 0)
    const ray2 = generateRay(camera, 1, 1)
    const ray3 = generateRay(camera, 0.5, 0.5)

    expect(ray1.direction).toEqual(ray2.direction)
    expect(ray2.direction).toEqual(ray3.direction)
  })
})
