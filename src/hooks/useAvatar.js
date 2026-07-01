import { useState, useEffect, useCallback } from 'react'
import { getProfile, updateProfile } from '../services/api'

const EVENT_NAME = 'avatar-updated'

// In-memory cache so every Avatar component reads the same value without re-fetching
let _cache = undefined  // undefined = not loaded yet, null = loaded but empty

function notify(value) {
  _cache = value
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }))
}

export function useAvatar() {
  const [avatar, setAvatar] = useState(() => _cache ?? null)

  useEffect(() => {
    // Load once from backend when first consumer mounts
    if (_cache === undefined) {
      _cache = null  // mark as loading to prevent parallel fetches
      getProfile()
        .then(r => notify(r.data.avatar ?? null))
        .catch(() => notify(null))
    }

    const handler = (e) => setAvatar(e.detail)
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  const saveAvatar = useCallback(async (base64) => {
    await updateProfile({ avatar: base64 ?? null })
    notify(base64 ?? null)
  }, [])

  const removeAvatar = useCallback(async () => {
    await updateProfile({ avatar: null })
    notify(null)
  }, [])

  return { avatar, saveAvatar, removeAvatar }
}

/** Resize image file → base64 JPEG (max 256×256, ~30KB) */
export function resizeImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale   = Math.min(maxSize / img.width, maxSize / img.height, 1)
        const canvas  = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
