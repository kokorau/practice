/**
 * ContentsInMemoryRepository - コンテンツのインメモリ実装
 */

import type {
  ContentsRepository,
  ContentsSubscriber,
  ContentsUnsubscribe,
} from '../Application/ports/ContentsRepository'
import type { Contents, ContentValue } from '../Domain/ValueObject/Contents'
import { $Contents } from '../Domain/ValueObject/Contents'

export interface CreateContentsInMemoryRepositoryOptions {
  initialContents?: Contents
}

export const createContentsInMemoryRepository = (
  options: CreateContentsInMemoryRepositoryOptions = {}
): ContentsRepository => {
  let contents: Contents = options.initialContents ?? {}
  const subscribers = new Set<ContentsSubscriber>()

  const notifySubscribers = () => {
    for (const callback of subscribers) {
      callback(contents)
    }
  }

  return {
    get: () => contents,

    set: (newContents: Contents) => {
      contents = newContents
      notifySubscribers()
    },

    subscribe: (subscriber: ContentsSubscriber): ContentsUnsubscribe => {
      subscribers.add(subscriber)
      return () => {
        subscribers.delete(subscriber)
      }
    },

    getByPath: (path: string): ContentValue | undefined => {
      return $Contents.get(contents, path)
    },

    setByPath: (path: string, value: ContentValue) => {
      contents = $Contents.set(contents, path, value)
      notifySubscribers()
    },
  }
}
