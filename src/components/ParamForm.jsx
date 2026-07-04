export default function ParamForm({ params, update, reset }) {
  const fields = [
    { key: 'capacityKw', label: '装机容量 (kWp)', min: 1, max: 100, step: 0.5 },
    { key: 'areaM2', label: '组件面积 (m²)', min: 10, max: 500, step: 1 },
    { key: 'efficiency', label: '组件效率', min: 0.15, max: 0.25, step: 0.01 },
    { key: 'pr', label: '系统效率 PR', min: 0.6, max: 0.95, step: 0.01 },
    { key: 'tempCoeff', label: '温度系数 (/°C)', min: -0.005, max: -0.002, step: 0.0001 }
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12, padding: 16, background: '#1e293b', borderRadius: 12
    }}>
      {fields.map(f => (
        <div key={f.key}>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            {f.label}
          </label>
          <input
            type="number"
            value={params[f.key]}
            min={f.min} max={f.max} step={f.step}
            onChange={e => update(f.key, +e.target.value)}
            style={{
              width: '100%', padding: '6px 8px',
              background: '#0f172a', border: '1px solid #334155',
              borderRadius: 6, color: '#e2e8f0', fontSize: 14
            }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button
          onClick={reset}
          style={{
            padding: '6px 16px', background: '#334155', border: 'none',
            borderRadius: 6, color: '#e2e8f0', cursor: 'pointer', fontSize: 13
          }}
        >
          重置
        </button>
      </div>
    </div>
  )
}
