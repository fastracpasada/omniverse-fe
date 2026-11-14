import { useMissionStore } from '../../stores/missionStore'

export function MapLayerControl() {
  const layers = useMissionStore((state) => state.layers)
  const toggleLayer = useMissionStore((state) => state.toggleLayer)
  return <div className="panel"><div className="panel-heading"><div className="panel-title">Map layers <span className="demo-badge">DEMO</span></div></div><div className="panel-body"><div className="layer-list">{layers.map((layer) => <div className="layer-row" key={layer.id}><div><div className="layer-name">{layer.name}</div><div className="layer-status">{layer.status === 'PLACEHOLDER' ? 'Unavailable · source not configured' : layer.status === 'DEMO' ? 'Schematic demo layer' : 'Configured'}</div></div><button className={`switch ${layer.visible ? 'on' : ''}`} onClick={() => toggleLayer(layer.id)} disabled={layer.status === 'PLACEHOLDER'} aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`} aria-pressed={layer.visible}><span className="switch-knob" /></button></div>)}</div></div></div>
}