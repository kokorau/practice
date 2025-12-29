/**
 * MockData - SiteBuilder の初期化用モックデータ
 */

import brandGuideContent from './brandGuide.md?raw'
import siteConfigData from './siteConfig.json'
import filterConfigData from './filterConfig.json'
import siteContentsData from './siteContents.json'

import type { SiteConfig } from '../../Domain/ValueObject/SiteConfig'
import type { FilterConfig } from '../../Domain/ValueObject/FilterConfig'
import type { SiteContents } from '../../Domain/ValueObject/SiteContents'

/** Brand Guide のデフォルトコンテンツ */
export const DEFAULT_BRAND_GUIDE_CONTENT: string = brandGuideContent

/** SiteConfig のデフォルト値 */
export const DEFAULT_SITE_CONFIG: SiteConfig = siteConfigData as SiteConfig

/** FilterConfig のデフォルト値 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = filterConfigData as FilterConfig

/** SiteContents のデフォルト値 */
export const DEFAULT_SITE_CONTENTS: SiteContents = siteContentsData as SiteContents
