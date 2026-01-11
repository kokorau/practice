import { describe, it, expect } from 'vitest'
import { setHeroView } from './setHeroView'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroView/HeroViewInMemoryRepository'
import { createDefaultHeroViewConfig } from '../../Domain/HeroViewConfig'

describe('setHeroView', () => {
  it('should update config in repository', () => {
    const repository = createHeroViewInMemoryRepository()
    const newConfig = {
      ...createDefaultHeroViewConfig(),
      viewport: { width: 1600, height: 900 },
    }

    setHeroView(newConfig, repository)

    expect(repository.get().viewport).toEqual({ width: 1600, height: 900 })
  })
})
