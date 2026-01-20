import { describe, it, expect, vi } from 'vitest'
import { createContentsInMemoryRepository } from './ContentsInMemoryRepository'
import type { Contents } from '../Domain/ValueObject/Contents'

describe('ContentsInMemoryRepository', () => {
  it('should return empty contents by default', () => {
    const repo = createContentsInMemoryRepository()

    expect(repo.get()).toEqual({})
  })

  it('should return initial contents via get()', () => {
    const initialContents: Contents = { title: 'Hello' }
    const repo = createContentsInMemoryRepository({ initialContents })

    expect(repo.get()).toBe(initialContents)
  })

  it('should update contents via set()', () => {
    const repo = createContentsInMemoryRepository()

    const newContents: Contents = { title: 'World' }
    repo.set(newContents)

    expect(repo.get()).toBe(newContents)
  })

  it('should notify subscribers on set()', () => {
    const repo = createContentsInMemoryRepository()

    const subscriber = vi.fn()
    repo.subscribe(subscriber)

    const newContents: Contents = { title: 'Hello' }
    repo.set(newContents)

    expect(subscriber).toHaveBeenCalledWith(newContents)
  })

  it('should allow unsubscribing', () => {
    const repo = createContentsInMemoryRepository()

    const subscriber = vi.fn()
    const unsubscribe = repo.subscribe(subscriber)

    unsubscribe()
    repo.set({ title: 'Hello' })

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('should get content by path', () => {
    const initialContents: Contents = {
      section: {
        about: {
          title: 'About Us',
        },
      },
    }
    const repo = createContentsInMemoryRepository({ initialContents })

    expect(repo.getByPath('section.about.title')).toBe('About Us')
  })

  it('should return undefined for non-existent path', () => {
    const repo = createContentsInMemoryRepository()

    expect(repo.getByPath('non.existent.path')).toBeUndefined()
  })

  it('should set content by path', () => {
    const repo = createContentsInMemoryRepository()

    repo.setByPath('section.hero.title', 'Welcome')

    expect(repo.getByPath('section.hero.title')).toBe('Welcome')
  })

  it('should notify subscribers on setByPath()', () => {
    const repo = createContentsInMemoryRepository()

    const subscriber = vi.fn()
    repo.subscribe(subscriber)

    repo.setByPath('title', 'Hello')

    expect(subscriber).toHaveBeenCalled()
  })
})
