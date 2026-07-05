import { METEOBLUE_URL, METEOBLUE_KEY, STATION, SOLCAST_SITE, SOLCAST_API_KEY,
         METEOBLUE_CACHE_TTL_MS, SOLCAST_CACHE_TTL_MS, DEFAULT_PARAMS } from './constants.js'

const MB_KEY = 'meteoblue_cache_v1'
const SC_KEY = 'solcast_cache_v1'

export async function fetchWeather() {
  const cached = localStorage.getItem(MB_KEY)
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached)
      if (Date.now() - timestamp < METEOBLUE_CACHE_TTL_MS) return data
    } catch {}
  }
  const url = `${METEOBLUE_URL}?lat=${STATION.lat}&lon=${STATION.lon}&apikey=${METEOBLUE_KEY}&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Meteoblue HTTP ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error_message || 'Meteoblue error')
  try { localStorage.setItem(MB_KEY, JSON.stringify({ timestamp: Date.now(), data })) } catch {}
  return data
}

export async function fetchSolcast() {
  const headers = SOLCAST_API_KEY ? { Authorization: `Bearer ${SOLCAST_API_KEY}` } : {}
  const cached = localStorage.getItem(SC_KEY)
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached)
      if (Date.now() - timestamp < SOLCAST_CACHE_TTL_MS) return data
    } catch {}
  }
  if (!SOLCAST_API_KEY) return null
  const url = `https://api.solcast.com.au/rooftop_sites/${SOLCAST_SITE}/forecasts?format=json&hours=72`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    console.warn(`Solcast HTTP ${res.status}(using Solcast cache if available)`)
    return cached ? JSON.parse(cached).data : null
  }
  const data = await res.json()
  try { localStorage.setItem(SC_KEY, JSON.stringify({ timestamp: Date.now(), data })) } catch {}
  return data
}

export function clearMeteoblue() { try { localStorage.removeItem(MB_KEY) } catch {} }
export function clearSolcast() { try { localStorage.removeItem(SC_KEY) } catch {} }
