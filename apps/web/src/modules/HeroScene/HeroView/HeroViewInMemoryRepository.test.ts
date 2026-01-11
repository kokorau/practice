import { describe, it, expect, vi } from 'vitest'
import { createHeroViewInMemoryRepository } from './HeroViewInMemoryRepository'
import { createDefaultHeroViewConfig } from '../Domain/HeroViewConfig'

describe('HeroViewInMemoryRepository', () => {
  describe('createHeroViewInMemoryRepository', () => {
    it('should initialize with default config when no initial config provided', () => {
      const repository = createHeroViewInMemoryRepository()
      const config = repository.get()

      expect(config).toEqual(createDefaultHeroViewConfig())
    })

    it('should initialize with provided config', () => {
      const customConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 800, height: 600 },
      }
      const repository = createHeroViewInMemoryRepository(customConfig)
      const config = repository.get()

      expect(config.viewport).toEqual({ width: 800, height: 600 })
    })

    it('should update config via set()', () => {
      const repository = createHeroViewInMemoryRepository()
      const newConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 1600, height: 900 },
      }

      repository.set(newConfig)
      const config = repository.get()

      expect(config.viewport).toEqual({ width: 1600, height: 900 })
    })

    it('should notify subscribers when config changes', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber = vi.fn()

      repository.subscribe(subscriber)

      // Should be called immediately with current value
      expect(subscriber).toHaveBeenCalledTimes(1)
      expect(subscriber).toHaveBeenCalledWith(createDefaultHeroViewConfig())

      // Update config
      const newConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 1600, height: 900 },
      }
      repository.set(newConfig)

      // Should be called again with new value
      expect(subscriber).toHaveBeenCalledTimes(2)
      expect(subscriber).toHaveBeenLastCalledWith(newConfig)
    })

    it('should allow unsubscribing', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber = vi.fn()

      const unsubscribe = repository.subscribe(subscriber)
      expect(subscriber).toHaveBeenCalledTimes(1)

      // Unsubscribe
      unsubscribe()

      // Update config
      const newConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 1600, height: 900 },
      }
      repository.set(newConfig)

      // Should NOT be called again
      expect(subscriber).toHaveBeenCalledTimes(1)
    })

    it('should support multiple subscribers', () => {
      const repository = createHeroViewInMemoryRepository()
      const subscriber1 = vi.fn()
      const subscriber2 = vi.fn()

      repository.subscribe(subscriber1)
      repository.subscribe(subscriber2)

      expect(subscriber1).toHaveBeenCalledTimes(1)
      expect(subscriber2).toHaveBeenCalledTimes(1)

      // Update config
      const newConfig = {
        ...createDefaultHeroViewConfig(),
        viewport: { width: 1600, height: 900 },
      }
      repository.set(newConfig)

      expect(subscriber1).toHaveBeenCalledTimes(2)
      expect(subscriber2).toHaveBeenCalledTimes(2)
    })
  })
})
