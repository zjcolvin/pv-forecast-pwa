import { useState, useEffect } from 'react'
import { DEFAULT_PARAMS } from '../lib/constants.js'

const STORAGE_KEY = 'pv_station_params_v1'

export function useStationParams() {
  const [params, setParams] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_PARAMS
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  }, [params])

  const update = (key, value) => setParams(p => ({ ...p, [key]: value }))
  const reset = () => setParams(DEFAULT_PARAMS)

  return { params, update, reset }
}
