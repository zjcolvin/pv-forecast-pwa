export default function Summary({ summary, params }) {
  const { totalKwh, peakKw, peakHour, sunnyHours, solcastKwh } = summary
  const capacityFactor = params.capacityKw > 0
    ? ((totalKwh / 72) / params.capacityKw * 100).toFixed(1)
    : 0

  const cards = [
    { label: '72h 总发电', value: `${totalKwh} kWh`, color: '#22c55e' },
    { label: '峰值功率', value: `${peakKw} kW`, color: '#facc15' },
    { label: '峰值时刻', value: peakHour || '--', color: '#60a5fa' },
    { label: '有效日照', value: `${sunnyHours} h`, color: '#f97316' },
    { label: '容量因子', value: `${capacityFactor}%`, color: '#a78bfa' }
  ]

  if (solcastKwh > 0) {
    cards.push({
      label: 'Solcast 发电',
      value: `${solcastKwh} kWh`,
      color: '#ec4899'
    })
    const diff = solcastKwh - totalKwh
    const pct = totalKwh > 0 ? (diff / totalKwh * 100).toFixed(1) : 0
    cards.push({
      label: '差值',
      value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kWh (${pct}%)`,
      color: diff > 0 ? '#22c55e' : '#ef4444'
    })
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
      gap: 10, padding: '12px 0'
    }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: '#1e293b', borderRadius: 10, padding: '10px 12px',
          borderLeft: `3px solid ${c.color}`, minWidth: 0
        }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</div>
          <div style={{ fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}
