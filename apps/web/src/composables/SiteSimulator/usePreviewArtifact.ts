import { ref, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type {
  RenderedPalette,
  FontConfig,
  SectionContent,
  PreviewArtifact,
  ArtifactChangeType,
} from '../../modules/SiteSimulator/Domain'
import { $RenderedPalette, $PreviewArtifact } from '../../modules/SiteSimulator/Domain'
import {
  TemplateRenderer,
  TemplateRepository,
  outputArtifactRepository,
  blueprintRepository,
} from '../../modules/SiteSimulator/Infra'
import { createUpdateBlueprintUseCase, createRenderArtifactUseCase } from '../../modules/SiteSimulator/Application'
import type { StylePack } from '../../modules/StylePack/Domain/ValueObject'
import { roundedToCss, gapToMultiplier, paddingToMultiplier } from '../../modules/StylePack/Domain/ValueObject'

// UseCase instances (singleton)
const blueprintUseCase = createUpdateBlueprintUseCase(blueprintRepository)
const renderArtifactUseCase = createRenderArtifactUseCase(outputArtifactRepository)

export type UsePreviewArtifactReturn = {
  /** 現在のPreviewArtifact（リアクティブ） */
  artifact: Ref<PreviewArtifact | null>
  /** 直近の変更の種類 */
  lastChangeType: Ref<ArtifactChangeType | null>
  /** UseCase（外部からsubscribe可能） */
  useCase: typeof renderArtifactUseCase
}

/**
 * usePreviewArtifact - Blueprint変更を監視してPreviewArtifactを生成
 *
 * 変更時に：
 * 1. PreviewArtifactを生成
 * 2. UseCase経由でOutputArtifactRepositoryに保存
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
  const generateArtifact = (palette: RenderedPalette): PreviewArtifact => {
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

    const dynamicVars = `:root {
  --font-family: ${currentFont.value.family};
  --site-border-radius: ${roundedToCss[currentStylePack.value.rounded]};
  --site-padding-base: ${paddingToMultiplier[currentStylePack.value.padding]}rem;
  --site-gap: ${gapToMultiplier[currentStylePack.value.gap]}rem;
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
   * UseCase経由で変更通知を受け取る（onMountedより前にsubscribeが必要）
   */
  const unsubscribe = renderArtifactUseCase.subscribe((newArtifact, changeType) => {
    artifact.value = newArtifact
    lastChangeType.value = changeType
  })

  onUnmounted(() => {
    unsubscribe()
  })

  /**
   * renderedPalette, sections, font, stylePackが変わったらArtifactを再生成
   */
  watch(
    [renderedPalette, sections, currentFont, currentStylePack],
    () => {
      const blueprint = blueprintUseCase.get()
      if (!blueprint) return

      const newArtifact = generateArtifact(renderedPalette.value)
      renderArtifactUseCase.save(newArtifact)
    },
    { immediate: true, deep: true }
  )

  return {
    artifact,
    lastChangeType,
    useCase: renderArtifactUseCase,
  }
}
