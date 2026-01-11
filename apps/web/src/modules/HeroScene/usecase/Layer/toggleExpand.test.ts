import { describe, it, expect } from 'vitest'
import { toggleExpand } from './toggleExpand'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroView/HeroViewInMemoryRepository'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'

describe('toggleExpand', () => {
  const createTestConfig = (): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      background: { primary: 'B', secondary: 'auto' },
      mask: { primary: 'auto', secondary: 'auto' },
      semanticContext: 'canvas',
      brand: { hue: 198, saturation: 70, value: 65 },
      accent: { hue: 30, saturation: 80, value: 60 },
      foundation: { hue: 0, saturation: 0, value: 97 },
    },
    layers: [
      {
        type: 'group',
        id: 'group-1',
        name: 'Group 1',
        visible: true,
        children: [],
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  it('should return null (not implemented - expanded not in LayerNodeConfig)', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = toggleExpand('group-1', repository)

    // Currently returns null as expanded is not in LayerNodeConfig
    expect(result).toBeNull()
  })

  it('should return null for non-existent layer', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const result = toggleExpand('non-existent', repository)

    expect(result).toBeNull()
  })
})
