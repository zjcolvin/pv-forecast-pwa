import { METEOBLUE_URL, METEOBLUE_KEY, STATION, CACHE_TTL_MS } from './constants.js'

const MB_KEY = 'meteoblue_cache_v1'
const SC_KEY = 'solcast_cache_v1'

export async function fetchWeather() {
  const cached = localStorage.getItem(MB_KEY)
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL_MS) return data
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

const SOLCAST_SITE = '6202-eb4d-032d-dabc'
const SOLCAST_BASE = 'https://api.solcast.com.au/rooftop_sites'

export async function fetchSolcast(apiKey) {
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  const cached = localStorage.getItem(SC_KEY)
  if (cached && !apiKey) {
    try {
      const { timestamp, data } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL_MS) return data
    } catch {}
  }

  if (!apiKey) return null

  const url = `${SOLCAST_BASE}/${SOLCAST_SITE}/forecasts?format=json&hours=72`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Solcast HTTP ${res.status}`)
  const data = await res.json()
  try { localStorage.setItem(SC_KEY, JSON.stringify({ timestamp: Date.now(), data })) } catch {}
  return data
}

export function clearMeteoblue() { try { localStorage.removeItem(MB_KEY) } catch {} }
export function clearSolcast() { try { localStorage.removeItem(SC_KEY) } catch {} }
