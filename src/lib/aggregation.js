const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

export function aggregateDaily(raw) {
  if (!raw?.data_1h) return []

  const { time, temperature, precipitation, windspeed, ghi_instant,
          precipitation_probability, pictocode, relativehumidity, isdaylight } = raw.data_1h

  const days = new Map()

  // 1. Load daily summary if available(from basic-day package)
  const dailySummary = new Map()
  if (raw.data_day) {
    const dd = raw.data_day
    if (dd.time) {
      for (let i = 0; i < dd.time.length; i++) {
        const key = dd.time[i]
        dailySummary.set(key, {
          pictocode: dd.pictocode?.[i],
          tempMax: dd.temperature_max?.[i] ?? dd.temperature_max_2m?.[i],
          tempMin: dd.temperature_min?.[i] ?? dd.temperature_min_2m?.[i],
          precipitation: dd.precipitation?.[i],
          precipProbability: dd.precipitation_probability?.[i],
          windspeed: dd.windspeed_10m_max?.[i],
          isdaylightPerDay: dd.sunshine_time?.[i],
          sunrise: dd.sunrise?.[i],
          sunset: dd.sunset?.[i]
        })
      }
    }
  }

  // 2. Process hourly for daily aggregation
  for (let i = 0; i < time.length; i++) {
    const dayKey = time[i].slice(0, 10)
    const hour = +time[i].slice(11, 13)
    const isDay = isdaylight?.[i] === 1

    if (!days.has(dayKey)) {
      const date = new Date(dayKey + 'T00:00:00')
      days.set(dayKey, {
        date: dayKey,
        dayName: '周' + DAY_NAMES[date.getDay()],
        hours: [],
        tMin: Infinity, tMax: -Infinity,
        ghiTotal: 0, dayGhiTotal: 0,
        precip: 0, precipProbMax: 0, precipProbMean: 0, precipProbCount: 0,
        codes: [], windSpeed: [], windDir: [],
        humMean: [],
        sunrise: null, sunset: null,
        daylightHours: 0
      })
    }

    const day = days.get(dayKey)
    day.hours.push({ i, hour, ghi: ghi_instant?.[i] || 0, temp: temperature?.[i] ?? null,
                      rain: precipitation?.[i] || 0, code: pictocode?.[i] || 0,
                      wind: windspeed?.[i] ?? 0, precipProb: precipitation_probability?.[i] || 0 })
    day.tMin = Math.min(day.tMin, temperature?.[i] ?? 99)
    day.tMax = Math.max(day.tMax, temperature?.[i] ?? -99)
    day.precip = +(day.precip + (precipitation?.[i] || 0)).toFixed(1)
    day.precipProbMax = Math.max(day.precipProbMax, precipitation_probability?.[i] || 0)
    if (precipitation_probability?.[i] != null) {
      day.precipProbMean += precipitation_probability[i]
      day.precipProbCount++
    }
    if (pictocode?.[i]) day.codes.push(pictocode[i])
    if (windspeed?.[i] != null) day.windSpeed.push(windspeed[i])
    if (relativehumidity?.[i] != null) day.humMean.push(relativehumidity[i])
    if (isDay) {
      day.dayGhiTotal += (ghi_instant?.[i] || 0)
      day.daylightHours++
    }
    day.ghiTotal += (ghi_instant?.[i] || 0)

    if (isDay && day.sunrise === null) day.sunrise = hour
    if (!isDay && day.sunrise != null && day.sunset === null && hour > day.sunrise) day.sunset = hour
  }

  // 3. Apply daily summary(override hourly aggregation where available)
  for (const day of days.values()) {
    const ds = dailySummary.get(day.date)
    if (ds) {
      // Prefer daily pictocode(Meteoblue official 7-day overview value)
      if (ds.pictocode) day.code = ds.pictocode
      // Override temperatures with daily summary
      if (ds.tempMax != null) day.tMax = Math.round(ds.tempMax)
      if (ds.tempMin != null) day.tMin = Math.round(ds.tempMin)
      if (ds.precipitation != null) day.precip = +(ds.precipitation).toFixed(1)
      if (ds.precipProbability != null) day.precipProbMax = ds.precipProbability
      if (ds.windspeed != null) day.meanWind = +ds.windspeed.toFixed(1)
      if (ds.sunrise != null) day.sunrise = ds.sunrise
      if (ds.sunset != null) day.sunset = ds.sunset
      if (ds.isdaylightPerDay != null) day.daylightHours = Math.round(ds.isdaylightPerDay / 60)
    }

    // Fallback:if no daily summary, compute most frequent hourly code
    if (!day.code) {
      const counts = new Map()
      for (const c of day.codes) counts.set(c, (counts.get(c) || 0) + 1)
      let best = 0, bestCount = 0
      for (const [c, n] of counts) if (n > bestCount) { best = c; bestCount = n }
      day.code = best
    }

    day.tMin = day.tMin === Infinity ? '--' : Math.round(day.tMin)
    day.tMax = day.tMax === -99 ? '--' : Math.round(day.tMax)
    if (!day.meanWind) {
      day.meanWind = day.windSpeed.length
        ? Math.round((day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length) * 10) / 10
        : '--'
    }
    day.meanHum = day.humMean.length
      ? Math.round(day.humMean.reduce((a, b) => a + b, 0) / day.humMean.length)
      : '--'
    day.peakGhi = Math.round(Math.max(...day.hours.map(h => h.ghi)))
    day.precipProbMean = day.precipProbCount ? Math.round(day.precipProbMean / day.precipProbCount) : 0

    if (day.sunrise != null && day.sunset != null) {
      day.dayHours = day.hours.filter(h => h.hour >= day.sunrise && h.hour < day.sunset)
    } else if (day.sunrise != null) {
      day.dayHours = day.hours.filter(h => h.hour >= day.sunrise)
    } else {
      day.dayHours = day.hours
    }
  }

  return [...days.values()]
}
