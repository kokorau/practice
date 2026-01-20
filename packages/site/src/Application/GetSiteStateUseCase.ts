/**
 * GetSiteStateUseCase - サイト状態取得ユースケース
 */

import type { SiteRepository, SiteSubscriber, SiteUnsubscribe } from './ports/SiteRepository'
import type { Site, Page, PageUuid } from '../Domain/ValueObject/Site'

export interface GetSiteStateUseCaseDeps {
  siteRepository: SiteRepository
}

export interface GetSiteStateUseCase {
  /** 現在のサイト状態を取得 */
  getSite(): Site
  /** ページを取得 */
  getPage(pageId: PageUuid): Page | undefined
  /** 最初のページを取得 */
  getFirstPage(): Page | undefined
  /** サイト変更を購読 */
  subscribe(subscriber: SiteSubscriber): SiteUnsubscribe
}

export const createGetSiteStateUseCase = (
  deps: GetSiteStateUseCaseDeps
): GetSiteStateUseCase => ({
  getSite: () => deps.siteRepository.get(),

  getPage: (pageId: PageUuid) => deps.siteRepository.getPage(pageId),

  getFirstPage: () => {
    const site = deps.siteRepository.get()
    const pageIds = Object.keys(site.pages) as PageUuid[]
    const firstPageId = pageIds[0]
    return firstPageId !== undefined ? site.pages[firstPageId] : undefined
  },

  subscribe: (subscriber: SiteSubscriber) => deps.siteRepository.subscribe(subscriber),
})
