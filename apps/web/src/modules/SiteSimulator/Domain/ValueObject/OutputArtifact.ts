import type { LayoutCssSpec } from './LayoutCssSpec'
import type { RenderedPalette } from './RenderedColor'

/**
 * BoxShadowOutput represents computed box-shadow CSS for an element.
 */
export type BoxShadowOutput = {
  /** Element selector or ID */
  readonly selector: string
  /** Computed box-shadow CSS value */
  readonly boxShadow: string
}

/**
 * CssOutput is the complete CSS artifact.
 */
export type CssOutput = {
  /** CSS specification (variables + rules) */
  readonly spec: LayoutCssSpec
  /** Computed box-shadows for elevated elements */
  readonly boxShadows: ReadonlyArray<BoxShadowOutput>
  /** Raw CSS string ready to embed */
  readonly raw: string
}

/**
 * HtmlOutput is the rendered HTML artifact.
 */
export type HtmlOutput = {
  /** Original template ID */
  readonly templateId: string
  /** Rendered HTML with colors applied */
  readonly html: string
  /** Inline styles extracted (if any) */
  readonly inlineStyles?: string
}

/**
 * ImageAsset represents a single processed image.
 */
export type ImageAsset = {
  /** Original image path/URL */
  readonly src: string
  /** Processed image as data URL or blob URL */
  readonly processed: string
  /** Image dimensions */
  readonly width: number
  readonly height: number
  /** Filter applied */
  readonly filterId?: string
}

/**
 * AssetOutput contains all processed assets.
 */
export type AssetOutput = {
  /** LUT-applied images */
  readonly images: ReadonlyArray<ImageAsset>
}

/**
 * SiteArtifact is the complete output bundle.
 */
export type SiteArtifact = {
  /** Rendered semantic palette (Display-P3 colors) */
  readonly palette: RenderedPalette
  /** CSS output */
  readonly css: CssOutput
  /** HTML output */
  readonly html: HtmlOutput
  /** Asset output */
  readonly assets: AssetOutput
  /** Generation metadata */
  readonly metadata: {
    readonly generatedAt: string
    readonly brandColor: string
    readonly accentColor: string
    readonly lightSourceId: string
    readonly filterId?: string
  }
}

export const $CssOutput = {
  create: undefined as unknown as (
    spec: LayoutCssSpec,
    boxShadows: BoxShadowOutput[]
  ) => CssOutput,
}

export const $HtmlOutput = {
  create: undefined as unknown as (
    templateId: string,
    html: string,
    inlineStyles?: string
  ) => HtmlOutput,
}

export const $AssetOutput = {
  create: undefined as unknown as (images: ImageAsset[]) => AssetOutput,
  empty: undefined as unknown as () => AssetOutput,
}

export const $SiteArtifact = {
  create: undefined as unknown as (
    palette: RenderedPalette,
    css: CssOutput,
    html: HtmlOutput,
    assets: AssetOutput,
    metadata: SiteArtifact['metadata']
  ) => SiteArtifact,

  /** Export as downloadable zip structure */
  toZipStructure: undefined as unknown as (artifact: SiteArtifact) => {
    'styles.css': string
    'index.html': string
    'assets/': Record<string, string>
  },
}
