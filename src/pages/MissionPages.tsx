import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Check,
  Clock3,
  Compass,
  FlaskConical,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Route as RouteIcon,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import {
  demoMission,
  initialTelemetry,
  missionRoutes,
  scienceTargets,
} from "../data/demoMission";
import { MarsMap } from "../components/map/MarsMap";
import { useMissionStore } from "../stores/missionStore";
import type { MissionRoute } from "../types/mission";
import { useQuery } from "@tanstack/react-query";
import { useMissionData } from "../hooks/useMissionData";
import { apiTargetToScienceTarget, missionApi } from "../services/missionApi";
import { mergeMissionTargets } from "../utils/missionLocations";
import { SourceInfo } from "../components/SourceInfo";

export function RoutePlanner() {
  const selectedScienceId = useMissionStore((state) => state.selectedScienceId);
  const selectScience = useMissionStore((state) => state.selectScience);
  const selectedRouteId = useMissionStore((state) => state.selectedRouteId);
  const selectRoute = useMissionStore((state) => state.selectRoute);
  const generateRoute = useMissionStore((state) => state.generateRoute);
  const routeGenerated = useMissionStore((state) => state.routeGenerated);
  const [maxHours, setMaxHours] = useState("6");
  const [waypoints, setWaypoints] = useState("0");
  const target =
    scienceTargets.find((item) => item.id === selectedScienceId) ??
    scienceTargets[0];
  const routes = missionRoutes;
  return (
    <div className="page-wrap">
      <PageHeading
        kicker="MISSION DESIGN / TRAVERSE"
        title="Route planner"
        description="Compare mock route alternatives for a science traverse."
      />
      <div className="page-content-grid">
        <div className="stacked-panels">
          <section className="panel">
            <PanelHeading
              icon={<RouteIcon size={14} />}
              title="ROUTE CONFIGURATION"
              badge="SIMULATED"
            />
            <div className="panel-body">
              <div className="form-grid">
                <Field label="Starting location">
                  <select aria-label="Starting location">
                    <option>HAB-01 · Demo origin</option>
                  </select>
                </Field>
                <Field label="Science destination">
                  <select
                    value={selectedScienceId}
                    onChange={(event) => selectScience(event.target.value)}
                  >
                    {scienceTargets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Maximum EVA duration">
                  <select
                    value={maxHours}
                    onChange={(event) => setMaxHours(event.target.value)}
                  >
                    <option value="4">4 hours</option>
                    <option value="6">6 hours</option>
                    <option value="8">8 hours</option>
                  </select>
                </Field>
                <Field label="Additional waypoints">
                  <select
                    value={waypoints}
                    onChange={(event) => setWaypoints(event.target.value)}
                  >
                    <option value="0">None</option>
                    <option value="1">1 waypoint</option>
                    <option value="2">2 waypoints</option>
                  </select>
                </Field>
              </div>
              <div className="strategy-label">ROUTE STRATEGY</div>
              <div className="strategy-switch">
                <button
                  className={selectedRouteId === "ROUTE-A" ? "selected" : ""}
                  onClick={() => selectRoute("ROUTE-A")}
                >
                  <Compass size={13} /> Shortest distance
                </button>
                <button
                  className={selectedRouteId === "ROUTE-B" ? "selected" : ""}
                  onClick={() => selectRoute("ROUTE-B")}
                >
                  <ShieldAlert size={13} /> Safety-first
                </button>
              </div>
              <div className="form-actions">
                <button className="primary-button" onClick={generateRoute}>
                  <RouteIcon size={13} /> Generate simulated routes
                </button>
                <span className="quiet-note">
                  Mock calculations only · no terrain validation
                </span>
              </div>
            </div>
          </section>
          <section className="panel">
            <PanelHeading
              icon={<Compass size={14} />}
              title="ROUTE ALTERNATIVES"
              badge={routeGenerated ? "GENERATED · DEMO" : "SAMPLE · DEMO"}
            />
            <div className="panel-body">
              <div className="route-options">
                {routes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    selected={selectedRouteId === route.id}
                    onSelect={() => selectRoute(route.id)}
                  />
                ))}
              </div>
              <div className="warning-strip">
                <ShieldAlert size={13} />
                <span>
                  These illustrative paths are not terrain-validated,
                  safety-approved, or suitable for operational use. Destination:{" "}
                  {target.name} · duration constraint: {maxHours} h · extra
                  waypoints: {waypoints}.
                </span>
              </div>
            </div>
          </section>
        </div>
        <div className="stacked-panels">
          <MarsMap large showLegend={false} />
          <div className="panel">
            <PanelHeading icon={<MapPinIcon />} title="SELECTED DESTINATION" />
            <div className="panel-body">
              <h3 className="plain-heading">{target.name}</h3>
              <div className="card-description">{target.description}</div>
              <div className="route-stats">
                <span>{target.distanceKm.toFixed(1)} km</span>
                <span>{target.risk} DEMO RISK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScienceObjectives() {
  const { site, targets: apiTargets } = useMissionData();
  const selectedId = useMissionStore((state) => state.selectedScienceId);
  const selectScience = useMissionStore((state) => state.selectScience);
  const targetList = mergeMissionTargets(site && apiTargets.data ? apiTargets.data.items.map((target) => apiTargetToScienceTarget(target, site)) : [], scienceTargets);
  return (
    <div className="page-wrap">
      <PageHeading
        kicker="SCIENCE / TARGET CATALOG"
        title="Team-selected science objectives"
        description="The mission team decides which locations and observations to prioritize; the dashboard only records the selection."
        source={{ label: "NASA Mars 2020 Jezero campaign context; mission-area markers in this prototype are approximate", href: "https://science.nasa.gov/mission/mars-2020-perseverance/" }}
      />
      <div className="objective-status-row">
        <span className="demo-badge">{targetList.length} {apiTargets.data ? "BACKEND + DEMO TARGETS" : "DEMO TARGETS"}</span>
        <span className="quiet-note">
          No science priority is assigned automatically. All locations and observations are simulated.
        </span>
      </div>
      <div className="target-grid">
        {targetList.map((target, index) => (
          <button
            className={`target-card ${target.id === selectedId ? "selected" : ""}`}
            key={target.id}
            onClick={() => selectScience(target.id)}
          >
            <div className="target-topline">
              <span className="target-index">TARGET 0{index + 1}</span>
              <span className={`risk-label risk-${target.risk.toLowerCase()}`}>
                {target.risk}
              </span>
            </div>
            <h3>{target.name}</h3>
            <div className="target-category">
              <FlaskConical size={12} />
              {target.category}
            </div>
            <div className="card-description">{target.description}</div>
            <div className="target-objective">
              <span>OBJECTIVE</span>
              <strong>{target.objective}</strong>
            </div>
            <div className="target-footer">
              <span>{target.distanceKm.toFixed(1)} km from habitat · DEMO</span>
              <span className="target-status">{target.status}</span>
            </div>
          </button>
        ))}
      </div>
      <section className="panel objectives-progress">
        <PanelHeading
          icon={<Check size={14} />}
          title="MISSION OBJECTIVE TRACKER"
          badge="SIMULATED"
        />
        <div className="panel-body">
          <div className="timeline">
            {demoMission.objectives.map((objective, index) => (
              <div className="timeline-row" key={objective.id}>
                <div className="timeline-time">OBJ-0{index + 1}</div>
                <div className="timeline-rail">
                  <span className="timeline-dot" />
                </div>
                <div className="timeline-copy">
                  {objective.title}
                  <small>
                    {index === 0
                      ? "In progress · observation notes pending"
                      : "Queued for a future traverse"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function LegacyEVASimulation() {
  const elapsed = useMissionStore((state) => state.telemetryElapsedSeconds);
  const running = useMissionStore((state) => state.simulationRunning);
  const setRunning = useMissionStore((state) => state.setSimulationRunning);
  const reset = useMissionStore((state) => state.resetSimulation);
  const tick = useMissionStore((state) => state.tickSimulation);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [running, tick]);
  const elapsedLabel = formatTime(elapsed);
  const oxygen = Math.max(
    0,
    initialTelemetry.oxygenPercent -
      Math.floor((elapsed - initialTelemetry.elapsedSeconds) / 90),
  );
  const battery = Math.max(
    0,
    initialTelemetry.batteryPercent -
      Math.floor((elapsed - initialTelemetry.elapsedSeconds) / 120),
  );
  return (
    <div className="page-wrap">
      <PageHeading
        kicker="EXTRAVEHICULAR ACTIVITY / SIMULATOR"
        title="EVA simulation"
        description="Deterministic demo telemetry and mission-state controls."
      />
      <div className="eva-grid">
        <div className="panel">
          <PanelHeading
            icon={<Activity size={14} />}
            title="ASTRONAUT STATUS"
            badge="SIMULATED"
          />
          <div className="panel-body">
            <div className="eva-identity">
              <div className="crew-avatar">RC</div>
              <div>
                <h3 className="plain-heading">Astronaut R. Chen</h3>
                <div className="card-description">
                  {demoMission.crewId} · EVA-02 · Demo astronaut
                </div>
              </div>
              <span className="status-running">
                <span className="status-dot" />
                {running ? "RUNNING" : "PAUSED"}
              </span>
            </div>
            <div className="eva-clock-label">ELAPSED MISSION TIME</div>
            <div className="eva-clock">{elapsedLabel}</div>
            <div className="resource-bars">
              <ResourceBar label="Oxygen supply" value={oxygen} color="cyan" />
              <ResourceBar
                label="Suit battery"
                value={battery}
                color="orange"
              />
            </div>
            <div className="eva-controls">
              <button
                className="primary-button"
                onClick={() => setRunning(!running)}
              >
                {running ? <Pause size={13} /> : <Play size={13} />}
                {running ? "Pause simulation" : "Resume simulation"}
              </button>
              <button className="secondary-button" onClick={reset}>
                <RotateCcw size={13} />
                Reset
              </button>
            </div>
            <div className="warning-strip">
              <ShieldAlert size={13} />
              <span>
                All telemetry is illustrative. No NASA-approved thresholds or
                real-time sensor connections are used.
              </span>
            </div>
          </div>
        </div>
        <div className="panel">
          <PanelHeading
            icon={<Compass size={14} />}
            title="SIMULATED TRAVERSE"
            badge="DEMO"
          />
          <MarsMap large showLegend={false} />
          <div className="panel-body traverse-readout">
            <span>
              POSITION <strong>LOCAL GRID · DEMO</strong>
            </span>
            <span>
              RANGE <strong>2.4 km</strong>
            </span>
            <span>
              RETURN WINDOW <strong>16:20 LMST</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="panel eva-timeline">
        <PanelHeading
          icon={<Clock3 size={14} />}
          title="EVA TIMELINE"
          badge="PLANNED · DEMO"
        />
        <div className="panel-body">
          <div className="timeline">
            {demoMission.timeline.map((item) => (
              <div className="timeline-row" key={item.time}>
                <div className="timeline-time">{item.time} LMST</div>
                <div className="timeline-rail">
                  <span className="timeline-dot" />
                </div>
                <div className="timeline-copy">
                  {item.activity}
                  <small>{item.detail}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
void LegacyEVASimulation;

export { OperationsControl as EVASimulation } from "../components/operations/OperationsControl";

export function MissionReports() {
  const { siteId, apiConnected } = useMissionData();
  const reports = useQuery({ queryKey: ["api", "missions", siteId], queryFn: () => missionApi.getMissions(siteId!), enabled: Boolean(siteId), retry: false });
  const downloadReport = () => {
    const report = {
      mission: demoMission,
      targets: scienceTargets,
      routes: missionRoutes,
      telemetry: initialTelemetry,
      dataLabel: "SIMULATED DEMO DATA",
      backendMissions: reports.data?.items ?? [],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${demoMission.id.toLowerCase()}-demo-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="page-wrap">
      <PageHeading
        kicker="MISSION ARCHIVE / EXPORT"
        title="Mission reports"
        description="Review previous demo missions and export structured JSON."
      />
      <div className="panel">
        <PanelHeading
          icon={<Activity size={14} />}
          title="MISSION LOG"
          badge={apiConnected ? "BACKEND RECORDS" : "LOCAL DEMO"}
        />
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th>MISSION ID</th>
                <th>NAME</th>
                <th>SOL</th>
                <th>STATUS</th>
                <th>DATA</th>
              </tr>
            </thead>
            <tbody>{reports.data?.items.map((mission) => <tr key={mission.id}><td>{mission.id}</td><td>{mission.name}</td><td>—</td><td><span className="status-text">{mission.status.toUpperCase()}</span></td><td>{mission.is_demo ? "API demo" : "Backend"}</td></tr>)}
              {!reports.data?.items.length && <><tr>
                <td>DEMO-JZ-07</td>
                <td>Jezero Traverse 07</td>
                <td>018</td>
                <td>
                  <span className="status-text">SIMULATED</span>
                </td>
                <td>Mock telemetry</td>
              </tr>
              <tr>
                <td>DEMO-JZ-06</td>
                <td>Jezero Reconnaissance</td>
                <td>016</td>
                <td>
                  <span className="status-text">SIMULATED</span>
                </td>
                <td>Mock report</td>
              </tr></>}
            </tbody>
          </table>
        </div>
        <div className="panel-body report-action-row">
          <div>
            <div className="plain-heading">Export current demo mission</div>
            <div className="card-description">
              JSON includes mission metadata, objectives, route alternatives,
              and simulated telemetry.
            </div>
          </div>
          <button className="primary-button" onClick={downloadReport}>
            <ArrowDownToLine size={13} />
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}

function LegacySettings() {
  const layers = useMissionStore((state) => state.layers);
  const toggleLayer = useMissionStore((state) => state.toggleLayer);
  const [compact, setCompact] = useState(false);
  const [units, setUnits] = useState("Metric");
  return (
    <div className="page-wrap">
      <PageHeading
        kicker="SYSTEM / PREFERENCES"
        title="Settings"
        description="Display preferences and demo mission configuration."
      />
      <div className="settings-grid">
        <div className="panel">
          <PanelHeading
            icon={<Settings2 size={14} />}
            title="DISPLAY PREFERENCES"
          />
          <div className="panel-body">
            <div className="setting-row">
              <div>
                <div className="layer-name">Compact telemetry cards</div>
                <div className="layer-status">
                  Reduce padding in mission telemetry panels.
                </div>
              </div>
              <Toggle value={compact} onToggle={() => setCompact(!compact)} />
            </div>
            <div className="setting-row">
              <div>
                <div className="layer-name">Distance units</div>
                <div className="layer-status">
                  Used for local demo-grid labels.
                </div>
              </div>
              <select
                className="compact-select"
                value={units}
                onChange={(event) => setUnits(event.target.value)}
              >
                <option>Metric</option>
                <option>Imperial</option>
              </select>
            </div>
          </div>
        </div>
        <div className="panel">
          <PanelHeading
            icon={<Gauge size={14} />}
            title="DEMO MISSION PARAMETERS"
            badge="SIMULATED"
          />
          <div className="panel-body">
            <div className="setting-row">
              <div>
                <div className="layer-name">Mission</div>
                <div className="layer-status">Current local scenario</div>
              </div>
              <strong className="setting-value">{demoMission.name}</strong>
            </div>
            <div className="setting-row">
              <div>
                <div className="layer-name">Site</div>
                <div className="layer-status">Initial study area</div>
              </div>
              <strong className="setting-value">{demoMission.site}</strong>
            </div>
            <div className="setting-row">
              <div>
                <div className="layer-name">Crew identifier</div>
                <div className="layer-status">Fictional demo astronaut</div>
              </div>
              <strong className="setting-value">{demoMission.crewId}</strong>
            </div>
          </div>
        </div>
        <div className="panel setting-layers">
          <PanelHeading icon={<MapIcon />} title="DEFAULT MAP LAYERS" />
          <div className="panel-body">
            {layers.map((layer) => (
              <div className="setting-row" key={layer.id}>
                <div>
                  <div className="layer-name">{layer.name}</div>
                  <div className="layer-status">
                    {layer.status === "PLACEHOLDER"
                      ? "Unavailable until a verified source is configured"
                      : "Schematic demo layer"}
                  </div>
                </div>
                <button
                  className={`switch ${layer.visible ? "on" : ""}`}
                  aria-pressed={layer.visible}
                  onClick={() => toggleLayer(layer.id)}
                  aria-label={`Toggle ${layer.name}`}
                >
                  <span className="switch-knob" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <PanelHeading
            icon={<ShieldAlert size={14} />}
            title="DATA DISCLAIMER"
          />
          <div className="panel-body">
            <div className="warning-strip">
              <ShieldAlert size={13} />
              <span>
                This interface is a hackathon demonstration. NASA Mars Trek
                imagery and a USGS CTX terrain model are connected; mission
                telemetry, operational safety limits, hazards, and weather remain
                simulated.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
void LegacySettings;

export function Settings() {
  const config = useMissionStore((state) => state.missionConfig);
  const updateConfig = useMissionStore((state) => state.updateMissionConfig);
  const selectedTargetId = useMissionStore((state) => state.selectedScienceId);
  const selectScience = useMissionStore((state) => state.selectScience);
  const missionTargets = scienceTargets.filter((target) => target.source === "NASA MISSION AREA");
  const selectedTarget = missionTargets.find((target) => target.id === selectedTargetId) ?? missionTargets[0];
  return (
    <div className="page-wrap mission-settings">
      <PageHeading
        kicker="MISSION / USER CONFIGURATION"
        title="Mission settings"
        description="Edit mission-owned information that changes during expedition planning. Scientific datasets and safety constraints remain protected."
      />
      <div className="mission-settings-grid">
        <div className="settings-editor-stack">
          <section className="panel editable-settings-panel">
            <PanelHeading icon={<Settings2 size={14} />} title="MISSION IDENTITY" badge="EDITABLE" />
            <div className="panel-body settings-form-grid">
              <SettingsField label="Mission title" help="Shown in Overview and Science."><input value={config.missionTitle} onChange={(event) => updateConfig({ missionTitle: event.target.value })} /></SettingsField>
              <SettingsField label="Primary mission target" help="Updates the destination used by Science and Overview."><select value={selectedTarget?.id} onChange={(event) => selectScience(event.target.value)}>{missionTargets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></SettingsField>
              <SettingsField wide label="Science objective" help="Defined by the mission science team; the dashboard does not choose it."><textarea value={config.scienceObjective} onChange={(event) => updateConfig({ scienceObjective: event.target.value })} /></SettingsField>
              <SettingsField wide label="Success criteria" help="The evidence required before the expedition can be considered scientifically complete."><textarea value={config.successCriteria} onChange={(event) => updateConfig({ successCriteria: event.target.value })} /></SettingsField>
            </div>
          </section>

          <section className="panel editable-settings-panel">
            <PanelHeading icon={<Activity size={14} />} title="CREW ASSIGNMENTS" badge="EDITABLE" />
            <div className="panel-body crew-settings-grid">
              <div className="crew-editor"><span>EVA-1</span><SettingsField label="Crew member name" help="Displayed in Operations and Science."><input value={config.crewOneName} onChange={(event) => updateConfig({ crewOneName: event.target.value })} /></SettingsField><SettingsField label="Expedition role" help="Responsibilities during field activities."><textarea value={config.crewOneRole} onChange={(event) => updateConfig({ crewOneRole: event.target.value })} /></SettingsField></div>
              <div className="crew-editor"><span>EVA-2</span><SettingsField label="Crew member name" help="Displayed in Operations and Science."><input value={config.crewTwoName} onChange={(event) => updateConfig({ crewTwoName: event.target.value })} /></SettingsField><SettingsField label="Expedition role" help="Responsibilities during field activities."><textarea value={config.crewTwoRole} onChange={(event) => updateConfig({ crewTwoRole: event.target.value })} /></SettingsField></div>
            </div>
          </section>
        </div>

        <aside className="settings-preview-stack">
          <section className="panel settings-preview"><PanelHeading icon={<Gauge size={14} />} title="LIVE MISSION PREVIEW" /><div className="panel-body"><span>MISSION</span><h2>{config.missionTitle || "Untitled mission"}</h2><small>PRIMARY TARGET</small><strong>{selectedTarget?.name ?? "No target selected"}</strong><p>{config.scienceObjective || "No science objective entered."}</p><div><b>EVA-1</b><span>{config.crewOneName || "Unassigned"} · {config.crewOneRole || "Role not assigned"}</span></div><div><b>EVA-2</b><span>{config.crewTwoName || "Unassigned"} · {config.crewTwoRole || "Role not assigned"}</span></div></div></section>
          <section className="panel locked-settings"><PanelHeading icon={<ShieldAlert size={14} />} title="PROTECTED SYSTEM VALUES" badge="READ ONLY" /><div className="panel-body"><p>These values affect data integrity or safety calculations and cannot be edited from the user interface.</p><LockedSetting label="Exploration site" value="Jezero Crater" /><LockedSetting label="Maximum surface slope" value="15°" /><LockedSetting label="Minimum return reserve" value="60 min" /><LockedSetting label="Coordinate reference" value="Mars 2000 / local metric frame" /><LockedSetting label="NASA data sources" value="CTX · TES · MEDA context" /><LockedSetting label="Hazard provenance" value="Backend or clearly modeled" /></div></section>
          <div className="settings-save-note"><Check size={15} /><span><strong>Saved automatically</strong><small>Mission configuration persists in this browser and updates connected tabs immediately.</small></span></div>
        </aside>
      </div>
    </div>
  );
}

function SettingsField({ label, help, wide = false, children }: { label: string; help: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`mission-settings-field ${wide ? "wide" : ""}`}><span>{label}</span>{children}<small>{help}</small></label>;
}

function LockedSetting({ label, value }: { label: string; value: string }) {
  return <div className="locked-setting"><span>{label}</span><strong>{value}</strong></div>;
}

function PageHeading({
  kicker,
  title,
  description,
  source,
}: {
  kicker: string;
  title: string;
  description: string;
  source?: { label: string; href: string };
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="page-kicker">{kicker}</div>
        <h1 className="page-title">{title} {source && <SourceInfo label={source.label} href={source.href} />}</h1>
        <p className="page-description">{description}</p>
      </div>
      <span className="demo-badge">DEMO ENVIRONMENT</span>
    </div>
  );
}
function PanelHeading({
  icon,
  title,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
}) {
  return (
    <div className="panel-heading">
      <div className="panel-title">
        {icon}
        {title}
      </div>
      {badge && <span className="demo-badge">{badge}</span>}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>
        {label}
        {children}
      </label>
    </div>
  );
}
function RouteCard({
  route,
  selected,
  onSelect,
}: {
  route: MissionRoute;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`route-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="route-card-top">
        <h3>{route.name}</h3>
        {selected && (
          <span className="selected-mark">
            <Check size={12} /> SELECTED
          </span>
        )}
      </div>
      <div className="card-description">{route.terrainNote}</div>
      <div className="route-stats">
        <span>{route.distanceKm.toFixed(1)} km</span>
        <span>{route.durationHours.toFixed(1)} h</span>
        <span>{route.risk} RISK · DEMO</span>
      </div>
    </button>
  );
}
function ResourceBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "cyan" | "orange";
}) {
  return (
    <div className="resource-row">
      <div className="resource-label">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="resource-track">
        <div
          className={`resource-fill ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <button
      className={`switch ${value ? "on" : ""}`}
      onClick={onToggle}
      aria-pressed={value}
    >
      <span className="switch-knob" />
    </button>
  );
}
function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function MapPinIcon() {
  return <Compass size={14} />;
}
function MapIcon() {
  return <Compass size={14} />;
}
