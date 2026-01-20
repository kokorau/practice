/**
 * SiteInMemoryRepository - サイトのインメモリ実装
 */

import type {
  SiteRepository,
  SiteSubscriber,
  SiteUnsubscribe,
} from '../Application/ports/SiteRepository'
import type { Site, Page, PageUuid, Section } from '../Domain/ValueObject/Site'
import type { Palette, SeedColors } from '@practice/semantic-color-palette/Domain'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import type { Contents, ContentValue } from '@practice/contents'
import { $Contents } from '@practice/contents'
import type { Timeline } from '@practice/timeline'
import type { FilterConfig, AdjustmentConfig, CurveConfig } from '../Domain/ValueObject/FilterConfig'

export interface CreateSiteInMemoryRepositoryOptions {
  initialSite: Site
}

export const createSiteInMemoryRepository = (
  options: CreateSiteInMemoryRepositoryOptions
): SiteRepository => {
  let site = options.initialSite
  const subscribers = new Set<SiteSubscriber>()

  const notifySubscribers = () => {
    for (const callback of subscribers) {
      callback(site)
    }
  }

  return {
    get: () => site,

    set: (newSite: Site) => {
      site = newSite
      notifySubscribers()
    },

    subscribe: (subscriber: SiteSubscriber): SiteUnsubscribe => {
      subscribers.add(subscriber)
      return () => {
        subscribers.delete(subscriber)
      }
    },

    // ========================================================================
    // Page Operations
    // ========================================================================

    getPage: (pageId: PageUuid): Page | undefined => {
      return site.pages[pageId]
    },

    updatePage: (pageId: PageUuid, updates: Partial<Page>) => {
      const page = site.pages[pageId]
      if (!page) return

      site = {
        ...site,
        pages: {
          ...site.pages,
          [pageId]: { ...page, ...updates },
        },
      }
      notifySubscribers()
    },

    addPage: (page: Page) => {
      site = {
        ...site,
        pages: {
          ...site.pages,
          [page.id]: page,
        },
      }
      notifySubscribers()
    },

    removePage: (pageId: PageUuid) => {
      const { [pageId]: _, ...remainingPages } = site.pages
      site = {
        ...site,
        pages: remainingPages,
      }
      notifySubscribers()
    },

    // ========================================================================
    // Section Operations
    // ========================================================================

    getSection: (pageId: PageUuid, sectionId: string): Section | undefined => {
      const page = site.pages[pageId]
      if (!page) return undefined
      return page.sections.find((s) => s.id === sectionId)
    },

    updateSection: (pageId: PageUuid, sectionId: string, updates: Partial<Section>) => {
      const page = site.pages[pageId]
      if (!page) return

      site = {
        ...site,
        pages: {
          ...site.pages,
          [pageId]: {
            ...page,
            sections: page.sections.map((s) =>
              s.id === sectionId ? { ...s, ...updates } : s
            ),
          },
        },
      }
      notifySubscribers()
    },

    addSection: (pageId: PageUuid, section: Section) => {
      const page = site.pages[pageId]
      if (!page) return

      site = {
        ...site,
        pages: {
          ...site.pages,
          [pageId]: {
            ...page,
            sections: [...page.sections, section],
          },
        },
      }
      notifySubscribers()
    },

    removeSection: (pageId: PageUuid, sectionId: string) => {
      const page = site.pages[pageId]
      if (!page) return

      site = {
        ...site,
        pages: {
          ...site.pages,
          [pageId]: {
            ...page,
            sections: page.sections.filter((s) => s.id !== sectionId),
          },
        },
      }
      notifySubscribers()
    },

    // ========================================================================
    // Style Operations
    // ========================================================================

    updatePalette: (paletteUpdates: Partial<Palette>) => {
      site = {
        ...site,
        palette: {
          ...site.palette,
          ...paletteUpdates,
        },
      }
      notifySubscribers()
    },

    updateSeedColors: (colors: Partial<SeedColors>) => {
      site = {
        ...site,
        palette: {
          ...site.palette,
          seedColors: {
            ...site.palette.seedColors,
            ...colors,
          },
        },
      }
      notifySubscribers()
    },

    updateTokens: (tokens: Partial<DesignTokens>) => {
      site = {
        ...site,
        token: {
          ...site.token,
          ...tokens,
        },
      }
      notifySubscribers()
    },

    // ========================================================================
    // Contents Operations
    // ========================================================================

    updateContents: (contentsUpdates: Partial<Contents>) => {
      // Filter out undefined values and merge
      const filteredUpdates: Contents = Object.fromEntries(
        Object.entries(contentsUpdates).filter(([_, v]) => v !== undefined)
      ) as Contents
      site = {
        ...site,
        contents: {
          ...site.contents,
          ...filteredUpdates,
        },
      }
      notifySubscribers()
    },

    getContentByPath: (path: string): ContentValue | undefined => {
      return $Contents.get(site.contents, path)
    },

    setContentByPath: (path: string, value: ContentValue) => {
      site = {
        ...site,
        contents: $Contents.set(site.contents, path, value),
      }
      notifySubscribers()
    },

    // ========================================================================
    // Timeline Operations
    // ========================================================================

    getTimeline: (pageId: PageUuid): Timeline | undefined => {
      return site.pages[pageId]?.timeline
    },

    updateTimeline: (pageId: PageUuid, timelineUpdates: Partial<Timeline>) => {
      const page = site.pages[pageId]
      if (!page) return

      site = {
        ...site,
        pages: {
          ...site.pages,
          [pageId]: {
            ...page,
            timeline: {
              ...page.timeline,
              ...timelineUpdates,
            },
          },
        },
      }
      notifySubscribers()
    },

    // ========================================================================
    // Filter Operations
    // ========================================================================

    getFilter: (): FilterConfig => site.filter,

    updateFilter: (filterUpdates: Partial<FilterConfig>) => {
      site = {
        ...site,
        filter: {
          ...site.filter,
          ...filterUpdates,
        },
      }
      notifySubscribers()
    },

    updateAdjustment: (adjustmentUpdates: Partial<AdjustmentConfig>) => {
      site = {
        ...site,
        filter: {
          ...site.filter,
          adjustment: {
            ...site.filter.adjustment,
            ...adjustmentUpdates,
          },
        },
      }
      notifySubscribers()
    },

    updateMasterCurve: (curve: CurveConfig) => {
      site = {
        ...site,
        filter: {
          ...site.filter,
          master: curve,
        },
      }
      notifySubscribers()
    },

    updateChannelCurve: (channel: 'r' | 'g' | 'b', curve: CurveConfig | null) => {
      site = {
        ...site,
        filter: {
          ...site.filter,
          [channel]: curve,
        },
      }
      notifySubscribers()
    },
  }
}
