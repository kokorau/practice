import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { SemanticColorPalette } from '../../modules/SemanticColorPalette/Domain'
import {
  $Site,
  $Page,
  createSite,
  renderPage,
  exportToHTML,
  getDefaultContent,
  type Site,
  type Section,
  type SectionContent,
} from '../../modules/SemanticSection'

export interface UseDemoSiteReturn {
  siteContents: Ref<Record<string, SectionContent>>
  demoSite: ComputedRef<Site>
  currentSections: ComputedRef<readonly Section[]>
  demoHtml: ComputedRef<string>
  selectedSectionId: Ref<string | null>
  updateSectionContent: (sectionId: string, content: SectionContent) => void
  downloadHTML: () => void
}

export function useDemoSite(palette: ComputedRef<SemanticColorPalette>): UseDemoSiteReturn {
  const demoPage = $Page.createDemo()

  const initializeContents = (): Record<string, SectionContent> => {
    const contents: Record<string, SectionContent> = {}
    for (const section of demoPage.sections) {
      contents[section.id] = getDefaultContent(section.type)
    }
    return contents
  }

  const siteContents = ref<Record<string, SectionContent>>(initializeContents())

  const demoSite = computed((): Site => createSite({
    meta: {
      id: 'demo-site',
      name: 'Demo Site',
      description: 'A demo site for previewing semantic color palettes',
    },
    palette: palette.value,
    pages: [demoPage],
    contents: siteContents.value,
  }))

  const selectedSectionId = ref<string | null>(null)

  const currentSections = computed(() => demoPage.sections)

  const demoHtml = computed(() => {
    const site = demoSite.value
    const page = $Site.getFirstPage(site)
    if (!page) return ''
    return renderPage(page, site.contents, site.theme, {
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
    currentSections,
    demoHtml,
    selectedSectionId,
    updateSectionContent,
    downloadHTML,
  }
}
