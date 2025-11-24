/**
 * Media - 統一的なメディアソース（Photo または Camera）
 */

import type { Photo } from '../../../Photo/Domain'

/** メディアソースの種類 */
export type MediaSourceType = 'photo' | 'camera'

/** 静的な画像ソース */
export type PhotoSource = {
  type: 'photo'
  photo: Photo
}

/** カメラストリームソース */
export type CameraSource = {
  type: 'camera'
  video: HTMLVideoElement
  /** オフスクリーンキャンバス（フレーム取得用） */
  offscreenCanvas: HTMLCanvasElement
  offscreenCtx: CanvasRenderingContext2D
}

/** メディアソース */
export type MediaSource = PhotoSource | CameraSource

/** メディア */
export type Media = {
  /** 一意のID */
  id: string
  /** ソース */
  source: MediaSource
  /** 幅 */
  width: number
  /** 高さ */
  height: number
}

let mediaIdCounter = 0

export const $Media = {
  /** Photo から Media を作成 */
  fromPhoto: (photo: Photo): Media => ({
    id: `photo-${++mediaIdCounter}`,
    source: { type: 'photo', photo },
    width: photo.width,
    height: photo.height,
  }),

  /** Camera から Media を作成 */
  fromCamera: (video: HTMLVideoElement): Media => {
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = video.videoWidth || 1280
    offscreenCanvas.height = video.videoHeight || 720
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })!

    return {
      id: `camera-${++mediaIdCounter}`,
      source: {
        type: 'camera',
        video,
        offscreenCanvas,
        offscreenCtx,
      },
      width: offscreenCanvas.width,
      height: offscreenCanvas.height,
    }
  },

  /** 現在のフレームの ImageData を取得 */
  getImageData: (media: Media): ImageData | null => {
    if (media.source.type === 'photo') {
      return media.source.photo.imageData
    }

    // Camera: video から現在のフレームを取得
    const { video, offscreenCanvas, offscreenCtx } = media.source

    if (video.readyState < 2) {
      // HAVE_CURRENT_DATA 未満なら null
      return null
    }

    // サイズが変わっていたら更新
    if (offscreenCanvas.width !== video.videoWidth || offscreenCanvas.height !== video.videoHeight) {
      offscreenCanvas.width = video.videoWidth
      offscreenCanvas.height = video.videoHeight
    }

    offscreenCtx.drawImage(video, 0, 0)
    return offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height)
  },

  /** Media がカメラかどうか */
  isCamera: (media: Media): boolean => media.source.type === 'camera',

  /** Media が Photo かどうか */
  isPhoto: (media: Media): boolean => media.source.type === 'photo',

  /** Photo を取得（Photo ソースの場合のみ） */
  getPhoto: (media: Media): Photo | null => {
    if (media.source.type === 'photo') {
      return media.source.photo
    }
    return null
  },

  /** VideoElement を取得（Camera ソースの場合のみ） */
  getVideoElement: (media: Media): HTMLVideoElement | null => {
    if (media.source.type === 'camera') {
      return media.source.video
    }
    return null
  },

  /** 寸法を更新（カメラの場合、video サイズが変わった時） */
  updateDimensions: (media: Media): Media => {
    if (media.source.type === 'camera') {
      const { video, offscreenCanvas } = media.source
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        offscreenCanvas.width = video.videoWidth
        offscreenCanvas.height = video.videoHeight
        return {
          ...media,
          width: video.videoWidth,
          height: video.videoHeight,
        }
      }
    }
    return media
  },
}
