/**
 * SiteContents - サイトのセクションコンテンツ
 *
 * 各セクションのコンテンツを管理
 */

import type { AssetId } from '../../../Asset'
import type { SectionContent } from '@practice/semantic-site'
import { createDemoPage } from '@practice/semantic-site'

/** サイトコンテンツ (sectionId -> SectionContent) */
export type SiteContents = Record<string, SectionContent>

/** SiteContents の固定 AssetId */
export const SITE_CONTENTS_ASSET_ID = 'site-contents' as AssetId

/** SiteContents のファイル名 */
export const SITE_CONTENTS_FILENAME = 'site-contents.json'

/** デフォルトの SiteContents を生成 */
export const createDefaultSiteContents = (): SiteContents => {
  const demoPage = createDemoPage()
  const contents: SiteContents = {}
  for (const section of demoPage.sections) {
    contents[section.id] = section.content
  }
  return contents
}

export const $SiteContents = {
  /** JSON 文字列からパース */
  fromJSON: (json: string): SiteContents => {
    try {
      return JSON.parse(json)
    } catch {
      return createDefaultSiteContents()
    }
  },

  /** JSON 文字列にシリアライズ */
  toJSON: (contents: SiteContents): string => {
    return JSON.stringify(contents, null, 2)
  },

  /** セクションコンテンツを更新 */
  updateSection: (
    contents: SiteContents,
    sectionId: string,
    content: SectionContent
  ): SiteContents => ({
    ...contents,
    [sectionId]: content,
  }),
}
