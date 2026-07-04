const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

export function aggregateDaily(raw) {
  if (!raw?.data_1h) return []
  const { time, temperature, precipitation, windspeed, winddirection, ghi_instant,
          precipitation_probability, pictocode, relativehumidity, felttemperature, isdaylight } = raw.data_1h

  const days = new Map()

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
    if (winddirection?.[i] != null) day.windDir.push(winddirection[i])
    if (relativehumidity?.[i] != null) day.humMean.push(relativehumidity[i])
    if (isDay) {
      day.dayGhiTotal += (ghi_instant?.[i] || 0)
      day.daylightHours++
    }
    day.ghiTotal += (ghi_instant?.[i] || 0)

    if (isDay && day.sunrise === null) day.sunrise = hour
    if (!isDay && day.sunrise != null && day.sunset === null && hour > day.sunrise) day.sunset = hour
  }

  for (const day of days.values()) {
    const counts = new Map()
    for (const c of day.codes) counts.set(c, (counts.get(c) || 0) + 1)
    let best = 0, bestCount = 0
    for (const [c, n] of counts) if (n > bestCount) { best = c; bestCount = n }
    day.code = best
    day.tMin = day.tMin === Infinity ? '--' : Math.round(day.tMin)
    day.tMax = day.tMax === -99 ? '--' : Math.round(day.tMax)
    day.meanWind = day.windSpeed.length
      ? Math.round((day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length) * 10) / 10
      : '--'
    day.meanHum = day.humMean.length
      ? Math.round(day.humMean.reduce((a, b) => a + b, 0) / day.humMean.length)
      : '--'
    day.peakGhi = Math.round(Math.max(...day.hours.map(h => h.ghi)))
    day.precipProbMean = day.precipProbCount
      ? Math.round(day.precipProbMean / day.precipProbCount)
      : 0
    // Filter hours to daylight only
    if (day.sunrise != null && day.sunset != null) {
      day.daylightHours = day.sunset - day.sunrise
      day.dayHours = day.hours.filter(h => h.hour >= day.sunrise && h.hour < day.sunset)
    } else if (day.sunrise != null) {
      day.dayHours = day.hours.filter(h => h.hour >= day.sunrise)
    } else {
      day.dayHours = day.hours
    }
  }

  return [...days.values()]
}

export function formatSunriseSunset(day) {
  const fmt = h => {
    if (h == null) return '--'
    const hh = String(Math.floor(h)).padStart(2, '0')
    const mm = String(Math.round((h % 1) * 60)).padStart(2, '0')
    return `${hh}:${mm}`
  }
  return {
    sunrise: fmt(day.sunrise),
    sunset: fmt(day.sunset),
    daylightHours: day.daylightHours || 0
  }
}
