import { useMissionStore } from "../../stores/missionStore";
import { useMissionData } from "../../hooks/useMissionData";

export function MapLayerControl() {
  const { layers: backendLayers, apiConnected } = useMissionData();
  const layers = useMissionStore((state) => state.layers);
  const toggleLayer = useMissionStore((state) => state.toggleLayer);
  return (
    <div className="panel">
      <div className="panel-heading">
        <div className="panel-title">
          Map layers <span className="demo-badge">DATA STATUS</span>
        </div>
      </div>
      <div className="panel-body">
        <div className="inline-status">{apiConnected ? `${backendLayers.data?.total ?? 0} backend layer records · local display controls below` : "Backend layer catalogue unavailable · local layers shown"}</div>
        <div className="layer-list">
          {layers.map((layer) => (
            <div className="layer-row" key={layer.id}>
              <div>
                <div className="layer-name">{layer.name}</div>
                <div className="layer-status">
                  {layer.status === "PLACEHOLDER"
                    ? "Unavailable · source not configured"
                    : layer.status === "DEMO"
                      ? "Modeled planning layer"
                      : layer.id === "elevation"
                        ? "USGS CTX DEM · 20 m source / 250 m grid"
                        : layer.id === "slope"
                          ? "Derived from USGS CTX DEM · degrees"
                  : layer.id === "optical"
                    ? "NASA Mars Trek · MRO CTX Jezero mosaic"
                    : "Configured"}
                </div>
              </div>
              <button
                className={`switch ${layer.visible ? "on" : ""}`}
                onClick={() => toggleLayer(layer.id)}
                disabled={layer.status === "PLACEHOLDER"}
                aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`}
                aria-pressed={layer.visible}
              >
                <span className="switch-knob" />
              </button>
            </div>
          ))}
        </div>
        {backendLayers.data && <div className="layer-list backend-layer-list">{backendLayers.data.items.map((layer) => <div className="layer-row" key={`api-${layer.id}`}><div><div className="layer-name">{layer.name}</div><div className="layer-status">{layer.data_origin} · {layer.processing_status} · {layer.spatial_resolution_m ? `${layer.spatial_resolution_m} m` : "resolution unavailable"}</div></div><span className="demo-badge">{layer.is_demo ? "API DEMO" : "CANDIDATE"}</span></div>)}</div>}
      </div>
    </div>
  );
}
