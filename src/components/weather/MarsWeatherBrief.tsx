import { AlertTriangle, Eye, Gauge, Thermometer, Wind } from 'lucide-react'
import type { ScienceTarget } from '../../types/mission'
import { estimateMarsWeather, observationContext, weatherMethod } from '../../utils/marsWeather'

export function MarsWeatherBrief({ origin, destination, mode, compact = false }: { origin: ScienceTarget; destination: ScienceTarget; mode: 'walk' | 'rover' | 'air'; compact?: boolean }) {
  const from = estimateMarsWeather(origin.localPosition, mode)
  const to = estimateMarsWeather(destination.localPosition, mode)
  const warnings = [...new Set([...from.warnings, ...to.warnings])]
  return <section className={`weather-brief ${compact ? 'compact' : ''}`} aria-label="Mars environmental outlook">
    <header><div><span className="weather-source-badge">MODEL ESTIMATE</span><strong>Route weather outlook</strong></div><small>Location-aware · not live</small></header>
    <div className="weather-locations"><WeatherLocation label="FROM" name={origin.name} weather={from} /><WeatherLocation label="TO" name={destination.name} weather={to} /></div>
    {warnings.length > 0 && <div className="weather-warnings">{warnings.slice(0, compact ? 2 : 4).map((warning) => <span key={warning}><AlertTriangle size={11} />{warning}</span>)}</div>}
    {!compact && <footer><span>{weatherMethod}</span><a href="https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda_old.html" target="_blank" rel="noreferrer">{observationContext}</a></footer>}
  </section>
}

function WeatherLocation({ label, name, weather }: { label: string; name: string; weather: ReturnType<typeof estimateMarsWeather> }) {
  return <div className="weather-location"><div className="weather-location-name"><span>{label}</span><strong>{name}</strong></div><div className="weather-values"><span title="Air temperature"><Thermometer size={12} /><strong>{weather.temperatureC}°C</strong></span><span title="Atmospheric pressure"><Gauge size={12} /><strong>{weather.pressurePa} Pa</strong></span><span title="Wind speed"><Wind size={12} /><strong>{weather.windMs} m/s</strong></span><span title="Estimated visibility"><Eye size={12} /><strong>{weather.visibilityKm} km</strong></span></div></div>
}
