export type { Section, SectionType, Page, ThemeRef } from './Section'

export type { ColorCssVariables } from './ColorCssVariables'
export { generateColorCssVariables, cssVariablesToStyleString } from './ColorCssVariables'

export type { FeatureContent, TextContent, SectionContent, PageContents } from './SectionRenderer'
export { renderSection, renderPage } from './SectionRenderer'
