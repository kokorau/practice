/**
 * MockData - SiteBuilder の初期化用モックデータ
 */

import brandGuideContent from './brandGuide.md?raw'
import siteConfigData from './siteConfig.json'

import type { SiteConfig } from '../../Domain/ValueObject/SiteConfig'

/** Brand Guide のデフォルトコンテンツ */
export const DEFAULT_BRAND_GUIDE_CONTENT: string = brandGuideContent

/** SiteConfig のデフォルト値 */
export const DEFAULT_SITE_CONFIG: SiteConfig = siteConfigData as SiteConfig
