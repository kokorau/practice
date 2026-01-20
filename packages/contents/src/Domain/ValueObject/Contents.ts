/**
 * Contents - サイトコンテンツ
 *
 * layout/section から参照されるデータ。
 * パスベースでアクセス (e.g., "section.about.title")
 */

// ============================================================================
// Content Value Types
// ============================================================================

export type ContentValue =
  | string
  | number
  | boolean
  | ContentObject
  | ContentArray

export interface ContentObject {
  readonly [key: string]: ContentValue
}

export type ContentArray = readonly ContentValue[]

// ============================================================================
// Contents
// ============================================================================

export interface Contents {
  readonly [path: string]: ContentValue
}

// ============================================================================
// Helpers
// ============================================================================

export const $Contents = {
  /**
   * パスでコンテンツを取得
   * @example $Contents.get(contents, 'section.about.title')
   */
  get: (contents: Contents, path: string): ContentValue | undefined => {
    const parts = path.split('.')
    let current: ContentValue | undefined = contents

    for (const part of parts) {
      if (current === undefined || current === null) return undefined
      if (typeof current !== 'object') return undefined
      current = (current as ContentObject)[part]
    }

    return current
  },

  /**
   * パスでコンテンツを設定 (immutable)
   */
  set: (contents: Contents, path: string, value: ContentValue): Contents => {
    const parts = path.split('.')
    const first = parts[0]

    // Handle single-part paths or empty paths
    if (parts.length <= 1 || first === undefined) {
      return { ...contents, [path]: value }
    }

    const rest = parts.slice(1)
    const nested = (contents[first] ?? {}) as ContentObject

    return {
      ...contents,
      [first]: $Contents.set(nested as Contents, rest.join('.'), value),
    }
  },
} as const
