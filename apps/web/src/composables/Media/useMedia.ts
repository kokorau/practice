import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { type Media, type Photo, $Media, mediaRepository } from '../../modules/Media'
import { uploadLocalPhoto } from '../../modules/PhotoLocal/Infra/localPhotoUploader'
import { HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/hero-scene'

export type UseMediaReturn = {
  /** 現在のメディア */
  media: Ref<Media | null>
  /** Photo をロード */
  loadPhoto: (file: File) => Promise<void>
  /** Photo オブジェクトから直接設定 */
  setPhoto: (photo: Photo) => void
  /** カメラを開始 */
  startCamera: (options?: CameraOptions) => Promise<void>
  /** カメラを停止 */
  stopCamera: () => void
  /** スクリーンキャプチャを開始 */
  startScreenCapture: (options?: ScreenCaptureOptions) => Promise<void>
  /** スクリーンキャプチャを停止 */
  stopScreenCapture: () => void
  /** メディアをクリア */
  clear: () => void
  /** カメラがアクティブかどうか */
  isCameraActive: Ref<boolean>
  /** スクリーンキャプチャがアクティブかどうか */
  isScreenCaptureActive: Ref<boolean>
  /** ストリーミング中かどうか (Camera or ScreenCapture) */
  isStreaming: Ref<boolean>
  /** エラーメッセージ */
  error: Ref<string | null>
}

export type CameraOptions = {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
}

export type ScreenCaptureOptions = {
  width?: number
  height?: number
}

export const useMedia = (): UseMediaReturn => {
  const media = ref<Media | null>(null)
  const isCameraActive = ref(false)
  const isScreenCaptureActive = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)

  let cameraStream: MediaStream | null = null
  let screenStream: MediaStream | null = null
  let videoElement: HTMLVideoElement | null = null

  // Repository と同期
  const syncFromRepository = () => {
    media.value = mediaRepository.get()
  }

  const syncToRepository = (newMedia: Media | null) => {
    if (newMedia) {
      mediaRepository.set(newMedia)
    } else {
      mediaRepository.clear()
    }
    media.value = newMedia
  }

  // Photo ファイルをロード
  const loadPhoto = async (file: File) => {
    error.value = null
    try {
      // ストリーミング中なら停止
      stopAllStreams()

      const photo = await uploadLocalPhoto(file)
      const newMedia = $Media.fromPhoto(photo)
      syncToRepository(newMedia)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load photo'
    }
  }

  // Photo オブジェクトを直接設定
  const setPhoto = (photo: Photo) => {
    // ストリーミング中なら停止
    stopAllStreams()
    const newMedia = $Media.fromPhoto(photo)
    syncToRepository(newMedia)
  }

  // 全ストリームを停止するヘルパー
  const stopAllStreams = () => {
    if (isCameraActive.value) stopCamera()
    if (isScreenCaptureActive.value) stopScreenCapture()
  }

  // カメラを開始
  const startCamera = async (options: CameraOptions = {}) => {
    error.value = null
    stopAllStreams()
    const { width = 1280, height = 720, facingMode = 'user' } = options

    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'Camera API not supported'
      return
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
        },
        audio: false,
      })

      await setupVideoElement(cameraStream)
      isCameraActive.value = true
      isStreaming.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start camera'
      stopCamera()
    }
  }

  // スクリーンキャプチャを開始
  const startScreenCapture = async (options: ScreenCaptureOptions = {}) => {
    error.value = null
    stopAllStreams()
    const { width = HERO_CANVAS_WIDTH, height = HERO_CANVAS_HEIGHT } = options

    if (!navigator.mediaDevices?.getDisplayMedia) {
      error.value = 'Screen Capture API not supported'
      return
    }

    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      })

      // ユーザーが共有を停止した場合のハンドリング
      const videoTrack = screenStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenCapture()
        }
      }

      await setupVideoElement(screenStream)
      isScreenCaptureActive.value = true
      isStreaming.value = true
    } catch (e) {
      // ユーザーがキャンセルした場合は NotAllowedError
      if (e instanceof Error && e.name === 'NotAllowedError') {
        error.value = 'Screen capture was cancelled'
      } else {
        error.value = e instanceof Error ? e.message : 'Failed to start screen capture'
      }
      stopScreenCapture()
    }
  }

  // video 要素をセットアップして Media を作成
  const setupVideoElement = async (stream: MediaStream) => {
    videoElement = document.createElement('video')
    videoElement.srcObject = stream
    videoElement.playsInline = true
    videoElement.muted = true

    await new Promise<void>((resolve, reject) => {
      if (!videoElement) return reject(new Error('No video element'))

      videoElement.onloadedmetadata = () => {
        videoElement!.play()
          .then(() => resolve())
          .catch(reject)
      }
      videoElement.onerror = () => reject(new Error('Video load failed'))
    })

    const newMedia = $Media.fromCamera(videoElement)
    syncToRepository(newMedia)
  }

  // カメラを停止
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      cameraStream = null
    }
    if (videoElement && !isScreenCaptureActive.value) {
      videoElement.srcObject = null
      videoElement = null
    }
    isCameraActive.value = false
    if (!isScreenCaptureActive.value) {
      isStreaming.value = false
    }
  }

  // スクリーンキャプチャを停止
  const stopScreenCapture = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
      screenStream = null
    }
    if (videoElement && !isCameraActive.value) {
      videoElement.srcObject = null
      videoElement = null
    }
    isScreenCaptureActive.value = false
    if (!isCameraActive.value) {
      isStreaming.value = false
    }
  }

  // クリア
  const clear = () => {
    stopAllStreams()
    syncToRepository(null)
  }

  // マウント時に repository から同期
  onMounted(() => {
    syncFromRepository()
  })

  // アンマウント時にストリームを停止
  onUnmounted(() => {
    stopAllStreams()
  })

  return {
    media,
    loadPhoto,
    setPhoto,
    startCamera,
    stopCamera,
    startScreenCapture,
    stopScreenCapture,
    clear,
    isCameraActive,
    isScreenCaptureActive,
    isStreaming,
    error,
  }
}
