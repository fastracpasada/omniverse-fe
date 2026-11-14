import { useMissionStore } from '../../stores/missionStore'
import { useMissionData } from '../../hooks/useMissionData'

export function MapLayerControl() {
  const layers = useMissionStore((state) => state.layers)
  const toggleLayer = useMissionStore((state) => state.toggleLayer)
  const { layers: apiLayers } = useMissionData()
  const logicalLayers = apiLayers.data?.items.map((layer) => {
    const ready = layer.processing_status === 'demo' || layer.processing_status === 'ready'
    const logicalId = layer.layer_type === 'hazard_cost' ? 'hazards' : layer.layer_type
    return {
      id: ready ? logicalId : `unavailable-${layer.id}`,
      name: layer.name,
      ready,
      provenance: layer.is_demo ? 'Synthetic backend data · DEMO' : `${layer.data_origin} · ${layer.processing_status}`,
    }
  })
  const availableLayers = logicalLayers ?? layers.map((layer) => ({ id: layer.id, name: layer.name, ready: layer.status !== 'PLACEHOLDER', provenance: layer.status === 'PLACEHOLDER' ? 'Unavailable · source not configured' : 'Local schematic · DEMO' }))
  return <div className="panel"><div className="panel-heading"><div className="panel-title">Map layers <span className="demo-badge">API / DEMO</span></div></div><div className="panel-body"><div className="layer-list">{availableLayers.map((layer) => {
    const active = layers.find((item) => item.id === layer.id)?.visible ?? false
    return <div className="layer-row" key={`${layer.id}-${layer.name}`}><div><div className="layer-name">{layer.name}</div><div className="layer-status">{layer.provenance}</div></div><button className={`switch ${active ? 'on' : ''}`} onClick={() => toggleLayer(layer.id)} disabled={!layer.ready} aria-label={`${active ? 'Hide' : 'Show'} ${layer.name}`} aria-pressed={active}><span className="switch-knob" /></button></div>
  })}<div className="layer-row"><div><div className="layer-name">Planned route</div><div className="layer-status">API-computed or local demo route</div></div><button className={`switch ${layers.find((layer) => layer.id === 'route')?.visible ? 'on' : ''}`} onClick={() => toggleLayer('route')} aria-label="Toggle planned route" aria-pressed={layers.find((layer) => layer.id === 'route')?.visible}><span className="switch-knob" /></button></div></div></div></div>
}