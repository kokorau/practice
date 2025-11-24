import { ref, onUnmounted, type Ref } from 'vue'

export type UseCameraReturn = {
  /** Video element reference */
  videoRef: Ref<HTMLVideoElement | null>
  /** Whether camera is active */
  isActive: Ref<boolean>
  /** Error message if any */
  error: Ref<string | null>
  /** Start camera */
  start: () => Promise<void>
  /** Stop camera */
  stop: () => void
}

export type CameraOptions = {
  /** Preferred width */
  width?: number
  /** Preferred height */
  height?: number
  /** Facing mode: 'user' (front) or 'environment' (back) */
  facingMode?: 'user' | 'environment'
}

export const useCamera = (options: CameraOptions = {}): UseCameraReturn => {
  const videoRef = ref<HTMLVideoElement | null>(null)
  const isActive = ref(false)
  const error = ref<string | null>(null)
  let stream: MediaStream | null = null

  const {
    width = 1280,
    height = 720,
    facingMode = 'user',
  } = options

  const start = async () => {
    error.value = null

    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'Camera API not supported'
      return
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
        },
        audio: false,
      })

      if (videoRef.value) {
        videoRef.value.srcObject = stream
        await videoRef.value.play()
        isActive.value = true
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = `Camera access denied: ${message}`
      isActive.value = false
    }
  }

  const stop = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }
    if (videoRef.value) {
      videoRef.value.srcObject = null
    }
    isActive.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stop()
  })

  return {
    videoRef,
    isActive,
    error,
    start,
    stop,
  }
}
