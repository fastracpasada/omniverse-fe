import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Camera, ClipboardCheck, FlaskConical, Microscope, Navigation, PackageCheck, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { scienceTargets } from '../data/demoMission'
import { useMissionData } from '../hooks/useMissionData'
import { apiTargetToScienceTarget } from '../services/missionApi'
import { useMissionStore } from '../stores/missionStore'
import { mergeMissionTargets } from '../utils/missionLocations'
import { SourceInfo } from '../components/SourceInfo'

type Phase = 'approach' | 'survey' | 'sample' | 'closeout'

const activities: Record<Phase, Array<{ id: string; title: string; detail: string; required: boolean }>> = {
  approach: [
    { id: 'a1', title: 'Stop 25 m before the outcrop', detail: 'Confirm stable footing, escape direction, communications, and remaining return reserve.', required: true },
    { id: 'a2', title: 'Capture an approach panorama', detail: 'Photograph the undisturbed site, horizon, route of arrival, and target with a scale reference.', required: true },
    { id: 'a3', title: 'Record site context', detail: 'Log coordinates, local time, temperature, wind, surface condition, and visible hazards.', required: true },
  ],
  survey: [
    { id: 's1', title: 'Describe the geologic unit', detail: 'Record color, grain size, layering, fractures, clasts, weathering, and contact relationships.', required: true },
    { id: 's2', title: 'Image bedding and contacts', detail: 'Take overview, mid-range, and close-up images with scale and orientation visible.', required: true },
    { id: 's3', title: 'Acquire non-destructive measurements', detail: 'Collect handheld imagery and available mineralogical or elemental measurements before disturbing the surface.', required: true },
    { id: 's4', title: 'Select paired sample points', detail: 'Choose representative surface and shallow material while avoiding recently disturbed or contaminated ground.', required: true },
  ],
  sample: [
    { id: 'p1', title: 'Photograph the sample before collection', detail: 'Capture the exact material and its relationship to the outcrop before contact.', required: true },
    { id: 'p2', title: 'Open a witness control when directed', detail: 'Expose the contamination witness alongside collection hardware to document introduced material.', required: true },
    { id: 'p3', title: 'Collect paired material', detail: 'Acquire one coherent rock/core sample and one nearby regolith sample when scientifically justified.', required: true },
    { id: 'p4', title: 'Seal and verify the container', detail: 'Inspect the seal, photograph the closed container, and confirm identifier readability.', required: true },
  ],
  closeout: [
    { id: 'c1', title: 'Photograph the disturbed site', detail: 'Record the final sample cavity, footprints, tool marks, and any discarded material.', required: true },
    { id: 'c2', title: 'Complete sample custody record', detail: 'Match container ID, coordinates, crew member, time, sample type, and imagery references.', required: true },
    { id: 'c3', title: 'Stow tools and inspect seals', detail: 'Account for equipment and isolate anything that may carry loose dust.', required: true },
    { id: 'c4', title: 'Recheck return constraints', detail: 'Depart when the route reserve reaches the mission stop-work threshold.', required: true },
  ],
}

const phaseLabels: Array<{ id: Phase; label: string }> = [
  { id: 'approach', label: '1 · Approach' }, { id: 'survey', label: '2 · Site survey' }, { id: 'sample', label: '3 · Sampling' }, { id: 'closeout', label: '4 · Closeout' },
]

export function ScienceExpedition() {
  const navigate = useNavigate()
  const { site, targets: apiTargets } = useMissionData()
  const selectedId = useMissionStore((state) => state.selectedScienceId)
  const missionConfig = useMissionStore((state) => state.missionConfig)
  const selectScience = useMissionStore((state) => state.selectScience)
  const [phase, setPhase] = useState<Phase>('approach')
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => loadScienceDraft().completed)
  const [sampleId, setSampleId] = useState(() => loadScienceDraft().sampleId)
  const [sampleType, setSampleType] = useState(() => loadScienceDraft().sampleType)
  const [notes, setNotes] = useState(() => loadScienceDraft().notes)
  const targets = useMemo(() => {
    const backend = site && apiTargets.data ? apiTargets.data.items.map((target) => apiTargetToScienceTarget(target, site)) : []
    const nasaAreas = scienceTargets.filter((target) => target.source === 'NASA MISSION AREA')
    return mergeMissionTargets(backend, nasaAreas)
  }, [site, apiTargets.data])
  const target = targets.find((item) => item.id === selectedId) ?? targets.find((item) => item.id === 'NASA-05') ?? targets[0]

  useEffect(() => { if (target && target.id !== selectedId) selectScience(target.id) }, [target, selectedId, selectScience])
  useEffect(() => { localStorage.setItem('mars-nav-science-draft', JSON.stringify({ completed, sampleId, sampleType, notes })) }, [completed, sampleId, sampleType, notes])

  const allActivities = Object.values(activities).flat()
  const completedCount = allActivities.filter((item) => completed[item.id]).length
  const progress = Math.round(completedCount / allActivities.length * 100)
  const toggle = (id: string) => setCompleted((current) => ({ ...current, [id]: !current[id] }))
  const planTraverse = () => { if (target) selectScience(target.id); navigate('/') }

  if (!target) return <div className="page-wrap"><div className="warning-strip">No verified or NASA-context science targets are available.</div></div>

  return <div className="page-wrap science-expedition">
    <header className="science-hero">
      <div><span className="welcome-label">JEZERO FIELD SCIENCE · CREW WORKFLOW</span><h1>{missionConfig.missionTitle}</h1><p>{missionConfig.scienceObjective}</p></div>
      <div className="science-progress"><span>{progress}%</span><div><strong>Expedition checklist</strong><small>{completedCount} of {allActivities.length} required activities complete</small><i><b style={{ width: `${progress}%` }} /></i></div></div>
    </header>

    <div className="science-layout">
      <main className="science-main">
        <section className="science-mission-card">
          <div className="science-card-heading"><FlaskConical size={19} /><div><span>TEAM-DEFINED PRIMARY OBJECTIVE</span><h2>{missionConfig.scienceObjective}</h2></div><SourceInfo label="NASA Mars 2020 investigates Jezero geology, past habitability, signs of ancient life, sample caching, and preparation for human exploration." href="https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/" /></div>
          <div className="science-question-grid"><div><span>PRIMARY TARGET</span><strong>{target.name}: {target.objective}</strong></div><div><span>REQUIRED EVIDENCE</span><strong>Oriented context images, layer descriptions, non-destructive measurements, and paired rock/regolith samples.</strong></div><div><span>SUCCESS</span><strong>{missionConfig.successCriteria}</strong></div></div>
        </section>

        <section className="science-workflow-card">
          <div className="science-section-title"><ClipboardCheck size={18} /><div><h2>Expedition activity sequence</h2><p>Complete in order. Stop if a safety or contamination condition is triggered.</p></div></div>
          <div className="phase-tabs">{phaseLabels.map((item) => <button key={item.id} className={phase === item.id ? 'active' : ''} onClick={() => setPhase(item.id)}>{item.label}<span>{activities[item.id].filter((activity) => completed[activity.id]).length}/{activities[item.id].length}</span></button>)}</div>
          <div className="field-checklist">{activities[phase].map((activity, index) => <label key={activity.id} className={completed[activity.id] ? 'complete' : ''}><input type="checkbox" checked={Boolean(completed[activity.id])} onChange={() => toggle(activity.id)} /><span className="activity-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{activity.title}</strong><small>{activity.detail}</small></span><em>{activity.required ? 'REQUIRED' : 'OPTIONAL'}</em></label>)}</div>
        </section>

        <section className="science-two-column">
          <div className="science-panel">
            <div className="science-section-title"><Microscope size={18} /><div><h2>Field instrument sequence</h2><p>Observe before disturbing the target.</p></div></div>
            <ol className="instrument-sequence"><li><Camera size={15} /><span><strong>Context imaging</strong><small>Panorama, approach, scale, orientation, and close-up frames</small></span></li><li><Microscope size={15} /><span><strong>Hand lens / microscopic imager</strong><small>Texture, grains, veins, coatings, and sedimentary structures</small></span></li><li><FlaskConical size={15} /><span><strong>Mineralogy / elemental screening</strong><small>Non-destructive measurement before abrasion or collection</small></span></li><li><PackageCheck size={15} /><span><strong>Sampling and containment kit</strong><small>Sterile container, witness control, seal inspector, and custody labels</small></span></li></ol>
            <div className="science-analog-note"><SourceInfo label="Perseverance uses Mastcam-Z context imaging, PIXL elemental chemistry, SHERLOC Raman/fluorescence measurements, WATSON close-up imaging, and a sample caching system. These are robotic analogs, not the exact crew payload." href="https://science.nasa.gov/mission/mars-2020-perseverance/science/" /><span><strong>NASA robotic analog</strong> Instrument order is informed by Perseverance, adapted here as a proposed crew workflow.</span></div>
          </div>

          <div className="science-panel sample-log-panel">
            <div className="science-section-title"><PackageCheck size={18} /><div><h2>Sample custody record</h2><p>Required before the sample leaves the site.</p></div></div>
            <label>Container identifier<input value={sampleId} onChange={(event) => setSampleId(event.target.value)} /></label>
            <label>Material type<select value={sampleType} onChange={(event) => setSampleType(event.target.value)}><option>Rock core</option><option>Regolith</option><option>Surface coating</option><option>Atmospheric blank</option><option>Witness control</option></select></label>
            <div className="sample-location"><span>LOCATION</span><strong>{target.name}</strong><small>{target.coordinates ? `${target.coordinates[1].toFixed(5)}°, ${target.coordinates[0].toFixed(5)}°` : 'Approximate mission-area coordinate · verify in field'}</small></div>
            <label>Field observations<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Layer, texture, color, contact, collection depth, image IDs, anomalies…" /></label>
            <label className="witness-check"><input type="checkbox" /> Witness control exposed and sealed</label>
          </div>
        </section>

        <section className="reference-samples">
          <div className="science-section-title"><FlaskConical size={18} /><div><h2>Real Mars sample analogs</h2><p>Use these as documentation and contamination-control references—not as identical crew procedures.</p></div></div>
          <div><ReferenceSample type="ROCK CORE" title="Geologically diverse cached cores" text="Perseverance selects rock cores that preserve Jezero's geologic and environmental history." href="https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/" /><ReferenceSample type="REGOLITH" title="Loose surface material" text="Regolith provides a complementary record of weathering, transport, dust, and surface processes." href="https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/" /><ReferenceSample type="WITNESS CONTROL" title="Contamination witness tube" text="Witness tubes capture material introduced by the sampling system and local collection environment." href="https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/" /></div>
        </section>
      </main>

      <aside className="science-sidebar">
        <section className="science-target-card"><span>SELECTED SCIENCE AREA</span><h2>{target.name}</h2><p>{target.description}</p><div><small>SCIENCE PURPOSE</small><strong>{target.objective}</strong></div><div><small>LOCATION CONFIDENCE</small><strong>{target.source === 'BACKEND MISSION' ? 'Backend mission target' : 'Approximate NASA campaign-area reference'}</strong></div><select value={target.id} onChange={(event) => selectScience(event.target.value)}>{targets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button onClick={planTraverse}><Navigation size={15} />Use as expedition destination</button></section>

        <section className="stop-work-card"><div><AlertTriangle size={18} /><span><strong>Stop-work criteria</strong><small>Pause science and contact the mission lead if any condition occurs.</small></span></div><ul><li>Return reserve reaches 60 minutes</li><li>Communications or crew contact is lost</li><li>Unstable slope, rockfall, or footing is observed</li><li>Suit, rover, or containment integrity warning</li><li>Sample identity or contamination state is uncertain</li><li>Weather exceeds the approved planning threshold</li></ul></section>

        <section className="crew-roles-card"><div className="science-section-title"><ShieldCheck size={18} /><div><h2>Crew roles and buddy rules</h2><p>Two-person expedition assignment</p></div></div><div><span>EVA-1 · {missionConfig.crewOneName}</span><strong>{missionConfig.crewOneRole}</strong></div><div><span>EVA-2 · {missionConfig.crewTwoName}</span><strong>{missionConfig.crewTwoRole}</strong></div><ul><li>Maintain voice contact and visual contact whenever terrain permits.</li><li>Buddy-check suit, seals, tools, and sample ID before departure.</li><li>No solo movement beyond the immediate documented work area.</li></ul></section>

        <section className="planetary-protection-card"><div><ShieldCheck size={18} /><span><strong>Contamination discipline</strong><SourceInfo label="NASA planetary protection controls forward contamination and sample integrity. Exact crew requirements would be mission-specific and formally approved." href="https://sma.nasa.gov/sma-disciplines/planetary-protection/" /></span></div><p>Do not touch the sampling surface with non-sterile equipment. Keep clean and dirty tools separated. Record every breach, dropped item, exposed seal, and unexpected contact.</p><small>PROPOSED CREW PRACTICE · NOT AN APPROVED NASA PROCEDURE</small></section>
      </aside>
    </div>
  </div>
}

function ReferenceSample({ type, title, text, href }: { type: string; title: string; text: string; href: string }) {
  return <article><span>{type}</span><strong>{title} <SourceInfo label={`NASA Perseverance reference: ${title}`} href={href} /></strong><p>{text}</p><small>NASA MARS 2020 ANALOG</small></article>
}

function loadScienceDraft(): { completed: Record<string, boolean>; sampleId: string; sampleType: string; notes: string } {
  try { const saved = JSON.parse(localStorage.getItem('mars-nav-science-draft') ?? '{}'); return { completed: saved.completed ?? {}, sampleId: saved.sampleId ?? 'JZ-DELTA-001', sampleType: saved.sampleType ?? 'Rock core', notes: saved.notes ?? '' } }
  catch { return { completed: {}, sampleId: 'JZ-DELTA-001', sampleType: 'Rock core', notes: '' } }
}
