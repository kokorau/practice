/**
 * FontLoaderService
 *
 * Manages dynamic font loading with proper lifecycle management.
 * Extracts FontFace API operations from UI components for better testability.
 */

/**
 * Interface for FontFaceSet operations needed by this service.
 * TypeScript's built-in FontFaceSet type may not include add/delete methods
 * depending on the target/lib configuration.
 */
export interface FontFaceSetLike {
  add(font: FontFace): void
  delete(font: FontFace): boolean
}

export interface FontLoaderServiceOptions {
  /** Custom FontFaceSet for testing (defaults to document.fonts) */
  fontSet?: FontFaceSetLike
}

export interface LoadedFont {
  familyName: string
  fontFace: FontFace
  url: string
}

export class FontLoaderService {
  private fontCounter = 0
  private loadedFonts = new Map<string, LoadedFont>()
  private urlToFamilyName = new Map<string, string>()
  private readonly fontSet: FontFaceSetLike

  constructor(options: FontLoaderServiceOptions = {}) {
    this.fontSet = options.fontSet ?? (document.fonts as FontFaceSetLike)
  }

  /**
   * Load a font from URL and register it.
   * Returns the font family name to use in CSS.
   * If the same URL is already loaded, returns the cached family name.
   */
  async loadFont(url: string, name: string): Promise<string> {
    // Check for duplicate URL
    const existingFamilyName = this.urlToFamilyName.get(url)
    if (existingFamilyName && this.loadedFonts.has(existingFamilyName)) {
      return existingFamilyName
    }

    const familyName = this.generateFamilyName(name)
    const fontFace = new FontFace(familyName, `url(${url})`)

    await fontFace.load()
    this.fontSet.add(fontFace)

    this.loadedFonts.set(familyName, { familyName, fontFace, url })
    this.urlToFamilyName.set(url, familyName)

    return familyName
  }

  /**
   * Unload a specific font by family name.
   */
  unloadFont(familyName: string): boolean {
    const loaded = this.loadedFonts.get(familyName)
    if (!loaded) {
      return false
    }

    this.fontSet.delete(loaded.fontFace)
    this.urlToFamilyName.delete(loaded.url)
    this.loadedFonts.delete(familyName)

    return true
  }

  /**
   * Unload all fonts managed by this service.
   */
  unloadAll(): void {
    for (const loaded of this.loadedFonts.values()) {
      this.fontSet.delete(loaded.fontFace)
    }
    this.loadedFonts.clear()
    this.urlToFamilyName.clear()
  }

  /**
   * Check if a font is loaded by family name.
   */
  isLoaded(familyName: string): boolean {
    return this.loadedFonts.has(familyName)
  }

  /**
   * Get all loaded font family names.
   */
  getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts.keys())
  }

  private generateFamilyName(name: string): string {
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '-')
    return `preview-font-${++this.fontCounter}-${sanitizedName}`
  }
}

/** Singleton instance for application-wide font loading (lazy initialized) */
let _fontLoaderService: FontLoaderService | null = null

export function getFontLoaderService(): FontLoaderService {
  if (!_fontLoaderService) {
    _fontLoaderService = new FontLoaderService()
  }
  return _fontLoaderService
}
