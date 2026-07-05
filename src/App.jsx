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

// 数据源徽章组件
function SourceBadge({ source, size = 'sm' }) {
  const colors = {
    meteoblue: { bg: '#2563eb22', fg: '#60a5fa', border: '#3b82f6' },
    solcast: { bg: '#7c3aed22', fg: '#a78bfa', border: '#8b5cf6' },
    calc: { bg: '#05966922', fg: '#4ade80', border: '#10b981' }
  }
  const c = colors[source] || colors.meteoblue
  const fontSize = size === 'sm' ? 8 : 9
  const label = source === 'meteoblue' ? 'MB' : source === 'solcast' ? 'SC' : '计算'
  return (
    <span style={{
      display: 'inline-block',
      fontSize,
      padding: '1px 4px',
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.border}`,
      borderRadius: 3,
      marginLeft: 4,
      fontWeight: 600
    }}>
      {label}
    </span>
  )
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
    const resetAt = new Date(now)
    resetAt.setUTCHours(24, 0, 0, 0)
    const lastReset = new Date(now)
    lastReset.setUTCHours(0, 0, 0, 0)

    let mb = 0, sc = 0
    try {
      const m = JSON.parse(localStorage.getItem('meteoblue_cache_v1') || '{}')
      if (m?.timestamp > lastReset.getTime()) mb = 1
    } catch {}
    try {
      const s = JSON.parse(localStorage.getItem('solcast_cache_v1') || '{}')
      if (s?.timestamp > lastReset.getTime()) sc = 1
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

      try {
        const sc = await fetchSolcast()
        setSolcastData(sc)
        setSolcastStatus(sc ? `✓ Solcast loaded(${sc.forecasts?.length || 0})` : 'No Solcast data')
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

  const dailySolcast = solcastData?.forecasts?.length
    ? days.map(day => {
        let total = 0
        const dayPrefix = day.date.slice(0, 10)
        for (const f of solcastData.forecasts) {
          if ((f.period_end || '').startsWith(dayPrefix)) {
            total += (f.pv_estimate || 0) * 0.5
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
                {updatedAt && ` · MB 更新于 ${updatedAt}`}
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

        {/* Data source legend */}
        <div style={{
          background: '#1e293b', borderRadius: 10, padding: '10px 14px',
          marginBottom: 12, display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8',
          flexWrap: 'wrap'
        }}>
          <strong style={{ color: '#e2e8f0' }}>数据来源图例:</strong>
          <span><span style={{ display:'inline-block', width:8, height:8, background:'#3b82f6', borderRadius:'50%', marginRight:4 }}></span>Meteoblue(气象+辐照)</span>
          <span><span style={{ display:'inline-block', width:8, height:8, background:'#10b981', borderRadius:'50%', marginRight:4 }}></span>发电量(应用公式计算)</span>
          <span><span style={{ display:'inline-block', width:8, height:8, background:'#8b5cf6', borderRadius:'50%', marginRight:4 }}></span>Solcast(独立发电预测)</span>
        </div>

        {/* Usage stats */}
        <div style={{
          background: '#0f172a', borderRadius: 8, padding: '6px 14px',
          marginBottom: 16, display: 'flex', gap: 16, fontSize: 11, color: '#64748b',
          border: '1px solid #1e293b'
        }}>
          <span>MB <strong style={{ color: '#fbbf24' }}>{usage.meteoblue}</strong>/10</span>
          <span>SC <strong style={{ color: '#a78bfa' }}>{usage.solcast}</strong>/30</span>
          <span style={{ marginLeft: 'auto' }}>重置 {usage.resetAt}</span>
          {solcastStatus && (
            <span style={{ color: solcastStatus.startsWith('✓') ? '#4ade80' : '#f87171' }}>
              {solcastStatus}
            </span>
          )}
        </div>

        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8
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

                  {/* 气温 - Meteoblue */}
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6 }}>
                    最高 <strong>{days[selectedDay].tMax}°C</strong> · 最低 <strong>{days[selectedDay].tMin}°C</strong>
                    <SourceBadge source="meteoblue" />
                  </div>

                  {/* 日出日落 - Meteoblue */}
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    <span style={{ color: '#fbbf24' }}>☀ {fmtHour(days[selectedDay].sunrise)}</span>
                    {' → '}
                    <span style={{ color: '#fb923c' }}>☾ {fmtHour(days[selectedDay].sunset)}</span>
                    <span style={{ color: '#94a3b8', marginLeft: 8 }}>{days[selectedDay].daylightHours}h 日照</span>
                    <SourceBadge source="meteoblue" />
                  </div>

                  {/* 降水 - Meteoblue */}
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    {days[selectedDay].precip > 0
                      ? <>💧 降水 <strong style={{ color: '#60a5fa' }}>{days[selectedDay].precip} mm</strong> · 最高概率 <strong style={{ color: '#60a5fa' }}>{days[selectedDay].precipProbMax}%</strong></>
                      : <span style={{ color: '#475569' }}>无降水</span>
                    }
                    <SourceBadge source="meteoblue" />
                  </div>

                  {/* 风速湿度 */}
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    风速 <strong>{days[selectedDay].meanWind} m/s</strong> · 湿度 <strong>{days[selectedDay].meanHum}%</strong>
                    <SourceBadge source="meteoblue" />
                  </div>

                  {/* 天气状况 */}
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    峰值 GHI {days[selectedDay].peakGhi} W/m²
                    <SourceBadge source="meteoblue" />
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: 140 }}>
                  {/* 计算发电量 - 我们的物理模型 */}
                  <div>
                    <div style={{ fontSize: 11, color: '#4ade80' }}>估算发电<SourceBadge source="calc" /></div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#4ade80' }}>
                      {dailyPv[selectedDay]}
                      <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}> kWh</span>
                    </div>
                  </div>

                  {/* Solcast 对比 - Solcast 原始数据 */}
                  {dailySolcast[selectedDay] > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#a78bfa' }}>Solcast 预测<SourceBadge source="solcast" /></div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#a78bfa' }}>
                        {dailySolcast[selectedDay]}
                        <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}> kWh</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                        {dailyPv[selectedDay] > 0
                          ? `偏差 ${((dailySolcast[selectedDay] / dailyPv[selectedDay] - 1) * 100).toFixed(0)}%`
                          : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <HourlyStrip day={days[selectedDay]} params={params} solcastData={solcastData} />
          </div>
        )}

        {/* Weekly summary */}
        <div style={{
          background: '#1e293b', borderRadius: 12, padding: '14px 16px',
          marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#4ade80' }}>估算发电<SourceBadge source="calc" /></div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>
              {totalWeekKwh.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400 }}>kWh</span>
            </div>
          </div>
          {totalWeekSolcast > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#a78bfa' }}>Solcast 预测<SourceBadge source="solcast" /></div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>
                {totalWeekSolcast.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400 }}>kWh</span>
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>日均(估算)</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {days.length ? (totalWeekKwh / days.length).toFixed(1) : '--'} <span style={{ fontSize: 12, fontWeight: 400 }}>kWh</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#fbbf24' }}>峰值 GHI<SourceBadge source="meteoblue" /></div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
              {Math.max(...days.map(d => d.peakGhi || 0))} <span style={{ fontSize: 12, fontWeight: 400 }}>W/m²</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#60a5fa' }}>总降水<SourceBadge source="meteoblue" /></div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
              {days.reduce((a, d) => a + d.precip, 0).toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400 }}>mm</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#fbbf24' }}>总日照<SourceBadge source="meteoblue" /></div>
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
