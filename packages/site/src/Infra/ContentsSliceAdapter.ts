/**
 * ContentsSliceAdapter - SiteRepositoryからContentsへのスライスビュー
 *
 * SiteRepositoryのcontentsフィールドに対するContentsRepository互換のアダプター
 */

import type {
  ContentsRepository,
  ContentsSubscriber,
  ContentsUnsubscribe,
} from '@practice/contents/Application'
import type { Contents, ContentValue } from '@practice/contents'
import type { SiteRepository } from '../Application/ports/SiteRepository'

export const createContentsSlice = (siteRepository: SiteRepository): ContentsRepository => {
  return {
    get: (): Contents => {
      return siteRepository.get().contents
    },

    set: (contents: Contents): void => {
      const site = siteRepository.get()
      siteRepository.set({
        ...site,
        contents,
      })
    },

    subscribe: (subscriber: ContentsSubscriber): ContentsUnsubscribe => {
      let lastContents = siteRepository.get().contents

      return siteRepository.subscribe((site) => {
        // Only notify if contents actually changed
        if (site.contents !== lastContents) {
          lastContents = site.contents
          subscriber(site.contents)
        }
      })
    },

    getByPath: (path: string): ContentValue | undefined => {
      return siteRepository.getContentByPath(path)
    },

    setByPath: (path: string, value: ContentValue): void => {
      siteRepository.setContentByPath(path, value)
    },
  }
}
