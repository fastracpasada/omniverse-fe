import { useMissionStore } from "../../stores/missionStore";

export function MapLayerControl() {
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
      </div>
    </div>
  );
}
