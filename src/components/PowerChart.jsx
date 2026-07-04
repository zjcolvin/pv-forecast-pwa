import { useState, useCallback } from 'react'

const W = 800, H = 300, PAD = 40
const XTICK_TARGET = 8

function niceMax(v) {
  if (!v || v <= 0) return 100
  const exp = Math.floor(Math.log10(v))
  const base = Math.pow(10, exp)
  const m = v / base
  const step = m > 5 ? 10 : m > 2 ? 5 : m > 1 ? 2 : 1
  return step * base
}

function prettyDate(s) {
  const [d, t] = s.split(' ')
  return `${d.slice(5)} ${t.slice(0,2)}h`
}

export default function PowerChart({ data, height = 300, showSolcast = false }) {
  const [mouse, setMouse] = useState({ idx: null, x: 0, y: 0 })

  const onMove = useCallback((e) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    const y = ((e.clientY - rect.top) / rect.height) * H
    const xStep = (W - PAD * 2) / Math.max(data.length - 1, 1)
    const idx = Math.round((x - PAD) / xStep)
    if (idx >= 0 && idx < data.length) {
      setMouse({ idx, x, y })
    } else {
      setMouse(m => ({ ...m, idx: null }))
    }
  }, [data.length])

  const onLeave = useCallback(() => setMouse({ idx: null, x: 0, y: 0 }), [])

  if (!data.length) return null

  const leftMax = niceMax(Math.max(...data.map(d => d.ghi)))
  const rightVals = [...data.map(d => d.powerKw), ...data.map(d => d.temperature || 0)]
  if (showSolcast && data[0] && data[0].solcastKw != null)
    rightVals.push(...data.map(d => d.solcastKw || 0))
  const rightMax = niceMax(Math.max(...rightVals))

  const xStep = (W - PAD * 2) / Math.max(data.length - 1, 1)
  const xAt = i => PAD + i * xStep
  const yLeft = v => H - PAD - (v / leftMax) * (H - PAD * 2)
  const yRight = v => H - PAD - (v / rightMax) * (H - PAD * 2)

  const yTicks = 5
  const leftTicks = Array.from({ length: yTicks + 1 }, (_, i) => (leftMax * i) / yTicks)
  const rightTicks = Array.from({ length: yTicks + 1 }, (_, i) => (rightMax * i) / yTicks)
  const xTickEvery = Math.max(1, Math.floor(data.length / XTICK_TARGET))

  const powerPoints = data.map((d, i) => ({ x: xAt(i), y: yRight(d.powerKw) }))
  const powerLine = powerPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const powerArea = `M${powerPoints[0].x},${H - PAD} ${powerPoints.map(p => `L${p.x},${p.y}`).join(' ')} L${powerPoints[powerPoints.length - 1].x},${H - PAD} Z`

  const tempLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yRight(d.temperature || 0)}`).join(' ')

  let solcastLine = ''
  if (showSolcast && data[0] && data[0].solcastKw != null) {
    solcastLine = data.map((d, i) => {
      if (d.solcastKw == null) return ''
      return `${i === 0 ? 'M' : 'L'}${xAt(i)},${yRight(d.solcastKw)}`
    }).filter(Boolean).join(' ')
  }

  const p = mouse.idx != null ? data[mouse.idx] : null

  return (
    <div style={{ position: 'relative', width: '100%', height, userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ display: 'block', cursor: 'crosshair' }}
        aria-label="发电曲线图"
        role="img"
      >
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity=".35" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity=".03" />
          </linearGradient>
        </defs>

        {leftTicks.map((_, i) => {
          const y = H - PAD - (H - PAD * 2) * i / yTicks
          return <line key={i} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#1e293b" strokeWidth="1" />
        })}

        {leftTicks.map((t, i) => {
          const y = H - PAD - (H - PAD * 2) * i / yTicks
          return <text key={i} x={PAD - 6} y={y + 3} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(t)}</text>
        })}

        {rightTicks.map((t, i) => {
          const y = H - PAD - (H - PAD * 2) * i / yTicks
          return <text key={i} x={W - PAD + 6} y={y + 3} fontSize="10" fill="#94a3b8" textAnchor="start">{Math.round(t)}</text>
        })}

        {data.map((d, i) => {
          const x = xAt(i)
          const w = Math.max(1, xStep * .55)
          const y = yLeft(d.ghi)
          return <rect key={i} x={x - w / 2} y={y} width={w} height={Math.max(0, H - PAD - y)} fill="#facc15" opacity=".4" rx="1" />
        })}

        <path d={powerArea} fill="url(#pg)" />
        <path d={powerLine} stroke="#22c55e" strokeWidth="2" fill="none" />

        {tempLine && <path d={tempLine} stroke="#fb923c" strokeWidth="1.5" fill="none" opacity=".85" />}

        {solcastLine && <path d={solcastLine} stroke="#a78bfa" strokeWidth="2" fill="none" strokeDasharray="4 2" opacity=".9" />}

        {data.map((d, i) => {
          if (i % xTickEvery !== 0) return null
          return <text key={i} x={xAt(i)} y={H - 8} fontSize="10" fill="#64748b" textAnchor="middle">{prettyDate(d.timeLabel)}</text>
        })}

        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#475569" />
        <line x1={W - PAD} y1={PAD} x2={W - PAD} y2={H - PAD} stroke="#475569" />

        {mouse.idx != null && (
          <>
            <line x1={xAt(mouse.idx)} y1={PAD} x2={xAt(mouse.idx)} y2={H - PAD} stroke="#64748b" strokeDasharray="3 2" />
            <circle cx={xAt(mouse.idx)} cy={yRight(p.powerKw)} r="4" fill="#22c55e" stroke="#0f172a" strokeWidth="2" />
            {p.temperature != null && <circle cx={xAt(mouse.idx)} cy={yRight(p.temperature)} r="3" fill="#fb923c" stroke="#0f172a" strokeWidth="1" />}
          </>
        )}
      </svg>

      {p && (
        <div style={{
          position: 'absolute',
          left: Math.min(Math.max(mouse.x - 50, 10), W - 160),
          top: 6,
          pointerEvents: 'none',
          background: '#0f172a',
          border: '1px solid #475569',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          lineHeight: 1.6,
          boxShadow: '0 4px 12px rgba(0,0,0,.4)'
        }}>
          <div style={{ color: '#94a3b8' }}>{p.timeLabel}</div>
          <div style={{ color: '#22c55e' }}>Meteoblue {p.powerKw} kW</div>
          {solcastLine && <div style={{ color: '#a78bfa' }}>Solcast {p.solcastKw} kW</div>}
          <div style={{ color: '#facc15' }}>GHI {p.ghi} W/m²</div>
          <div style={{ color: '#fb923c' }}>气温 {p.temperature}°C</div>
          {p.precipitation > 0 && <div style={{ color: '#60a5fa' }}>降水 {p.precipitation} mm</div>}
        </div>
      )}
    </div>
  )
}
