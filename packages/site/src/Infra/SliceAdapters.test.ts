import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSiteInMemoryRepository } from './SiteInMemoryRepository'
import { createPaletteSlice } from './PaletteSliceAdapter'
import { createTokenSlice } from './TokenSliceAdapter'
import { createContentsSlice } from './ContentsSliceAdapter'
import { createTimelineSlice } from './TimelineSliceAdapter'
import type { Site, PageUuid } from '../Domain/ValueObject/Site'
import type { Palette } from '@practice/semantic-color-palette/Domain'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import { createDesignTokens } from '@practice/design-tokens/Domain'
import type { Contents } from '@practice/contents'
import type { Timeline } from '@practice/timeline'

const createMockPalette = (): Palette => ({
  seedColors: {
    brand: { l: 0.5, c: 0.1, h: 240 },
    foundation: { l: 0.9, c: 0.01, h: 0 },
    accent: { l: 0.6, c: 0.15, h: 30 },
  },
  semanticPalette: {} as Palette['semanticPalette'],
  primitivePalette: {} as Palette['primitivePalette'],
})

const PAGE_ID = 'page-1' as PageUuid

const createMockSite = (): Site => ({
  meta: { id: 'site-1', name: 'Test Site' },
  pages: {
    [PAGE_ID]: {
      id: PAGE_ID,
      sections: [],
      timeline: { tracks: [], phases: [], loopType: 'none' },
    },
  },
  token: createDesignTokens(),
  palette: createMockPalette(),
  contents: { title: 'Hello' },
  templates: {},
  schemas: {} as Site['schemas'],
})

describe('PaletteSliceAdapter', () => {
  let siteRepo: ReturnType<typeof createSiteInMemoryRepository>
  let paletteSlice: ReturnType<typeof createPaletteSlice>

  beforeEach(() => {
    siteRepo = createSiteInMemoryRepository({ initialSite: createMockSite() })
    paletteSlice = createPaletteSlice(siteRepo)
  })

  it('should get palette from site', () => {
    const palette = paletteSlice.get()
    expect(palette).toBe(siteRepo.get().palette)
  })

  it('should set palette on site', () => {
    const newPalette = { ...createMockPalette(), seedColors: { ...createMockPalette().seedColors, brand: { l: 0.8, c: 0.2, h: 180 } } }
    paletteSlice.set(newPalette)
    expect(siteRepo.get().palette).toBe(newPalette)
  })

  it('should notify subscribers when palette changes', () => {
    const subscriber = vi.fn()
    paletteSlice.subscribe(subscriber)

    const newPalette = { ...createMockPalette() }
    paletteSlice.set(newPalette)

    expect(subscriber).toHaveBeenCalledWith(newPalette)
  })

  it('should not notify subscribers when other site data changes', () => {
    const subscriber = vi.fn()
    paletteSlice.subscribe(subscriber)

    siteRepo.updateContents({ title: 'Changed' })

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('should update seed colors', () => {
    paletteSlice.updateSeedColors({ brand: { l: 0.9, c: 0.3, h: 120 } })
    expect(paletteSlice.get().seedColors.brand).toEqual({ l: 0.9, c: 0.3, h: 120 })
  })
})

describe('TokenSliceAdapter', () => {
  let siteRepo: ReturnType<typeof createSiteInMemoryRepository>
  let tokenSlice: ReturnType<typeof createTokenSlice>

  beforeEach(() => {
    siteRepo = createSiteInMemoryRepository({ initialSite: createMockSite() })
    tokenSlice = createTokenSlice(siteRepo)
  })

  it('should get token from site', () => {
    const token = tokenSlice.get()
    expect(token).toBe(siteRepo.get().token)
  })

  it('should set token on site', () => {
    const newToken = createDesignTokens({ typography: { baseFontSize: 20 } })
    tokenSlice.set(newToken)
    expect(siteRepo.get().token).toBe(newToken)
  })

  it('should notify subscribers when token changes', () => {
    const subscriber = vi.fn()
    tokenSlice.subscribe(subscriber)

    const newToken = createDesignTokens()
    tokenSlice.set(newToken)

    expect(subscriber).toHaveBeenCalledWith(newToken)
  })

  it('should update typography', () => {
    tokenSlice.updateTypography({ baseFontSize: 18 })
    expect(tokenSlice.get().typography.baseFontSize).toBe(18)
  })

  it('should update radius', () => {
    tokenSlice.updateRadius({ sm: '4px' })
    expect(tokenSlice.get().radius.sm).toBe('4px')
  })

  it('should update spacing', () => {
    tokenSlice.updateSpacing({ sm: '8px' })
    expect(tokenSlice.get().spacing.sm).toBe('8px')
  })
})

describe('ContentsSliceAdapter', () => {
  let siteRepo: ReturnType<typeof createSiteInMemoryRepository>
  let contentsSlice: ReturnType<typeof createContentsSlice>

  beforeEach(() => {
    siteRepo = createSiteInMemoryRepository({ initialSite: createMockSite() })
    contentsSlice = createContentsSlice(siteRepo)
  })

  it('should get contents from site', () => {
    const contents = contentsSlice.get()
    expect(contents).toBe(siteRepo.get().contents)
  })

  it('should set contents on site', () => {
    const newContents: Contents = { title: 'New Title' }
    contentsSlice.set(newContents)
    expect(siteRepo.get().contents).toBe(newContents)
  })

  it('should notify subscribers when contents changes', () => {
    const subscriber = vi.fn()
    contentsSlice.subscribe(subscriber)

    const newContents: Contents = { title: 'Changed' }
    contentsSlice.set(newContents)

    expect(subscriber).toHaveBeenCalledWith(newContents)
  })

  it('should get content by path', () => {
    siteRepo.setContentByPath('section.hero.title', 'Welcome')
    expect(contentsSlice.getByPath('section.hero.title')).toBe('Welcome')
  })

  it('should set content by path', () => {
    contentsSlice.setByPath('section.hero.subtitle', 'Hello World')
    expect(siteRepo.getContentByPath('section.hero.subtitle')).toBe('Hello World')
  })
})

describe('TimelineSliceAdapter', () => {
  const pageId = PAGE_ID
  let siteRepo: ReturnType<typeof createSiteInMemoryRepository>
  let timelineSlice: ReturnType<typeof createTimelineSlice>

  beforeEach(() => {
    siteRepo = createSiteInMemoryRepository({ initialSite: createMockSite() })
    timelineSlice = createTimelineSlice(siteRepo, pageId)
  })

  it('should get timeline from page', () => {
    const timeline = timelineSlice.get()
    expect(timeline).toEqual(siteRepo.get().pages[pageId].timeline)
  })

  it('should set timeline on page', () => {
    const newTimeline: Timeline = { tracks: [], phases: [], loopType: 'loop' }
    timelineSlice.set(newTimeline)
    expect(siteRepo.get().pages[pageId].timeline.loopType).toBe('loop')
  })

  it('should notify subscribers when timeline changes', () => {
    const subscriber = vi.fn()
    timelineSlice.subscribe(subscriber)

    timelineSlice.setLoopType('pingpong')

    expect(subscriber).toHaveBeenCalled()
  })

  it('should add track', () => {
    const track = { id: 'track-1', targetPath: 'target.1', envelope: { type: 'hold' as const, value: 0 } }
    timelineSlice.addTrack(track)
    expect(timelineSlice.get().tracks).toHaveLength(1)
  })

  it('should update track', () => {
    const track = { id: 'track-1', targetPath: 'target.1', envelope: { type: 'hold' as const, value: 0 } }
    timelineSlice.addTrack(track)
    timelineSlice.updateTrack('track-1', { targetPath: 'new.target' })
    expect(timelineSlice.get().tracks[0].targetPath).toBe('new.target')
  })

  it('should remove track', () => {
    const track = { id: 'track-1', targetPath: 'target.1', envelope: { type: 'hold' as const, value: 0 } }
    timelineSlice.addTrack(track)
    timelineSlice.removeTrack('track-1')
    expect(timelineSlice.get().tracks).toHaveLength(0)
  })

  it('should add phase', () => {
    const phase = { id: 'phase-1', label: 'Phase 1', duration: 1000 }
    timelineSlice.addPhase(phase)
    expect(timelineSlice.get().phases).toHaveLength(1)
  })

  it('should set loop type', () => {
    timelineSlice.setLoopType('loop')
    expect(timelineSlice.get().loopType).toBe('loop')
  })
})
