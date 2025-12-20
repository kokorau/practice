export { DEFAULT_SCHEMAS, getSchemaByType, getSchemaById } from './defaultSchemas'

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
