import { useState } from 'react'
import { weatherIcon, weatherLabel } from './WeatherIcon.jsx'

function BarIndicator({ value, max, color }) {
  const pct = Math.min(100, (value / (max || 100)) * 100)
  return (
    <div style={{ height: 30, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{
        width: '100%', height: `${Math.max(2, pct * 0.8)}px`,
        background: color, borderRadius: 2, opacity: .7
      }}/>
    </div>
  )
}

export default function HourlyStrip({ day, params, solcastData }) {
  const [sel, setSel] = useState(null)
  const hours = day.dayHours || day.hours

  if (!hours || !hours.length) {
    return <div style={{ color: '#64748b', padding: 12, fontSize: 12 }}>无白天时段数据</div>
  }

  const handleClick = (h) => {
    setSel(h.i)
  }

  const peakGhi = Math.max(...hours.map(h => h.ghi), 1)
  const maxKw = params?.capacityKw || 10

  // Build Solcast lookup by hour
  const solMap = new Map()
  if (solcastData?.forecasts) {
    for (const f of solcastData.forecasts) {
      const d = new Date(f.period_end)
      const hour = d.getUTCHours() + 8 // CST
      const dayStr = f.period_end.slice(0, 10)
      const key = `${dayStr}T${String(hour).padStart(2,'0')}`
      if (!solMap.has(key)) solMap.set(key, [])
      solMap.get(key).push(f.pv_estimate || 0)
    }
  }

  return (
    <div style={{
      background: '#1e293b', borderRadius: 12, padding: 12,
      marginTop: 12, overflowX: 'auto'
    }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
        {day.sunrise != null && day.sunset != null
          ? `白天时段 ${String(Math.floor(day.sunrise)).padStart(2,'0')}:${String(Math.round((day.sunrise%1)*60)).padStart(2,'0')} - ${String(Math.floor(day.sunset)).padStart(2,'0')}:${String(Math.round((day.sunset%1)*60)).padStart(2,'0')} (${day.daylightHours}h)`
          : '24小时'
        }
      </div>

      <div style={{ display: 'flex', fontSize: 11, color: '#64748b', marginBottom: 6, paddingLeft: 2 }}>
        <div style={{ width: 90, flexShrink: 0 }}>小时</div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {hours.map((h, i) => (
            <div key={i} style={{ width: 28, textAlign: 'center', color: '#94a3b8' }}>{h.hour}:00</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 6 }}>
        <div style={{ width: 90, flexShrink: 0, color: '#94a3b8' }}>天气</div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {hours.map((h, i) => (
            <div
              key={i}
              onClick={() => handleClick(h)}
              style={{
                width: 28, height: 28, color: '#fbbf24',
                cursor: 'pointer',
                border: sel === h.i ? '1px solid #60a5fa' : '1px solid transparent',
                borderRadius: 4
              }}
            >
              {weatherIcon(h.code)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 6 }}>
        <div style={{ width: 90, flexShrink: 0, color: '#94a3b8' }}>气温</div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {hours.map((h, i) => (
            <div key={i} style={{
              width: 28, textAlign: 'center',
              color: h.temp > 35 ? '#ef4444' : h.temp > 30 ? '#fb923c' : h.temp > 25 ? '#fbbf24' : '#94a3b8'
            }}>
              {Math.round(h.temp || 0)}°
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 6 }}>
        <div style={{ width: 90, flexShrink: 0, color: '#94a3b8' }}>降水概率</div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {hours.map((h, i) => (
            <div key={i} style={{ width: 28, height: 28 }}>
              <BarIndicator value={h.precipProb} max={100} color="#60a5fa" />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 6 }}>
        <div style={{ width: 90, flexShrink: 0, color: '#94a3b8' }}>辐照</div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {hours.map((h, i) => (
            <div key={i} style={{ width: 28, height: 28 }}>
              <BarIndicator value={h.ghi} max={peakGhi} color="#fbbf24" />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 6 }}>
        <div style={{ width: 90, flexShrink: 0, color: '#4ade80' }}>Meteoblue 发电</div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {hours.map((h, i) => {
            const { capacityKw, areaM2, efficiency, pr, tempCoeff } = params
            const dc = h.ghi * areaM2 * efficiency / 1000
            const tf = 1 + tempCoeff * ((h.temp || 25) + 25 - 25)
            const kw = Math.min(capacityKw, Math.max(0, dc * tf * pr))
            return (
              <div key={i} style={{ width: 28, height: 28 }}>
                <BarIndicator value={kw} max={maxKw} color="#4ade80" />
              </div>
            )
          })}
        </div>
      </div>

      {solcastData && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 6 }}>
          <div style={{ width: 90, flexShrink: 0, color: '#a78bfa' }}>Solcast 发电</div>
          <div style={{ display: 'flex', gap: 2, flex: 1 }}>
            {hours.map((h, i) => {
              const key = `${day.date.slice(0,10)}T${String(h.hour).padStart(2,'0')}`
              const arr = solMap.get(key)
              const kw = arr && arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0
              return (
                <div key={i} style={{ width: 28, height: 28 }}>
                  <BarIndicator value={kw} max={maxKw} color="#a78bfa" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sel !== null && (() => {
        const h = hours.find(x => x.i === sel)
        if (!h) return null
        const key = `${day.date.slice(0,10)}T${String(h.hour).padStart(2,'0')}`
        const solArr = solMap.get(key)
        const solKw = solArr && solArr.length ? (solArr.reduce((a,b)=>a+b,0) / solArr.length).toFixed(2) : null
        return (
          <div style={{
            marginTop: 12, padding: '8px 12px', background: '#0f172a', borderRadius: 8,
            fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap'
          }}>
            <div style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#e2e8f0' }}>{h.hour}:00</strong>
              {' '}{weatherLabel(h.code)}
            </div>
            <div>气温 <strong>{Math.round(h.temp || 0)}°C</strong></div>
            <div>GHI <strong>{Math.round(h.ghi)} W/m²</strong></div>
            <div style={{ color: '#60a5fa' }}>降水概率 <strong>{h.precipProb}%</strong></div>
            {h.rain > 0 && <div style={{ color: '#60a5fa' }}>降水量 {h.rain} mm</div>}
            {solKw && <div style={{ color: '#a78bfa' }}>Solcast <strong>{solKw} kW</strong></div>}
          </div>
        )
      })()}
    </div>
  )
}
