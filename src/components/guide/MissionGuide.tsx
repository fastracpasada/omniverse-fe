import { useState } from 'react'
import type { FormEvent } from 'react'
import { Bot, ChevronRight, Map, MessageCircle, Navigation, PackageCheck, Send, ShieldAlert, X } from 'lucide-react'
import { scienceTargets } from '../../data/demoMission'
import { useMissionStore } from '../../stores/missionStore'
import { estimateMarsWeather } from '../../utils/marsWeather'

type Message = { role: 'guide' | 'user'; text: string }
const suggestions = ['Which travel mode is safest?', 'Compare the three paths', 'What resources do I need?', 'Explain the map risks']

export function MissionGuide() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([{ role: 'guide', text: 'I can help with this Jezero map, destinations, travel modes, route risks, and required resources.' }])
  const selectedId = useMissionStore((state) => state.selectedScienceId)
  const customDestination = useMissionStore((state) => state.customDestination)
  const mode = useMissionStore((state) => state.travelMode)
  const target = (customDestination?.id === selectedId ? customDestination : scienceTargets.find((item) => item.id === selectedId)) ?? scienceTargets[0]
  const weather = estimateMarsWeather(target.localPosition, mode)

  const answer = (question: string) => {
    const text = question.toLowerCase()
    if (/path|route|compare/.test(text)) return `Walking follows a close surface line, the rover takes a wider hazard-avoidance path, and flight uses the direct dashed reconnaissance line to ${target.name}. The highlighted path is the selected ${mode} mode.`
    if (/mode|travel|safest|recommend/.test(text)) return target.distanceKm <= 2 && target.risk === 'LOW' ? `Walking is viable for ${target.name}. A rover adds reserve and cargo capacity; flight is uncrewed scouting only.` : `The rover is the recommended crew mode for ${target.name} because it is ${target.distanceKm.toFixed(1)} km away with ${target.risk.toLowerCase()} terrain risk. Flight remains an uncrewed scout option.`
    if (/resource|oxygen|water|power|pack/.test(text)) return `For ${target.name}, review the Required resources card for oxygen, power, water, time, emergency beacon, medical kit, science tools, and the mode-specific repair kit.`
    if (/weather|temperature|wind|pressure|dust|visibility/.test(text)) return `${target.name} has a location-based planning estimate of ${weather.temperatureC}°C, ${weather.pressurePa} Pa pressure, ${weather.windMs} m/s wind, and ${weather.visibilityKm} km visibility. This is modeled, not live telemetry; review the route weather card for source details.`
    if (/risk|hazard|safe|terrain|environment/.test(text)) return `${target.name} has ${target.risk.toLowerCase()} simulated terrain risk. Check slope and obstacle exposure, communications coverage, environmental conditions, and return margin before confirming.`
    if (/where|destination|target|location|coordinate|map/.test(text)) return `${target.name} is the selected ${target.category.toLowerCase()}, ${target.distanceKm.toFixed(1)} km from the habitat. Select another marker or use destination search to compare locations.`
    if (/flight|air|helicopter|ingenuity/.test(text)) return 'The purple dashed path represents autonomous aerial reconnaissance. It can be selected and reviewed, but it is not crew transportation.'
    return 'That question is outside my mission-guide scope. Ask about this map, destinations, walking/rover/flight paths, terrain risks, resources, or trip readiness.'
  }

  const send = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return
    setMessages((current) => [...current, { role: 'user', text: trimmed }, { role: 'guide', text: answer(trimmed) }])
    setInput('')
  }
  const submit = (event: FormEvent) => { event.preventDefault(); send(input) }

  return <>
    <button className="guide-launcher" onClick={() => setOpen(true)} aria-label="Open mission guide"><MessageCircle size={19} /><span>Ask mission guide</span></button>
    <aside className={`guide-drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Mission guide">
      <header><div className="guide-avatar"><Bot size={18} /></div><div><strong>Mission guide</strong><span><i /> Map questions only</span></div><button onClick={() => setOpen(false)} aria-label="Close mission guide"><X size={18} /></button></header>
      <div className="guide-context"><Map size={14} /><span>Viewing <strong>{target.name}</strong></span><ChevronRight size={13} /></div>
      <div className="guide-messages" aria-live="polite">{messages.map((message, index) => <div key={index} className={`guide-message ${message.role}`}>{message.role === 'guide' && <Bot size={14} />}<p>{message.text}</p></div>)}</div>
      <div className="guide-suggestions"><span>TRY ASKING</span>{suggestions.map((suggestion, index) => <button key={suggestion} onClick={() => send(suggestion)}>{index === 0 ? <ShieldAlert size={13} /> : index === 1 ? <Navigation size={13} /> : index === 2 ? <PackageCheck size={13} /> : <Map size={13} />}{suggestion}</button>)}</div>
      <form onSubmit={submit}><label htmlFor="guide-question">Ask about this map</label><div><input id="guide-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Routes, risks, resources…" maxLength={180} /><button aria-label="Send question"><Send size={15} /></button></div><small>Limited to current mission-planning topics</small></form>
    </aside>
    {open && <button className="guide-scrim" onClick={() => setOpen(false)} aria-label="Close mission guide overlay" />}
  </>
}
