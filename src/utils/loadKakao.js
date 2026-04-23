const KAKAO_SCRIPT_ID = 'kakao-map-sdk'
const POSTCODE_SCRIPT_ID = 'daum-postcode-sdk'
const kakaoMapKey = window.__APP_CONFIG__?.VITE_KAKAO_MAP_KEY || import.meta.env.VITE_KAKAO_MAP_KEY

function createLoadError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function loadScript(id, src) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }

      existing.remove()
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

export async function loadKakaoMaps() {
  if (!kakaoMapKey) {
    throw createLoadError('KAKAO_KEY_MISSING', 'VITE_KAKAO_MAP_KEY is not set.')
  }

  try {
    await loadScript(
      KAKAO_SCRIPT_ID,
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false&libraries=services`,
    )
  } catch (error) {
    throw createLoadError('KAKAO_MAP_LOAD_FAILED', error.message)
  }

  return new Promise((resolve) => {
    window.kakao.maps.load(() => resolve(window.kakao))
  })
}

export async function loadDaumPostcode() {
  try {
    await loadScript(
      POSTCODE_SCRIPT_ID,
      'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js',
    )
  } catch (error) {
    throw createLoadError('DAUM_POSTCODE_LOAD_FAILED', error.message)
  }

  return window.daum
}
