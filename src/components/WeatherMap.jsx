import { useRef, useEffect, useState } from 'react'

const EARTH_R = 6371000
const project = (lat, lon, clat, clon, size) => {
  const dLat = (lat - clat) * Math.PI / 180
  const dLon = (lon - clon) * Math.PI / 180
  const lat1 = clat * Math.PI / 180
  const lat2 = lat * Math.PI / 180
  const x = dLon * Math.cos((lat1 + lat2) / 2) * EARTH_R
  const y = -dLat * EARTH_R
  return {
    x: size / 2 + x,
    y: size / 2 + y
  }
}

const unproject = (px, py, clat, clon, size) => {
  const x = px - size / 2
  const y = py - size / 2
  const dLat = -y / EARTH_R
  const dLon = x / (EARTH_R * Math.cos(clat * Math.PI / 180))
  return {
    lat: clat + dLat * 180 / Math.PI,
    lon: clon + dLon * 180 / Math.PI
  }
}

function GHIcolor(v, max) {
  const t = Math.min(1, Math.max(0, v / (max || 1)))
  if (t < .2) return `rgba(30,41,59,.8)`
  if (t < .4) return `rgba(234,179,8,${.2 + t})`
  if (t < .7) return `rgba(251,146,60,${.3 + t * .5})`
  return `rgba(239,68,68,${.5 + t * .4})`
}

function sunElev(lat, lon, date) {
  const utc = date.getUTCHours() + date.getUTCMinutes() / 60
  const day = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000)
  const decl = 23.45 * Math.sin((360 / 365) * (day - 81) * Math.PI / 180)
  const hra = 15 * (utc + lon / 15 - 12)
  const latR = lat * Math.PI / 180
  const declR = decl * Math.PI / 180
  const hraR = hra * Math.PI / 180
  const sinE = Math.sin(latR) * Math.sin(declR) + Math.cos(latR) * Math.cos(declR) * Math.cos(hraR)
  return Math.asin(Math.max(-1, Math.min(1, sinE))) * 180 / Math.PI
}

export default function WeatherMap({ meteoRaw, selectedTimeIdx, onSelectTime, params, summaryKw }) {
  const canvasRef = useRef(null)
  const SIZE = 400
  const rangeKm = 60
  const [hover, setHover] = useState(null)
  const gridPoints = useRef([])
  const metadata = meteoRaw?.metadata || {}
  const clat = metadata.latitude || 0
  const clon = metadata.longitude || 0

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !clat || !clon) return
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, SIZE, SIZE)

    // Background: day/night band
    const elev = sunElev(clat, clon, new Date())
    ctx.fillStyle = elev > 0 ? 'rgba(30, 58, 138, .25)' : 'rgba(15, 23, 42, .7)'
    ctx.fillRect(0, 0, SIZE, SIZE)

    // Grid of points
    const N = 14
    const pts = []
    const latStep = (rangeKm / 111) * 2 / N
    const lonStep = (rangeKm / (111 * Math.cos(clat * Math.PI / 180))) * 2 / N

    const tArr = meteoRaw?.data_1h?.time || []
    const ghiArr = meteoRaw?.data_1h?.ghi_instant || []
    const pcpArr = meteoRaw?.data_1h?.precipitation || []

    const curIdx = selectedTimeIdx < tArr.length ? selectedTimeIdx : 0
    const curGhi = ghiArr[curIdx] || 0
    const curPcp = pcpArr[curIdx] || 0

    let maxGhi = 100
    for (let i = 0; i < tArr.length && i < 24; i++) maxGhi = Math.max(maxGhi, ghiArr[i] || 0)

    const curTimeStr = tArr[curIdx] ? tArr[curIdx].slice(5, 16).replace('T', ' ') : ''

    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const lat = clat + (gy - N / 2 + .5) * latStep
        const lon = clon + (gx - N / 2 + .5) * lonStep
        const { x, y } = project(lat, lon, clat, clon, SIZE)

        // Simulate intra-grid variation
        const latFactor = 1 + .04 * Math.sin(gx * 1.3 + curIdx * .3)
        const lonFactor = 1 + .06 * Math.cos(gy * .9 + curIdx * .2)
        const ghi = Math.max(0, curGhi * latFactor * lonFactor)
        const pcp = Math.max(0, curPcp * (1 + .3 * Math.sin(gx + gy + curIdx)))

        pts.push({ x, y, lat, lon, ghi, pcp, gx, gy })
      }
    }
    gridPoints.current = pts

    // Draw points
    const cellSize = SIZE / N
    for (const p of pts) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, cellSize * .42, 0, Math.PI * 2)
      ctx.fillStyle = GHIcolor(p.ghi, maxGhi)
      ctx.fill()
      if (p.pcp > .3) {
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    // Station marker
    const sp = project(clat, clon, clat, clon, SIZE)
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2)
    ctx.fillStyle = '#22c55e'
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('电站', sp.x, sp.y - 14)

    // Scale bar (20km)
    const twentyKmX = project(clat, clon - (20 / (111 * Math.cos(clat * Math.PI / 180))), clat, clon, SIZE).x
    ctx.strokeStyle = '#94a3b8'
    ctx.beginPath()
    ctx.moveTo(sp.x - 30, SIZE - 20)
    ctx.lineTo(sp.x - 30 + (sp.x - twentyKmX), SIZE - 20)
    ctx.stroke()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '9px sans-serif'
    ctx.fillText('20 km', sp.x - 15, SIZE - 24)

    // Title overlay
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '11px sans-serif'
    ctx.fillText(`${curTimeStr}  辐照 ${Math.round(curGhi)} W/m²  降水 ${curPcp.toFixed(1)} mm`, 10, 14)

  }, [clat, clon, selectedTimeIdx, meteoRaw])

  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const sx = (e.clientX - rect.left) * (SIZE / rect.width)
    const sy = (e.clientY - rect.top) * (SIZE / rect.height)
    let nearest = null, dist = 12 * 12
    for (const p of gridPoints.current) {
      const d = (p.x - sx) ** 2 + (p.y - sy) ** 2
      if (d < dist) { dist = d; nearest = p }
    }
    if (nearest) {
      const pw = params.capacityKw > 0 ? Math.min(params.capacityKw, nearest.ghi * params.areaM2 * params.efficiency / 1000 * params.pr) : 0
      setHover({
        lat: nearest.lat.toFixed(3),
        lon: nearest.lon.toFixed(3),
        ghi: Math.round(nearest.ghi),
        pcp: nearest.pcp.toFixed(1),
        kw: pw.toFixed(2),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    } else {
      setHover(null)
    }
  }

  const onClick = () => {
    if (hover) onSelectTime && onSelectTime(selectedTimeIdx)
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: SIZE, margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={{
          width: '100%',
          'aspectRatio': '1 / 1',
          'borderRadius': 8,
          'border': '1px solid #334155',
          'cursor': 'crosshair'
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
      />
      {hover && (
        <div style={{
          position: 'absolute',
          left: Math.min(hover.x + 10, SIZE - 120),
          top: Math.max(hover.y - 60, 4),
          pointerEvents: 'none',
          background: '#0f172a',
          border: '1px solid #475569',
          borderRadius: 6,
          padding: '5px 8px',
          fontSize: 11,
          lineHeight: 1.4
        }}>
          <div style={{ color: '#94a3b8' }}>{hover.lat}, {hover.lon}</div>
          <div style={{ color: '#facc15' }}>☀ {hover.ghi} W/m²</div>
          <div style={{ color: '#22c55e' }}>⚡ ~{hover.kw} kW</div>
          {+hover.pcp > 0 && <div style={{ color: '#60a5fa' }}>💧 {hover.pcp} mm</div>}
        </div>
      )}
    </div>
  )
}
