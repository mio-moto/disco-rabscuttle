import FormData from 'form-data'
import type Jimp from 'jimp'
import { MIME_PNG } from 'jimp'
import fetch from 'node-fetch'
import type { UploadConfig } from '../../config'

type UploadResponse =
  | {
      url: string
      success: true
    }
  | {
      success: false
    }

export const uploadImage = async (img: Jimp, filename: string, uploadConfig: UploadConfig | null): Promise<UploadResponse> => {
  if (uploadConfig === null) {
    return { success: false }
  }
  const buffer = await img.getBufferAsync(MIME_PNG)

  const formData = new FormData()

  formData.append('Content-Type', 'application/octet-stream')
  formData.append(uploadConfig.formField, buffer, { filename: filename })
  const response = await fetch(uploadConfig.endpoint, {
    method: 'POST',
    body: formData,
    headers: { Authorization: uploadConfig.token },
  })

  if (response.ok) {
    return {
      success: true,
      url: uploadConfig.uriFormat.replace('{filename}', filename),
    }
  }
  return { success: false }
}
