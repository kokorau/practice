import { describe, it, expect, vi } from 'vitest'
import { subscribeHeroView } from './subscribeHeroView'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import { createDefaultHeroViewConfig } from '../../Domain/HeroViewConfig'

describe('subscribeHeroView', () => {
  it('should not call subscriber immediately (lazy subscription)', () => {
    const repository = createHeroViewInMemoryRepository()
    const subscriber = vi.fn()

    subscribeHeroView(subscriber, repository)

    expect(subscriber).toHaveBeenCalledTimes(0)
  })

  it('should call subscriber when config changes', () => {
    const repository = createHeroViewInMemoryRepository()
    const subscriber = vi.fn()

    subscribeHeroView(subscriber, repository)

    const newConfig = {
      ...createDefaultHeroViewConfig(),
      viewport: { width: 1600, height: 900 },
    }
    repository.set(newConfig)

    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(subscriber).toHaveBeenLastCalledWith(newConfig)
  })

  it('should return unsubscribe function', () => {
    const repository = createHeroViewInMemoryRepository()
    const subscriber = vi.fn()

    const unsubscribe = subscribeHeroView(subscriber, repository)
    expect(subscriber).toHaveBeenCalledTimes(0)

    unsubscribe()

    repository.set({
      ...createDefaultHeroViewConfig(),
      viewport: { width: 1600, height: 900 },
    })

    // Should not be called at all after unsubscribe
    expect(subscriber).toHaveBeenCalledTimes(0)
  })
})
