import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { SemanticColorPalette } from '@practice/semantic-color-palette/Domain'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import {
  createSite,
  createDemoPage,
  renderPage,
  exportToHTML,
  type Site,
  type Section,
  type SectionContent,
  type Page,
} from '@practice/semantic-site'

export interface UseDemoSiteParams {
  palette: ComputedRef<SemanticColorPalette>
  tokens?: ComputedRef<DesignTokens>
}

export interface UseDemoSiteReturn {
  siteContents: Ref<Record<string, SectionContent>>
  demoSite: ComputedRef<Site>
  demoTheme: ComputedRef<import('@practice/semantic-site').RenderTheme>
  currentSections: ComputedRef<readonly Section[]>
  demoHtml: ComputedRef<string>
  selectedSectionId: Ref<string | null>
  updateSectionContent: (sectionId: string, content: SectionContent) => void
  downloadHTML: () => void
}

export function useDemoSite(params: UseDemoSiteParams): UseDemoSiteReturn {
  const { palette, tokens } = params
  const initialPage = createDemoPage()

  // Mutable sections for editing
  const sections = ref<Section[]>([...initialPage.sections])

  // Derived siteContents for backward compatibility
  const siteContents = computed({
    get: (): Record<string, SectionContent> => {
      const contents: Record<string, SectionContent> = {}
      for (const section of sections.value) {
        contents[section.id] = section.content
      }
      return contents
    },
    set: (newContents: Record<string, SectionContent>) => {
      sections.value = sections.value.map(section => ({
        ...section,
        content: newContents[section.id] ?? section.content,
      })) as Section[]
    },
  })

  // Create page from current sections
  const currentPage = computed((): Page => ({
    id: initialPage.id,
    sections: sections.value,
  }))

  const demoSite = computed((): Site => createSite({
    meta: {
      id: 'demo-site',
      name: 'Demo Site',
      description: 'A demo site for previewing semantic color palettes',
    },
    palette: palette.value,
    tokens: tokens?.value,
    pages: [currentPage.value],
    contents: siteContents.value,
  }))

  const selectedSectionId = ref<string | null>(null)

  const currentSections = computed(() => sections.value as readonly Section[])

  const demoTheme = computed(() => demoSite.value.theme)

  const demoHtml = computed(() => {
    const page = currentPage.value
    const site = demoSite.value
    return renderPage(page, site.theme, {
      includeCSS: false,
      wrapperClass: 'demo-page',
    })
  })

  const updateSectionContent = (sectionId: string, content: SectionContent) => {
    siteContents.value = {
      ...siteContents.value,
      [sectionId]: content,
    }
  }

  const downloadHTML = () => {
    const html = exportToHTML(demoSite.value, {
      title: 'Semantic Color Palette Demo',
      fullDocument: true,
    })
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'palette-demo.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    siteContents,
    demoSite,
    demoTheme,
    currentSections,
    demoHtml,
    selectedSectionId,
    updateSectionContent,
    downloadHTML,
  }
}
