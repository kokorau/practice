/**
 * AssetMeta - アセットのメタ情報
 *
 * AIとの協業を考慮し、自然言語での説明やタグ付けが可能
 */

/** アセットの種類 */
export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'font' | 'data' | 'other'

/** メタ情報 */
export type AssetMeta = {
  /** タイトル（人間/AI向けの識別名） */
  title: string
  /** 説明文（用途や内容の詳細） */
  description: string
  /** タグ（検索・分類用） */
  tags: readonly string[]
  /** アセットの種類 */
  type: AssetType
  /** MIMEタイプ */
  mimeType: string
  /** ファイルサイズ（bytes） */
  size: number
  /** 作成日時 */
  createdAt: Date
  /** 更新日時 */
  updatedAt: Date
  /** 追加のカスタムメタデータ（AI生成の情報など） */
  custom: Record<string, unknown>
}

/** メタ情報の作成オプション */
export type AssetMetaCreateOptions = {
  title?: string
  description?: string
  tags?: string[]
  type?: AssetType
  mimeType: string
  size: number
  custom?: Record<string, unknown>
}

export const $AssetMeta = {
  /** メタ情報を作成 */
  create: (options: AssetMetaCreateOptions): AssetMeta => {
    const now = new Date()
    return {
      title: options.title ?? '',
      description: options.description ?? '',
      tags: options.tags ?? [],
      type: options.type ?? inferTypeFromMime(options.mimeType),
      mimeType: options.mimeType,
      size: options.size,
      createdAt: now,
      updatedAt: now,
      custom: options.custom ?? {},
    }
  },

  /** タイトルを更新 */
  updateTitle: (meta: AssetMeta, title: string): AssetMeta => ({
    ...meta,
    title,
    updatedAt: new Date(),
  }),

  /** 説明を更新 */
  updateDescription: (meta: AssetMeta, description: string): AssetMeta => ({
    ...meta,
    description,
    updatedAt: new Date(),
  }),

  /** タグを追加 */
  addTag: (meta: AssetMeta, tag: string): AssetMeta => {
    if (meta.tags.includes(tag)) return meta
    return {
      ...meta,
      tags: [...meta.tags, tag],
      updatedAt: new Date(),
    }
  },

  /** タグを削除 */
  removeTag: (meta: AssetMeta, tag: string): AssetMeta => ({
    ...meta,
    tags: meta.tags.filter((t) => t !== tag),
    updatedAt: new Date(),
  }),

  /** カスタムメタデータを更新 */
  setCustom: (meta: AssetMeta, key: string, value: unknown): AssetMeta => ({
    ...meta,
    custom: { ...meta.custom, [key]: value },
    updatedAt: new Date(),
  }),

  /** カスタムメタデータを取得 */
  getCustom: <T>(meta: AssetMeta, key: string): T | undefined => {
    return meta.custom[key] as T | undefined
  },
}

/** MIMEタイプからAssetTypeを推測 */
const inferTypeFromMime = (mimeType: string): AssetType => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('font/') || mimeType.includes('font')) return 'font'
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/pdf' ||
    mimeType.includes('document')
  ) {
    return 'document'
  }
  if (mimeType === 'application/json' || mimeType.includes('xml')) return 'data'
  return 'other'
}
