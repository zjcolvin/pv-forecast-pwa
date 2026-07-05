import { useState, useEffect, useCallback } from 'react'
import { fetchWeather, fetchSolcast } from './lib/api.js'
import { aggregateDaily } from './lib/aggregation.js'
import { alignSolcast, summarize } from './lib/pvCalc.js'
import { calcPower } from './lib/pvCalc.js'
import { useStationParams } from './hooks/useStationParams.js'
import { usePullToRefresh } from './hooks/usePullToRefresh.jsx'
import ForecastCard from './components/ForecastCard.jsx'
import HourlyStrip from './components/HourlyStrip.jsx'
import ParamForm from './components/ParamForm.jsx'
import { STATION, SOLCAST_SITE } from './lib/constants.js'

function fmtHour(h) {
  if (h == null) return '--'
  const hh = String(Math.floor(h)).padStart(2, '0')
  const mm = String(Math.round((h % 1) * 60)).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function App() {
  const { params, update, reset } = useStationParams()
  const [raw, setRaw] = useState(null)
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [solcastData, setSolcastData] = useState(null)
  const [solcastStatus, setSolcastStatus] = useState('')
  const [usage, setUsage] = useState({ meteoblue: 0, solcast: 0, resetAt: '' })

  const loadUsageStats = useCallback(() => {
    const now = new Date()
    // Find previous UTC midnight
    const resetAt = new Date(now)
    resetAt.setUTCHours(24, 0, 0, 0)
    const lastReset = new Date(now)
    lastReset.setUTCHours(0, 0, 0, 0)

    // Count calls from localStorage markers
    const mbRaw = localStorage.getItem('meteoblue_cache_v1')
    const scRaw = localStorage.getItem('solcast_cache_v1')
    let mb = 0, sc = 0
    try {
      const m = mbRaw ? JSON.parse(mbRaw) : null
      if (m?.timestamp && m.timestamp > lastReset.getTime()) mb = 1
    } catch {}
    try {
      const s = scRaw ? JSON.parse(scRaw) : null
      if (s?.timestamp && s.timestamp > lastReset.getTime()) sc = 1
    } catch {}
    setUsage({
      meteoblue: mb,
      solcast: sc,
      resetAt: resetAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    })
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const mb = await fetchWeather()
      setRaw(mb)
      setUpdatedAt(mb.metadata?.modelrun_updatetime_utc || null)
      setDays(aggregateDaily(mb))

      // Solcast auto-load(won't fail main app if fails)
      try {
        const sc = await fetchSolcast()
        setSolcastData(sc)
        setSolcastStatus(sc ? `✓ Solcast loaded(${sc.forecasts?.length || 0} values)` : 'No Solcast data')
      } catch (e) {
        setSolcastStatus('Solcast unavailable:' + e.message)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      loadUsageStats()
    }
  }, [loadUsageStats])

  const { pullIndicator } = usePullToRefresh(loadAll)

  useEffect(() => { loadAll() }, [loadAll])

  const dailyPv = days.map(day => {
    let total = 0
    for (const h of day.hours) total += calcPower(h.ghi, h.temp, params)
    return +total.toFixed(1)
  })

  // Compute Solcast daily totals(if available)
  const dailySolcast = solcastData?.forecasts?.length
    ? days.map(day => {
        let total = 0
        const dayPrefix = day.date.slice(0, 10)
        for (const f of solcastData.forecasts) {
          if ((f.period_end || '').startsWith(dayPrefix)) {
            total += (f.pv_estimate || 0) * 0.5 // per 30min → kWh
          }
        }
        return +total.toFixed(1)
      })
    : []

  const totalWeekKwh = dailyPv.reduce((a, b) => a + b, 0)
  const totalWeekSolcast = dailySolcast.reduce((a, b) => a + b, 0)

  return (
    <>
      {pullIndicator}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 16px 32px' }}>
        <header style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                ☀️ {STATION.name} 天气预报
              </h1>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {STATION.lat.toFixed(3)}°N, {STATION.lon.toFixed(3)}°E
                {updatedAt && ` · Meteoblue 更新于 ${updatedAt}`}
              </div>
            </div>
            <button
              onClick={loadAll}
              disabled={loading}
              style={{
                padding: '8px 18px', background: '#3b82f6', border: 'none',
                borderRadius: 8, color: '#fff', fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', fontSize: 13
              }}
            >
              {loading ? '加载中...' : '刷新'}
            </button>
          </div>
        </header>

        {error && (
          <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Usage stats */}
        <div style={{
          background: '#1e293b', borderRadius: 10, padding: '8px 14px',
          marginBottom: 16, display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8'
        }}>
          <div>
            <strong style={{ color: '#fbbf24' }}>{usage.meteoblue}</strong>/10 Meteoblue
          </div>
          <div>
            <strong style={{ color: '#a78bfa' }}>{usage.solcast}</strong>/30 Solcast
          </div>
          <div style={{ marginLeft: 'auto' }}>
            今日重置 {usage.resetAt}
          </div>
          {solcastStatus && (
            <div style={{ color: solcastStatus.startsWith('✓') ? '#4ade80' : '#f87171' }}>
              {solcastStatus}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8,
          scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent'
        }}>
          {days.map((day, i) => (
            <div key={day.date} onClick={() => setSelectedDay(i)} style={{ cursor: 'pointer' }}>
              <ForecastCard day={day} isToday={i === 0} pvKwh={dailyPv[i]} solcastKwh={dailySolcast[i]} />
            </div>
          ))}
        </div>

        {days[selectedDay] && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              background: '#1e293b', borderRadius: 12, padding: '14px 16px',
              marginBottom: 12
            }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {selectedDay === 0 ? '今天' : days[selectedDay].dayName}
                    <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
                      {days[selectedDay].date}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6 }}>
                    最高 <strong>{days[selectedDay].tMax}°C</strong> · 最低 <strong>{days[selectedDay].tMin}°C</strong>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    <span style={{ color: '#fbbf24' }}>☀ {fmtHour(days[selectedDay].sunrise)}</span>
                    {' → '}
                    <span style={{ color: '#fb923c' }}>☾ {fmtHour(days[selectedDay].sunset)}</span>
                    <span style={{ color: '#94a3b8', marginLeft: 8 }}>{days[selectedDay].daylightHours}h 日照</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    {days[selectedDay].precip > 0
                      ? <>💧 降水 <strong style={{ color: '#60a5fa' }}>{days[selectedDay].precip} mm</strong> · 最高概率 <strong style={{ color: '#60a5fa' }}>{days[selectedDay].precipProbMax}%</strong></>
                      : <span style={{ color: '#475569' }}>无降水</span>
                    }
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    风速 {days[selectedDay].meanWind} m/s · 湿度 {days[selectedDay].meanHum}%
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: '#4ade80' }}>当日发电</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#4ade80' }}>
                    {dailyPv[selectedDay]}
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}> kWh</span>
                  </div>
                  {dailySolcast[selectedDay] > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 8 }}>Solcast 估算</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>
                        {dailySolcast[selectedDay]}
                        <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}> kWh</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                        {dailyPv[selectedDay] > 0 && dailySolcast[selectedDay] > 0
                          ? `(${((dailySolcast[selectedDay] / dailyPv[selectedDay] - 1) * 100).toFixed(0)}% 偏差)`
                          : ''}
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    峰值 GHI {days[selectedDay].peakGhi} W/m²
                  </div>
                </div>
              </div>
            </div>

            <HourlyStrip day={days[selectedDay]} params={params} solcastData={solcastData} />
          </div>
        )}

        <div style={{
          background: '#1e293b', borderRadius: 12, padding: '14px 16px',
          marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>本周发电</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>
              {totalWeekKwh.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400 }}>kWh</span>
            </div>
          </div>
          {totalWeekSolcast > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#a78bfa' }}>Solcast 本周</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>
                {totalWeekSolcast.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400 }}>kWh</span>
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>日均</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {days.length ? (totalWeekKwh / days.length).toFixed(1) : '--'} <span style={{ fontSize: 12, fontWeight: 400 }}>kWh</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>峰值 GHI</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
              {Math.max(...days.map(d => d.peakGhi || 0))} <span style={{ fontSize: 12, fontWeight: 400 }}>W/m²</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>总降水</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
              {days.reduce((a, d) => a + d.precip, 0).toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400 }}>mm</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>总日照</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
              {days.reduce((a, d) => a + (d.daylightHours || 0), 0).toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400 }}>h</span>
            </div>
          </div>
        </div>

        <details style={{ marginTop: 16 }}>
          <summary style={{
            cursor: 'pointer', fontSize: 13, color: '#94a3b8', padding: '8px 0',
            userSelect: 'none'
          }}>
            ⚙️ 电站参数(点击展开)
          </summary>
          <div style={{ padding: '8px 0' }}>
            <ParamForm params={params} update={update} reset={reset} />
          </div>
        </details>
      </div>
    </>
  )
}
