import { describe, it, expect, vi } from 'vitest'
import { createTokenInMemoryRepository } from './TokenInMemoryRepository'
import { createDesignTokens } from '../Domain/ValueObject/DesignTokens'

describe('TokenInMemoryRepository', () => {
  it('should return initial tokens via get()', () => {
    const initialTokens = createDesignTokens()
    const repo = createTokenInMemoryRepository({ initialTokens })

    expect(repo.get()).toBe(initialTokens)
  })

  it('should update tokens via set()', () => {
    const initialTokens = createDesignTokens()
    const repo = createTokenInMemoryRepository({ initialTokens })

    const newTokens = createDesignTokens({ typography: { baseFontSize: 18 } })
    repo.set(newTokens)

    expect(repo.get()).toBe(newTokens)
  })

  it('should notify subscribers on set()', () => {
    const initialTokens = createDesignTokens()
    const repo = createTokenInMemoryRepository({ initialTokens })

    const subscriber = vi.fn()
    repo.subscribe(subscriber)

    const newTokens = createDesignTokens()
    repo.set(newTokens)

    expect(subscriber).toHaveBeenCalledWith(newTokens)
  })

  it('should allow unsubscribing', () => {
    const initialTokens = createDesignTokens()
    const repo = createTokenInMemoryRepository({ initialTokens })

    const subscriber = vi.fn()
    const unsubscribe = repo.subscribe(subscriber)

    unsubscribe()
    repo.set(createDesignTokens())

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('should update typography partially', () => {
    const initialTokens = createDesignTokens()
    const repo = createTokenInMemoryRepository({ initialTokens })

    repo.updateTypography({ baseFontSize: 20 })

    expect(repo.get().typography.baseFontSize).toBe(20)
  })

  it('should update radius partially', () => {
    const initialTokens = createDesignTokens()
    const repo = createTokenInMemoryRepository({ initialTokens })

    repo.updateRadius({ sm: '4px' })

    expect(repo.get().radius.sm).toBe('4px')
  })

  it('should update spacing partially', () => {
    const initialTokens = createDesignTokens()
    const repo = createTokenInMemoryRepository({ initialTokens })

    repo.updateSpacing({ sm: '8px' })

    expect(repo.get().spacing.sm).toBe('8px')
  })

  it('should notify subscribers on partial updates', () => {
    const initialTokens = createDesignTokens()
    const repo = createTokenInMemoryRepository({ initialTokens })

    const subscriber = vi.fn()
    repo.subscribe(subscriber)

    repo.updateTypography({ baseFontSize: 20 })
    repo.updateRadius({ sm: '4px' })
    repo.updateSpacing({ sm: '8px' })

    expect(subscriber).toHaveBeenCalledTimes(3)
  })
})
