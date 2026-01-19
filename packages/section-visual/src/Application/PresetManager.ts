/**
 * PresetManager
 *
 * Centralized preset management with caching and merge mode support.
 *
 * Features:
 * - Caches preset loading for improved performance
 * - Supports merge mode to preserve custom layers when applying presets
 * - Uses DI pattern for testability
 */

import type { HeroViewPresetRepository } from './ports/HeroViewPresetRepository'
import type { HeroViewRepository } from '../Domain/repository/HeroViewRepository'
import type { HeroViewPreset } from '../Domain/HeroViewPreset'
import type { LayerNodeConfig } from '../Domain/HeroViewConfig'
import type { PresetExportPort } from '../usecase/Preset/PresetExportPort'
import type { ExportPresetOptions } from '../usecase/Preset/exportPreset'
import { createPreset } from '../usecase/Preset/exportPreset'

// ============================================================
// Types
// ============================================================

/**
 * Merge mode for applying presets
 *
 * - replace: Complete config replacement (current behavior)
 * - merge: Preserve custom layers (non-template layers)
 */
export type MergeMode = 'replace' | 'merge'

/**
 * Options for PresetManager factory
 */
export interface PresetManagerOptions {
  presetRepository: HeroViewPresetRepository
  heroViewRepository: HeroViewRepository
  presetExportPort?: PresetExportPort
}

// ============================================================
// Template Layer Identification
// ============================================================

/**
 * Template layer IDs that are part of the original preset
 * Custom layers are those NOT in this list
 */
const TEMPLATE_LAYER_IDS: Set<string> = new Set([
  'base-layer',
  'mask-layer',
])

/**
 * Check if a layer is a template layer (part of the preset)
 */
const isTemplateLayer = (layer: LayerNodeConfig): boolean => {
  return TEMPLATE_LAYER_IDS.has(layer.id)
}

/**
 * Check if a layer is a custom layer (added by user)
 */
const isCustomLayer = (layer: LayerNodeConfig): boolean => {
  return !isTemplateLayer(layer)
}

// ============================================================
// PresetManager Class
// ============================================================

/**
 * PresetManager
 *
 * Centralizes preset operations with caching and merge mode support.
 */
export class PresetManager {
  private cache: HeroViewPreset[] | null = null
  private presetRepository: HeroViewPresetRepository
  private heroViewRepository: HeroViewRepository
  private presetExportPort?: PresetExportPort

  constructor(
    presetRepository: HeroViewPresetRepository,
    heroViewRepository: HeroViewRepository,
    presetExportPort?: PresetExportPort
  ) {
    this.presetRepository = presetRepository
    this.heroViewRepository = heroViewRepository
    this.presetExportPort = presetExportPort
  }

  // ============================================================
  // Preset Loading
  // ============================================================

  /**
   * Get all available presets
   *
   * @param useCache - Whether to use cached presets (default: true)
   * @returns Promise resolving to array of presets
   */
  async getPresets(useCache = true): Promise<HeroViewPreset[]> {
    if (useCache && this.cache) {
      return this.cache
    }

    const presets = await this.presetRepository.findAll()
    this.cache = presets
    return presets
  }

  /**
   * Find a preset by ID
   *
   * @param presetId - The preset ID to find
   * @returns Promise resolving to the preset or null if not found
   */
  async findById(presetId: string): Promise<HeroViewPreset | null> {
    // Try cache first
    if (this.cache) {
      const cached = this.cache.find(p => p.id === presetId)
      if (cached) return cached
    }

    return this.presetRepository.findById(presetId)
  }

  // ============================================================
  // Preset Application
  // ============================================================

  /**
   * Apply a preset to the current HeroView
   *
   * @param presetId - The preset ID to apply
   * @param mergeMode - How to apply the preset (default: 'replace')
   * @returns The applied preset or null if not found
   */
  async applyPreset(
    presetId: string,
    mergeMode: MergeMode = 'replace'
  ): Promise<HeroViewPreset | null> {
    const preset = await this.findById(presetId)
    if (!preset) return null

    if (mergeMode === 'replace') {
      this.applyPresetReplace(preset)
    } else {
      this.applyPresetMerge(preset)
    }

    return preset
  }

  /**
   * Apply preset with complete replacement (current behavior)
   *
   * Note: colorPreset is returned to the caller for UI state updates.
   * Brand/accent/foundation are no longer stored in config.colors.
   */
  private applyPresetReplace(preset: HeroViewPreset): void {
    // Set the complete config
    this.heroViewRepository.set(preset.config)
  }

  /**
   * Apply preset with merge mode (preserve custom layers)
   *
   * Note: colorPreset is returned to the caller for UI state updates.
   * Brand/accent/foundation are no longer stored in config.colors.
   */
  private applyPresetMerge(preset: HeroViewPreset): void {
    const currentConfig = this.heroViewRepository.get()

    // Extract custom layers from current config
    const customLayers = currentConfig.layers.filter(isCustomLayer)

    // Get template layers from preset
    const presetTemplateLayers = preset.config.layers.filter(isTemplateLayer)

    // Merge: preset template layers + current custom layers
    const mergedLayers: LayerNodeConfig[] = [
      ...presetTemplateLayers,
      ...customLayers,
    ]

    // Apply merged config
    this.heroViewRepository.set({
      ...preset.config,
      layers: mergedLayers,
    })
  }

  // ============================================================
  // Preset Export
  // ============================================================

  /**
   * Export current HeroView as a preset
   *
   * @param options - Export options (id, name)
   * @returns The created preset
   */
  exportAsPreset(options: ExportPresetOptions = {}): HeroViewPreset {
    const preset = createPreset(this.heroViewRepository, options)

    // Download if export port is available
    if (this.presetExportPort) {
      this.presetExportPort.downloadAsJson(preset)
    }

    return preset
  }

  /**
   * Create a preset without downloading
   *
   * @param options - Export options (id, name)
   * @returns The created preset
   */
  createPreset(options: ExportPresetOptions = {}): HeroViewPreset {
    return createPreset(this.heroViewRepository, options)
  }

  // ============================================================
  // Cache Management
  // ============================================================

  /**
   * Clear the preset cache
   *
   * Call this when presets might have changed externally
   */
  clearCache(): void {
    this.cache = null
  }

  /**
   * Check if presets are cached
   */
  isCached(): boolean {
    return this.cache !== null
  }
}

// ============================================================
// Factory Function
// ============================================================

/**
 * Create a new PresetManager instance
 *
 * @param options - Configuration options
 * @returns A new PresetManager instance
 *
 * @example
 * ```typescript
 * const presetManager = createPresetManager({
 *   presetRepository: createInMemoryHeroViewPresetRepository(),
 *   heroViewRepository: createHeroViewInMemoryRepository(config),
 *   presetExportPort: createBrowserPresetExporter(),
 * })
 *
 * // Load presets with caching
 * const presets = await presetManager.getPresets()
 *
 * // Apply preset with merge mode
 * await presetManager.applyPreset('preset-1', 'merge')
 *
 * // Export current config as preset
 * presetManager.exportAsPreset({ name: 'My Custom Preset' })
 * ```
 */
export function createPresetManager(
  options: PresetManagerOptions
): PresetManager {
  return new PresetManager(
    options.presetRepository,
    options.heroViewRepository,
    options.presetExportPort
  )
}
