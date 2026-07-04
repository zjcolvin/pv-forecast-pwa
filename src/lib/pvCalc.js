import { HOURS_TO_SHOW } from './constants.js'

export function calcPower(ghi, temperature, params) {
  if (!ghi || ghi <= 0) return 0
  const { capacityKw, areaM2, efficiency, pr, tempCoeff } = params
  const dcKw = (ghi * areaM2 * efficiency) / 1000
  const cellTemp = (temperature || 25) + 25
  const tempFactor = 1 + tempCoeff * (cellTemp - 25)
  let acKw = dcKw * tempFactor * pr
  acKw = Math.min(acKw, capacityKw)
  acKw = Math.max(acKw, 0)
  return acKw
}

export function transformMeteoblue(raw, params) {
  if (!raw?.data_1h) return []
  const { time, ghi_instant, temperature, precipitation, clearskyshortwave_instant } = raw.data_1h
  const pts = []
  for (let i = 0; i < time.length && i < HOURS_TO_SHOW; i++) {
    const ghi = ghi_instant?.[i] ?? 0
    const temp = temperature?.[i] ?? 25
    pts.push({
      time: time[i],
      timeLabel: time[i].slice(5, 16),
      ghi,
      temperature: temp,
      precipitation: precipitation?.[i] ?? 0,
      clearsky: clearskyshortwave_instant?.[i] ?? 0,
      powerKw: +calcPower(ghi, temp, params).toFixed(3)
    })
  }
  return pts
}

export function alignSolcast(meteoPts, solcastRaw) {
  if (!solcastRaw?.forecasts) return meteoPts
  const map = new Map()
  for (const f of solcastRaw.forecasts) {
    const t = (f.period_end || '').slice(0, 13).replace('T', ' ')
    map.set(t, +((f.pv_estimate ?? 0)).toFixed(3))
  }
  return meteoPts.map(p => {
    const key = p.time.slice(0, 13)
    const sc = map.get(key)
    return sc != null ? { ...p, solcastKw: sc } : p
  })
}

export function summarize(points, params) {
  if (!points.length) return { totalKwh: 0, peakKw: 0, peakHour: '-', sunnyHours: 0, solcastKwh: 0 }
  const totalKwh = points.reduce((s, p) => s + p.powerKw, 0)
  const peak = points.reduce((m, p) => p.powerKw > m.powerKw ? p : m, points[0])
  const sunnyHours = points.filter(p => p.ghi > 100).length
  const solcastKwh = points.reduce((s, p) => s + (p.solcastKw ?? 0), 0)
  return {
    totalKwh: +totalKwh.toFixed(1),
    peakKw: +peak.powerKw.toFixed(2),
    peakHour: peak.timeLabel,
    sunnyHours,
    solcastKwh: +solcastKwh.toFixed(1)
  }
}
