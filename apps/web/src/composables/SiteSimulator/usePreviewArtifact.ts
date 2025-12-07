import { ref, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type {
  SiteBlueprint,
  RenderedPalette,
  FontConfig,
  SectionContent,
  PreviewArtifact,
  ArtifactChangeType,
} from '../../modules/SiteSimulator/Domain'
import { $RenderedPalette, $PreviewArtifact } from '../../modules/SiteSimulator/Domain'
import {
  blueprintRepository,
  outputArtifactRepository,
  TemplateRenderer,
  TemplateRepository,
} from '../../modules/SiteSimulator/Infra'
import type { StylePack } from '../../modules/StylePack/Domain/ValueObject'
import { roundedToCss } from '../../modules/StylePack/Domain/ValueObject'

export type UsePreviewArtifactReturn = {
  /** 現在のPreviewArtifact（リアクティブ） */
  artifact: Ref<PreviewArtifact | null>
  /** 直近の変更の種類 */
  lastChangeType: Ref<ArtifactChangeType | null>
  /** Artifact生成用のヘルパー（直接呼び出しも可能） */
  generateArtifact: (blueprint: SiteBlueprint, renderedPalette: RenderedPalette) => PreviewArtifact
}

/**
 * usePreviewArtifact - Blueprint変更を監視してPreviewArtifactを生成
 *
 * BlueprintRepositoryをsubscribeし、変更時に：
 * 1. PreviewArtifactを生成
 * 2. OutputArtifactRepositoryに保存
 * 3. 変更の種類（html/css/both）を検出
 */
export const usePreviewArtifact = (
  renderedPalette: ComputedRef<RenderedPalette>,
  currentFont: ComputedRef<FontConfig>,
  currentStylePack: ComputedRef<StylePack>,
  sections: ComputedRef<readonly SectionContent[]>
): UsePreviewArtifactReturn => {
  const artifact = ref<PreviewArtifact | null>(null)
  const lastChangeType = ref<ArtifactChangeType | null>(null)

  /**
   * PreviewArtifactを生成
   */
  const generateArtifact = (
    _blueprint: SiteBlueprint,
    palette: RenderedPalette
  ): PreviewArtifact => {
    // HTMLを生成（色・スタイルはCSS変数を参照するため、変更時もHTMLは変わらない）
    const html = sections.value
      .map(section => TemplateRenderer.render(section))
      .join('\n')

    // CSSを生成
    const cssVars = $RenderedPalette.toCssVariables(palette)
    const baseStyle = TemplateRepository.getDefaultBase()?.meta.style ?? ''
    const templateStyles = TemplateRepository.getStylesForSections(
      sections.value.map(s => ({ id: s.id, templateId: s.templateId }))
    )

    const fontFamily = currentFont.value.family
    const borderRadius = roundedToCss[currentStylePack.value.rounded]

    const dynamicVars = `:root {
  --font-family: ${fontFamily};
  --site-border-radius: ${borderRadius};
}`

    const css = `/* === Dynamic Variables === */
${dynamicVars}

/* === Color Variables === */
${cssVars}

/* === Base Template Styles === */
${baseStyle}

/* === Section Styles === */
${templateStyles}`

    // Fontsを生成
    const source = currentFont.value.source
    const fonts = source.vendor === 'google'
      ? `<link href="${source.url}" rel="stylesheet">`
      : ''

    return $PreviewArtifact.create(html, css, fonts)
  }

  /**
   * OutputArtifactRepositoryからの変更通知を受け取る
   */
  let unsubscribeArtifact: (() => void) | null = null

  onMounted(() => {
    unsubscribeArtifact = outputArtifactRepository.subscribe((newArtifact, changeType) => {
      artifact.value = newArtifact
      lastChangeType.value = changeType
    })
  })

  onUnmounted(() => {
    unsubscribeArtifact?.()
  })

  /**
   * renderedPalette, sections, font, stylePackが変わったらArtifactを再生成
   */
  watch(
    [renderedPalette, sections, currentFont, currentStylePack],
    () => {
      const blueprint = blueprintRepository.get()
      if (!blueprint) return

      const newArtifact = generateArtifact(blueprint, renderedPalette.value)
      outputArtifactRepository.save(newArtifact)
    },
    { immediate: true, deep: true }
  )

  return {
    artifact,
    lastChangeType,
    generateArtifact,
  }
}
