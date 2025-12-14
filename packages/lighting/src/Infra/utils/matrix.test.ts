import { describe, it, expect } from 'vitest'
import { eulerToMat3, eulerToMat3Inverse, eulerToMat3x3f, eulerToMat3x3fInverse } from './matrix'

describe('matrix utilities', () => {
  describe('eulerToMat3', () => {
    it('returns identity for zero rotation', () => {
      const mat = eulerToMat3({ x: 0, y: 0, z: 0 })
      expect(mat).toBeInstanceOf(Float32Array)
      expect(mat.length).toBe(9)
      // Identity matrix (column-major)
      expect(mat[0]).toBeCloseTo(1)
      expect(mat[1]).toBeCloseTo(0)
      expect(mat[2]).toBeCloseTo(0)
      expect(mat[3]).toBeCloseTo(0)
      expect(mat[4]).toBeCloseTo(1)
      expect(mat[5]).toBeCloseTo(0)
      expect(mat[6]).toBeCloseTo(0)
      expect(mat[7]).toBeCloseTo(0)
      expect(mat[8]).toBeCloseTo(1)
    })

    it('rotates around X axis', () => {
      const mat = eulerToMat3({ x: Math.PI / 2, y: 0, z: 0 })
      // 90 degree X rotation: y -> z, z -> -y
      expect(mat[0]).toBeCloseTo(1)
      expect(mat[4]).toBeCloseTo(0)
      expect(mat[5]).toBeCloseTo(1)
      expect(mat[7]).toBeCloseTo(-1)
      expect(mat[8]).toBeCloseTo(0)
    })

    it('rotates around Y axis', () => {
      const mat = eulerToMat3({ x: 0, y: Math.PI / 2, z: 0 })
      // 90 degree Y rotation: x -> -z, z -> x
      expect(mat[0]).toBeCloseTo(0)
      expect(mat[2]).toBeCloseTo(-1)
      expect(mat[4]).toBeCloseTo(1)
      expect(mat[6]).toBeCloseTo(1)
      expect(mat[8]).toBeCloseTo(0)
    })

    it('rotates around Z axis', () => {
      const mat = eulerToMat3({ x: 0, y: 0, z: Math.PI / 2 })
      // 90 degree Z rotation: x -> y, y -> -x
      expect(mat[0]).toBeCloseTo(0)
      expect(mat[1]).toBeCloseTo(1)
      expect(mat[3]).toBeCloseTo(-1)
      expect(mat[4]).toBeCloseTo(0)
      expect(mat[8]).toBeCloseTo(1)
    })
  })

  describe('eulerToMat3Inverse', () => {
    it('returns identity for zero rotation', () => {
      const mat = eulerToMat3Inverse({ x: 0, y: 0, z: 0 })
      expect(mat.length).toBe(9)
      expect(mat[0]).toBeCloseTo(1)
      expect(mat[4]).toBeCloseTo(1)
      expect(mat[8]).toBeCloseTo(1)
    })

    it('is transpose of eulerToMat3', () => {
      const euler = { x: 0.5, y: 0.3, z: 0.7 }
      const mat = eulerToMat3(euler)
      const inv = eulerToMat3Inverse(euler)

      // Transpose check (column-major)
      expect(inv[0]).toBeCloseTo(mat[0])
      expect(inv[1]).toBeCloseTo(mat[3])
      expect(inv[2]).toBeCloseTo(mat[6])
      expect(inv[3]).toBeCloseTo(mat[1])
      expect(inv[4]).toBeCloseTo(mat[4])
      expect(inv[5]).toBeCloseTo(mat[7])
      expect(inv[6]).toBeCloseTo(mat[2])
      expect(inv[7]).toBeCloseTo(mat[5])
      expect(inv[8]).toBeCloseTo(mat[8])
    })
  })

  describe('eulerToMat3x3f', () => {
    it('returns 12 floats (padded columns)', () => {
      const mat = eulerToMat3x3f({ x: 0, y: 0, z: 0 })
      expect(mat).toBeInstanceOf(Float32Array)
      expect(mat.length).toBe(12)
    })

    it('returns identity with padding for zero rotation', () => {
      const mat = eulerToMat3x3f({ x: 0, y: 0, z: 0 })
      // Column 0 + padding
      expect(mat[0]).toBeCloseTo(1)
      expect(mat[1]).toBeCloseTo(0)
      expect(mat[2]).toBeCloseTo(0)
      expect(mat[3]).toBe(0) // padding
      // Column 1 + padding
      expect(mat[4]).toBeCloseTo(0)
      expect(mat[5]).toBeCloseTo(1)
      expect(mat[6]).toBeCloseTo(0)
      expect(mat[7]).toBe(0) // padding
      // Column 2 + padding
      expect(mat[8]).toBeCloseTo(0)
      expect(mat[9]).toBeCloseTo(0)
      expect(mat[10]).toBeCloseTo(1)
      expect(mat[11]).toBe(0) // padding
    })

    it('has same rotation values as eulerToMat3 (excluding padding)', () => {
      const euler = { x: 0.3, y: 0.5, z: 0.2 }
      const mat3 = eulerToMat3(euler)
      const mat3x3f = eulerToMat3x3f(euler)

      // Column 0
      expect(mat3x3f[0]).toBeCloseTo(mat3[0]!)
      expect(mat3x3f[1]).toBeCloseTo(mat3[1]!)
      expect(mat3x3f[2]).toBeCloseTo(mat3[2]!)
      // Column 1
      expect(mat3x3f[4]).toBeCloseTo(mat3[3]!)
      expect(mat3x3f[5]).toBeCloseTo(mat3[4]!)
      expect(mat3x3f[6]).toBeCloseTo(mat3[5]!)
      // Column 2
      expect(mat3x3f[8]).toBeCloseTo(mat3[6]!)
      expect(mat3x3f[9]).toBeCloseTo(mat3[7]!)
      expect(mat3x3f[10]).toBeCloseTo(mat3[8]!)
    })
  })

  describe('eulerToMat3x3fInverse', () => {
    it('returns 12 floats', () => {
      const mat = eulerToMat3x3fInverse({ x: 0, y: 0, z: 0 })
      expect(mat.length).toBe(12)
    })

    it('is transpose of eulerToMat3x3f (excluding padding)', () => {
      const euler = { x: 0.4, y: 0.6, z: 0.1 }
      const mat = eulerToMat3x3f(euler)
      const inv = eulerToMat3x3fInverse(euler)

      // Transpose check (comparing actual rotation values, ignoring padding)
      // mat col 0 -> inv row 0
      expect(inv[0]).toBeCloseTo(mat[0])
      expect(inv[4]).toBeCloseTo(mat[1])
      expect(inv[8]).toBeCloseTo(mat[2])
      // mat col 1 -> inv row 1
      expect(inv[1]).toBeCloseTo(mat[4])
      expect(inv[5]).toBeCloseTo(mat[5])
      expect(inv[9]).toBeCloseTo(mat[6])
      // mat col 2 -> inv row 2
      expect(inv[2]).toBeCloseTo(mat[8])
      expect(inv[6]).toBeCloseTo(mat[9])
      expect(inv[10]).toBeCloseTo(mat[10])
    })
  })
})
