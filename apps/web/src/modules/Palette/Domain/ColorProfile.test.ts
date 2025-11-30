import { describe, it, expect } from 'vitest'
import { $ColorProfile, type ColorMetrics } from './ColorProfile'
import type { Srgb } from '../../Color/Domain'

describe('$ColorProfile', () => {
  const testColor: Srgb = { r: 0.5, g: 0.5, b: 0.5 }

  describe('create', () => {
    it('should create color profile with role detection', () => {
      const metrics: ColorMetrics = {
        edgeRatio: 0.2,
        borderRatio: 0.1,
        avgClusterSize: 100,
        clusterCount: 5,
      }

      const profile = $ColorProfile.create({
        color: testColor,
        weight: 0.3,
        metrics,
      })

      expect(profile.color).toBe(testColor)
      expect(profile.weight).toBe(0.3)
      expect(profile.metrics).toBe(metrics)
      expect(profile.role).toBeDefined()
      expect(profile.confidence).toBeGreaterThanOrEqual(0)
    })

    describe('background detection', () => {
      it('should detect background with high border ratio and large clusters', () => {
        const metrics: ColorMetrics = {
          edgeRatio: 0.1,
          borderRatio: 0.5, // high border presence
          avgClusterSize: 2000, // large clusters
          clusterCount: 2,
        }

        const profile = $ColorProfile.create({
          color: testColor,
          weight: 0.4, // high weight
          metrics,
        })

        expect(profile.role).toBe('background')
        expect(profile.confidence).toBeGreaterThan(0.5)
      })

      it('should detect background with only border ratio', () => {
        const metrics: ColorMetrics = {
          edgeRatio: 0.1,
          borderRatio: 0.4, // meets threshold
          avgClusterSize: 500, // below threshold
          clusterCount: 5,
        }

        const profile = $ColorProfile.create({
          color: testColor,
          weight: 0.5, // high weight adds score
          metrics,
        })

        expect(profile.role).toBe('background')
      })
    })

    describe('text detection', () => {
      it('should detect text with high edge ratio and many small clusters', () => {
        const metrics: ColorMetrics = {
          edgeRatio: 0.6, // high edge presence
          borderRatio: 0.1,
          avgClusterSize: 100, // small clusters
          clusterCount: 50, // many clusters
        }

        const profile = $ColorProfile.create({
          color: testColor,
          weight: 0.1,
          metrics,
        })

        expect(profile.role).toBe('text')
        expect(profile.confidence).toBeGreaterThan(0.5)
      })

      it('should detect text with edge ratio and cluster count', () => {
        const metrics: ColorMetrics = {
          edgeRatio: 0.5, // meets threshold
          borderRatio: 0.05,
          avgClusterSize: 300, // meets threshold
          clusterCount: 20, // meets threshold
        }

        const profile = $ColorProfile.create({
          color: testColor,
          weight: 0.15,
          metrics,
        })

        expect(profile.role).toBe('text')
      })
    })

    describe('accent detection', () => {
      it('should detect accent with low weight and few clusters', () => {
        const metrics: ColorMetrics = {
          edgeRatio: 0.2,
          borderRatio: 0.05,
          avgClusterSize: 200,
          clusterCount: 3, // few clusters
        }

        const profile = $ColorProfile.create({
          color: testColor,
          weight: 0.05, // low weight
          metrics,
        })

        expect(profile.role).toBe('accent')
        expect(profile.confidence).toBeGreaterThan(0.5)
      })

      it('should detect accent with just low weight', () => {
        const metrics: ColorMetrics = {
          edgeRatio: 0.2,
          borderRatio: 0.1,
          avgClusterSize: 300,
          clusterCount: 8,
        }

        const profile = $ColorProfile.create({
          color: testColor,
          weight: 0.1, // below 0.15 threshold
          metrics,
        })

        expect(profile.role).toBe('accent')
      })
    })

    describe('unknown detection', () => {
      it('should return unknown when no role scores high enough', () => {
        const metrics: ColorMetrics = {
          edgeRatio: 0.2, // below text threshold
          borderRatio: 0.2, // below background threshold
          avgClusterSize: 600, // above text threshold, below background
          clusterCount: 8, // above accent threshold
        }

        const profile = $ColorProfile.create({
          color: testColor,
          weight: 0.2, // above accent threshold, below background boost
          metrics,
        })

        expect(profile.role).toBe('unknown')
        expect(profile.confidence).toBe(0)
      })
    })
  })
})
