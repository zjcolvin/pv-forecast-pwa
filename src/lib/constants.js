export const STATION = {
  lat: 29.685526,
  lon: 120.258154,
  name: '绍兴',
  zoom: 9
}

export const METEOBLUE_KEY = 'Ag8H7MjpqrZY2cEP'
// basic-1h = hourly(for irradiance/time-of-day metrics)
// basic-day = daily summary(for representative daily weather & icons matching website)
export const METEOBLUE_URL = 'https://my.meteoblue.com/packages/basic-1h,solar-1h,basic-day'

export const SOLCAST_SITE = '6202-eb4d-032d-dabc'
export const SOLCAST_API_KEY = 'NrJJjyGiGLoqyxb_B2uV48v135ehBl7z'

export const DEFAULT_PARAMS = {
  capacityKw: 10,
  areaM2: 50,
  efficiency: 0.21,
  pr: 0.80,
  tempCoeff: -0.0035
}

export const HOURS_TO_SHOW = 72
export const METEOBLUE_CACHE_TTL_MS = 60 * 60 * 1000
export const SOLCAST_CACHE_TTL_MS = 12 * 60 * 60 * 1000
