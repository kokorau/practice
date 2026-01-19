// Re-export from section-semantic for convenience
export { DEFAULT_SCHEMAS, getSchemaByType, getSchemaById } from '@practice/section-semantic/Infra'

// Site Service - Use Cases
export {
  createSite,
  createDemoSite,
  updateSiteTheme,
  updateSectionContent,
  getFirstPage,
  getSectionContent,
  getUsedSectionTypes,
  exportToHTML,
  exportToCSS,
  type CreateSiteParams,
  type ExportHTMLOptions,
} from './SiteService'
