import { captureScreenshot } from '../Infra/screenshotService'
import type { Screenshot } from '../Domain/Screenshot'

export type CaptureScreenshotInput = {
  url: string
}

export const captureScreenshotUseCase = async (input: CaptureScreenshotInput): Promise<Screenshot> => {
  return captureScreenshot({ url: input.url })
}
