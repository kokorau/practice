// Renderer
export { renderSection, renderPage, generateCSS } from './SectionRenderer'
export type { RenderPageOptions } from './SectionRenderer'

// Default Content
export { getDefaultContent, getAllDefaultContents } from './getDefaultContent'

// Eta Config
export { eta, escapeHtml } from './etaConfig'

// Eta Templates
export { getEtaTemplate, ETA_TEMPLATES } from './etaTemplates'
export type { EtaTemplate } from './etaTemplates'

// Default templates for Site creation (re-export as DEFAULT_TEMPLATES for backward compatibility)
import { ETA_TEMPLATES } from './etaTemplates'
export const DEFAULT_TEMPLATES = Object.values(ETA_TEMPLATES)
