const ICONS = {
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4" y1="12" x2="14" y2="12"></line>
      <line x1="19" y1="12" x2="10" y2="12"></line>
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
    </svg>
  ),
  partly: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" stroke="currentColor"></circle>
      <line x1="8" y1="2" x2="8" y2="3" stroke="currentColor"></line>
      <line x1="8" y1="13" x2="8" y2="14" stroke="currentColor"></line>
      <path d="M16 18h-1A6 6 0 1 0 8 12" stroke="currentColor"></path>
      <path d="M16 18a4 4 0 0 0 0-8h-1" stroke="#94a3b8"></path>
    </svg>
  ),
  rain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16" y1="13" x2="16" y2="21"></line>
      <line x1="8" y1="13" x2="8" y2="21"></line>
      <line x1="12" y1="15" x2="12" y2="23"></line>
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>
    </svg>
  ),
  thunder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path>
      <polyline points="13 11 9 17 15 17 11 23"></polyline>
    </svg>
  ),
  snow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 15.25"></path>
      <line x1="8" y1="16" x2="8" y2="16"></line>
      <line x1="8" y1="20" x2="8" y2="20"></line>
      <line x1="12" y1="18" x2="12" y2="18"></line>
      <line x1="12" y1="22" x2="12" y2="22"></line>
      <line x1="16" y1="16" x2="16" y2="16"></line>
      <line x1="16" y1="20" x2="16" y2="20"></line>
    </svg>
  ),
  fog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14h16"></path>
      <path d="M4 18h12"></path>
      <path d="M4 10h20"></path>
      <path d="M8 6h14"></path>
    </svg>
  )
}

export function weatherIcon(code) {
  if (code === 1) return ICONS.sun
  if (code === 2) return ICONS.partly
  if (code === 3) return ICONS.partly
  if (code === 4) return ICONS.cloud
  if (code === 5) return ICONS.fog
  if (code === 6) return ICONS.rain
  if (code === 7) return ICONS.rain
  if (code === 8) return ICONS.snow
  if (code === 9) return ICONS.rain
  if (code === 10) return ICONS.thunder
  if (code <= 15) return ICONS.fog
  if (code === 22) return ICONS.rain
  if (code === 28) return ICONS.thunder
  return ICONS.cloud
}

export function weatherLabel(code) {
  if (code === 1) return '晴天'
  if (code === 2) return '大部晴朗'
  if (code === 3) return '局部多云'
  if (code === 4) return '阴'
  if (code === 5) return '雾'
  if (code === 6) return '毛毛雨'
  if (code === 7) return '雨'
  if (code === 8) return '雪'
  if (code === 9) return '阵雨'
  if (code === 10) return '雷暴'
  if (code <= 15) return '有雾'
  if (code === 22) return '阵雨'
  if (code === 28) return '雷暴'
  return '多云'
}

// 气温合理性检查:高温时雪→雨
export function sanitizeWeatherCode(code, temperatureC) {
  if (temperatureC > 15 && code === 8) return 7 // 雪→雨
  if (temperatureC > 20 && code === 5) return 3 // 高温天雾→多云(夏天少雾)
  return code
}
