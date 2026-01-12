import { describe, it, expect } from 'vitest'
import { getHeroView } from './getHeroView'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import { createDefaultHeroViewConfig } from '../../Domain/HeroViewConfig'

describe('getHeroView', () => {
  it('should return default config when using default repository', () => {
    const config = getHeroView()
    expect(config).toEqual(createDefaultHeroViewConfig())
  })

  it('should return config from provided repository', () => {
    const customConfig = {
      ...createDefaultHeroViewConfig(),
      viewport: { width: 800, height: 600 },
    }
    const repository = createHeroViewInMemoryRepository(customConfig)

    const config = getHeroView(repository)

    expect(config.viewport).toEqual({ width: 800, height: 600 })
  })
})
