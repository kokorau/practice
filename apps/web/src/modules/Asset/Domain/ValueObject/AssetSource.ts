/**
 * AssetSource - アセットの実データソース
 *
 * 様々なソースタイプをサポート:
 * - blob: メモリ上のBlobデータ
 * - url: 外部URL参照
 * - fileHandle: File System Access APIのハンドル
 */

/** Blobソース（メモリ上のデータ） */
export type BlobSource = {
  type: 'blob'
  blob: Blob
}

/** URLソース（外部参照） */
export type UrlSource = {
  type: 'url'
  url: string
}

/** File Handleソース（ローカルファイルシステム） */
export type FileHandleSource = {
  type: 'fileHandle'
  handle: FileSystemFileHandle
}

/** アセットソースの共用体型 */
export type AssetSource = BlobSource | UrlSource | FileHandleSource

export const $AssetSource = {
  /** Blobからソースを作成 */
  fromBlob: (blob: Blob): BlobSource => ({
    type: 'blob',
    blob,
  }),

  /** URLからソースを作成 */
  fromUrl: (url: string): UrlSource => ({
    type: 'url',
    url,
  }),

  /** FileSystemFileHandleからソースを作成 */
  fromFileHandle: (handle: FileSystemFileHandle): FileHandleSource => ({
    type: 'fileHandle',
    handle,
  }),

  /** Fileからソースを作成（Blobとして扱う） */
  fromFile: (file: File): BlobSource => ({
    type: 'blob',
    blob: file,
  }),

  /** ソースからBlobを取得 */
  toBlob: async (source: AssetSource): Promise<Blob> => {
    switch (source.type) {
      case 'blob':
        return source.blob
      case 'url': {
        const response = await fetch(source.url)
        return response.blob()
      }
      case 'fileHandle': {
        const file = await source.handle.getFile()
        return file
      }
    }
  },

  /** ソースからObject URLを作成 */
  toObjectUrl: async (source: AssetSource): Promise<string> => {
    if (source.type === 'url') {
      return source.url
    }
    const blob = await $AssetSource.toBlob(source)
    return URL.createObjectURL(blob)
  },

  /** ソースタイプを判定 */
  isBlob: (source: AssetSource): source is BlobSource => source.type === 'blob',
  isUrl: (source: AssetSource): source is UrlSource => source.type === 'url',
  isFileHandle: (source: AssetSource): source is FileHandleSource => source.type === 'fileHandle',
}
