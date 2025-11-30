import { describe, it, expect } from 'vitest'
import { $Material } from './Material'

describe('$Material', () => {
  describe('create', () => {
    it('should create material with all properties', () => {
      const material = $Material.create([0.8, 0.2, 0.1], 0.5, 0.3, [0.1, 0.1, 0])

      expect(material.albedo).toEqual([0.8, 0.2, 0.1])
      expect(material.roughness).toBe(0.5)
      expect(material.metallic).toBe(0.3)
      expect(material.emissive).toEqual([0.1, 0.1, 0])
    })

    it('should default emissive to black', () => {
      const material = $Material.create([1, 1, 1], 0.5, 0)

      expect(material.emissive).toEqual([0, 0, 0])
    })

    it('should clamp albedo values to 0-1', () => {
      const material = $Material.create([1.5, -0.5, 0.5], 0.5, 0)

      expect(material.albedo[0]).toBe(1)
      expect(material.albedo[1]).toBe(0)
      expect(material.albedo[2]).toBe(0.5)
    })

    it('should clamp roughness to 0-1', () => {
      const materialLow = $Material.create([1, 1, 1], -0.5, 0)
      expect(materialLow.roughness).toBe(0)

      const materialHigh = $Material.create([1, 1, 1], 1.5, 0)
      expect(materialHigh.roughness).toBe(1)
    })

    it('should clamp metallic to 0-1', () => {
      const materialLow = $Material.create([1, 1, 1], 0.5, -0.5)
      expect(materialLow.metallic).toBe(0)

      const materialHigh = $Material.create([1, 1, 1], 0.5, 1.5)
      expect(materialHigh.metallic).toBe(1)
    })

    it('should clamp emissive values to 0-1', () => {
      const material = $Material.create([1, 1, 1], 0.5, 0, [2, -1, 0.5])

      expect(material.emissive[0]).toBe(1)
      expect(material.emissive[1]).toBe(0)
      expect(material.emissive[2]).toBe(0.5)
    })
  })

  describe('diffuse', () => {
    it('should create diffuse material with roughness 1 and metallic 0', () => {
      const material = $Material.diffuse([0.5, 0.5, 0.5])

      expect(material.albedo).toEqual([0.5, 0.5, 0.5])
      expect(material.roughness).toBe(1)
      expect(material.metallic).toBe(0)
      expect(material.emissive).toEqual([0, 0, 0])
    })

    it('should clamp albedo values', () => {
      const material = $Material.diffuse([1.5, -0.5, 0.5])

      expect(material.albedo).toEqual([1, 0, 0.5])
    })
  })

  describe('metal', () => {
    it('should create metallic material with metallic 1', () => {
      const material = $Material.metal([0.9, 0.8, 0.7])

      expect(material.albedo).toEqual([0.9, 0.8, 0.7])
      expect(material.roughness).toBe(0.1) // default
      expect(material.metallic).toBe(1)
      expect(material.emissive).toEqual([0, 0, 0])
    })

    it('should accept custom roughness', () => {
      const material = $Material.metal([1, 1, 1], 0.3)

      expect(material.roughness).toBe(0.3)
    })

    it('should clamp roughness', () => {
      const materialLow = $Material.metal([1, 1, 1], -0.5)
      expect(materialLow.roughness).toBe(0)

      const materialHigh = $Material.metal([1, 1, 1], 1.5)
      expect(materialHigh.roughness).toBe(1)
    })

    it('should clamp albedo values', () => {
      const material = $Material.metal([1.5, -0.5, 0.5])

      expect(material.albedo).toEqual([1, 0, 0.5])
    })
  })
})
