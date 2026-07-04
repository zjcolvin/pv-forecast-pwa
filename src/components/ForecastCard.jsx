import { weatherIcon, weatherLabel } from './WeatherIcon.jsx'

export default function ForecastCard({ day, isToday, pvKwh }) {
  const icon = weatherIcon(day.code)
  const sunrise = day.sunrise != null ? `${String(Math.floor(day.sunrise)).padStart(2,'0')}:${String(Math.round((day.sunrise%1)*60)).padStart(2,'0')}` : '--'
  const sunset = day.sunset != null ? `${String(Math.floor(day.sunset)).padStart(2,'0')}:${String(Math.round((day.sunset%1)*60)).padStart(2,'0')}` : '--'

  return (
    <div style={{
      background: isToday ? 'linear-gradient(135deg, #1e3a8a, #1e293b)' : '#1e293b',
      borderRadius: 14,
      padding: '12px 10px',
      border: isToday ? '1px solid #3b82f6' : '1px solid #334155',
      textAlign: 'center',
      flex: '1 1 70px',
      minWidth: 62
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: isToday ? '#60a5fa' : '#e2e8f0', marginBottom: 2 }}>
        {isToday ? '今天' : day.dayName}
      </div>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
        {day.date.slice(5)}
      </div>
      <div style={{ width: 28, height: 28, margin: '0 auto 4px', color: isToday ? '#fbbf24' : '#94a3b8' }}>
        {icon}
      </div>
      <div style={{ fontSize: 10, color: '#cbd5e1', minHeight: 24, marginBottom: 4, lineHeight: 1.3 }}>
        {weatherLabel(day.code)}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
        {day.tMax}°
        <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}> / {day.tMin}°</span>
      </div>

      <div style={{
        marginTop: 6, padding: '4px 2px', background: 'rgba(250,204,21,.08)', borderRadius: 6,
        fontSize: 10, color: '#fbbf24'
      }}>
        ☀ {sunrise}-{sunset}
        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
          {day.daylightHours}h 日照
        </div>
      </div>

      <div style={{ marginTop: 4, fontSize: 10 }}>
        {day.precipProbMax > 0 ? (
          <div style={{ color: '#60a5fa' }}>
            💧 {day.precipProbMax}% <span style={{ color: '#94a3b8' }}>/ {day.precip}mm</span>
          </div>
        ) : (
          <div style={{ color: '#475569' }}>无降水</div>
        )}
      </div>

      {pvKwh > 0 && (
        <div style={{
          fontSize: 9, color: '#4ade80', marginTop: 5,
          padding: '2px 4px', background: 'rgba(34,197,94,.1)', borderRadius: 4
        }}>
          ⚡ {pvKwh} kWh
        </div>
      )}
    </div>
  )
}
