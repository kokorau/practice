/**
 * UnsplashImageUploadAdapter
 *
 * ImageUploadPortの実装
 * ファイルをBlob URLに変換し、Unsplash APIからランダム画像を取得
 */

import type { ImageUploadPort } from '@practice/hero-scene'
import { fetchUnsplashPhotoUrl } from '../modules/PhotoUnsplash/Infra/fetchUnsplashPhoto'

/**
 * Unsplash API対応のImageUploadAdapter
 */
export const createUnsplashImageUploadAdapter = (): ImageUploadPort => {
  return {
    /**
     * ファイルをアップロードしてIDを取得
     * Blob URLを生成して返す
     */
    async upload(file: File): Promise<string> {
      return URL.createObjectURL(file)
    },

    /**
     * Unsplashからランダム画像を取得
     */
    async fetchRandom(query?: string): Promise<File> {
      const url = await fetchUnsplashPhotoUrl({ query })
      const response = await fetch(url)
      const blob = await response.blob()
      return new File([blob], `unsplash-${Date.now()}.jpg`, { type: 'image/jpeg' })
    },
  }
}
