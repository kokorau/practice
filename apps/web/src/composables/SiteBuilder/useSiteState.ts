/**
 * useSiteState - @practice/site Repository をVueのリアクティブシステムに統合
 *
 * SiteRepository経由でSite全体の状態を管理し、
 * 変更を自動的にVueのリアクティブシステムに反映する。
 */

import { computed, onUnmounted, type Ref, type ComputedRef, shallowRef } from 'vue'
import type { Site, Page, PageUuid, Section, Contents, ContentValue, TemplateRegistry, SectionSchemas } from '@practice/site/Domain'
import type { SiteRepository } from '@practice/site/Application'
import { createSiteInMemoryRepository } from '@practice/site/Infra'
import type { Palette, SeedColors, SemanticColorPalette, PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { createPrimitivePalette, createSemanticFromPrimitive } from '@practice/semantic-color-palette/Infra'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import { getTokenPresetEntries } from '@practice/design-tokens/Infra'
import type { Oklch } from '@practice/color'
import type { SectionContent } from '@practice/section-semantic'
import type { Timeline } from '@practice/timeline'

// ============================================================================
// Types
// ============================================================================

export interface UseSiteStateOptions {
  /** 初期Site（省略時はデフォルト値で作成） */
  initialSite?: Site
  /** 既存のSiteRepositoryを使用（DIテスト用） */
  repository?: SiteRepository
}

export interface UseSiteStateReturn {
  // Site State (shallow reactive)
  site: Ref<Site>

  // Palette
  seedColors: ComputedRef<SeedColors>
  palette: ComputedRef<Palette>
  primitivePalette: ComputedRef<PrimitivePalette>
  semanticPalette: ComputedRef<SemanticColorPalette>

  // Tokens
  tokens: ComputedRef<DesignTokens>

  // Contents
  contents: ComputedRef<Contents>

  // Pages
  pages: ComputedRef<Record<PageUuid, Page>>
  currentPage: ComputedRef<Page | undefined>

  // Derived
  isDark: ComputedRef<boolean>

  // Actions - SeedColors
  updateBrandColor: (oklch: Oklch) => void
  updateFoundationColor: (oklch: Oklch) => void
  updateAccentColor: (oklch: Oklch) => void
  updateSeedColors: (colors: Partial<SeedColors>) => void

  // Actions - Tokens
  updateTokens: (tokens: DesignTokens) => void
  setTokensById: (presetId: string) => void

  // Actions - Contents
  updateContents: (updates: Partial<Contents>) => void
  setContentByPath: (path: string, value: ContentValue) => void
  updateSectionContent: (sectionId: string, content: SectionContent) => void

  // Actions - Page/Section
  updateSection: (pageId: PageUuid, sectionId: string, updates: Partial<Section>) => void

  // Repository access (for advanced use cases)
  repository: SiteRepository
}

// ============================================================================
// Default Site Creation
// ============================================================================

const createDefaultSeedColors = (): SeedColors => ({
  brand: { L: 0.55, C: 0.15, H: 198 },
  foundation: { L: 0.955, C: 0, H: 0 },
  accent: { L: 0.6, C: 0.2, H: 30 },
})

const createEmptyTimeline = (): Timeline => ({
  tracks: [],
  phases: [],
  loopType: 'once',
})

const createEmptyTemplateRegistry = (): TemplateRegistry => {
  // Empty registry - templates are loaded from DB or Infra layer
  return {} as TemplateRegistry
}

const createEmptySectionSchemas = (): SectionSchemas => {
  // Empty schemas - schemas are loaded from DB or Infra layer
  return {} as SectionSchemas
}

const createPaletteFromSeedColors = (seedColors: SeedColors): Palette => {
  const primitivePalette = createPrimitivePalette(seedColors)
  const semanticPalette = createSemanticFromPrimitive(primitivePalette)
  return {
    seedColors,
    primitivePalette,
    semanticPalette,
  }
}

const createDefaultSite = (): Site => {
  const seedColors = createDefaultSeedColors()
  const tokenPresets = getTokenPresetEntries()
  const defaultTokens = tokenPresets[0]?.tokens ?? tokenPresets[0]!.tokens

  // Create full palette from seed colors
  const palette = createPaletteFromSeedColors(seedColors)

  // Create default page with empty timeline
  const defaultPageId = 'page-1' as PageUuid
  const defaultPage: Page = {
    id: defaultPageId,
    sections: [],
    timeline: createEmptyTimeline(),
  }

  return {
    meta: {
      id: crypto.randomUUID(),
      name: 'Untitled Site',
      description: '',
    },
    pages: {
      [defaultPageId]: defaultPage,
    },
    token: defaultTokens,
    palette,
    contents: {},
    templates: createEmptyTemplateRegistry(),
    schemas: createEmptySectionSchemas(),
  }
}

// ============================================================================
// Composable
// ============================================================================

export const useSiteState = (options: UseSiteStateOptions = {}): UseSiteStateReturn => {
  // Initialize repository
  const repository = options.repository ?? createSiteInMemoryRepository({
    initialSite: options.initialSite ?? createDefaultSite(),
  })

  // Reactive site state (shallow to avoid deep reactivity on complex objects)
  const site = shallowRef<Site>(repository.get())

  // Subscribe to repository changes
  const unsubscribe = repository.subscribe((newSite) => {
    site.value = newSite
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  // ========================================================================
  // Computed Properties
  // ========================================================================

  const seedColors = computed(() => site.value.palette.seedColors)
  const palette = computed(() => site.value.palette)
  const primitivePalette = computed(() => site.value.palette.primitivePalette)
  const tokens = computed(() => site.value.token)
  const contents = computed(() => site.value.contents)
  const pages = computed(() => site.value.pages)

  // First page as current (for now)
  const currentPage = computed(() => {
    const pageIds = Object.keys(site.value.pages) as PageUuid[]
    const firstId = pageIds[0]
    return firstId !== undefined ? site.value.pages[firstId] : undefined
  })

  // Semantic palette derived from primitive palette
  const semanticPalette = computed(() => {
    return site.value.palette.semanticPalette
  })

  // Dark mode based on foundation lightness
  const isDark = computed(() => {
    return site.value.palette.seedColors.foundation.L <= 0.5
  })

  // ========================================================================
  // Actions - SeedColors (regenerates full palette)
  // ========================================================================

  const regenerateAndUpdatePalette = (newSeedColors: SeedColors) => {
    // Regenerate full palette from new seed colors
    const newPalette = createPaletteFromSeedColors(newSeedColors)
    repository.updatePalette(newPalette)
  }

  const updateBrandColor = (oklch: Oklch) => {
    const currentSeedColors = repository.get().palette.seedColors
    regenerateAndUpdatePalette({ ...currentSeedColors, brand: oklch })
  }

  const updateFoundationColor = (oklch: Oklch) => {
    const currentSeedColors = repository.get().palette.seedColors
    regenerateAndUpdatePalette({ ...currentSeedColors, foundation: oklch })
  }

  const updateAccentColor = (oklch: Oklch) => {
    const currentSeedColors = repository.get().palette.seedColors
    regenerateAndUpdatePalette({ ...currentSeedColors, accent: oklch })
  }

  const updateSeedColors = (colors: Partial<SeedColors>) => {
    const currentSeedColors = repository.get().palette.seedColors
    regenerateAndUpdatePalette({ ...currentSeedColors, ...colors })
  }

  // ========================================================================
  // Actions - Tokens
  // ========================================================================

  const updateTokens = (newTokens: DesignTokens) => {
    repository.updateTokens(newTokens)
  }

  const setTokensById = (presetId: string) => {
    const presets = getTokenPresetEntries()
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      repository.updateTokens(preset.tokens)
    }
  }

  // ========================================================================
  // Actions - Contents
  // ========================================================================

  const updateContents = (updates: Partial<Contents>) => {
    repository.updateContents(updates)
  }

  const setContentByPath = (path: string, value: ContentValue) => {
    repository.setContentByPath(path, value)
  }

  const updateSectionContent = (sectionId: string, content: SectionContent) => {
    // Store section content under the section ID path
    repository.setContentByPath(sectionId, content as unknown as ContentValue)
  }

  // ========================================================================
  // Actions - Page/Section
  // ========================================================================

  const updateSection = (pageId: PageUuid, sectionId: string, updates: Partial<Section>) => {
    repository.updateSection(pageId, sectionId, updates)
  }

  // ========================================================================
  // Return
  // ========================================================================

  return {
    // State
    site,

    // Computed
    seedColors,
    palette,
    primitivePalette,
    semanticPalette,
    tokens,
    contents,
    pages,
    currentPage,
    isDark,

    // Actions - SeedColors
    updateBrandColor,
    updateFoundationColor,
    updateAccentColor,
    updateSeedColors,

    // Actions - Tokens
    updateTokens,
    setTokensById,

    // Actions - Contents
    updateContents,
    setContentByPath,
    updateSectionContent,

    // Actions - Section
    updateSection,

    // Repository access
    repository,
  }
}
