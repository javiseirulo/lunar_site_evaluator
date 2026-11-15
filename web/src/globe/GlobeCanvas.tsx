/**
 * 3D Moon globe — owner: Marta (src/globe). v0 of docs/10-plan-tecnico.md §5.
 *
 * Shared state: reads `sites` and timeseries (useData) and `selectedSiteId` (store); writes `selectSite`.
 * Site pins only appear once a mission requirement is active (useCandidates.ts): candidates in gold,
 * the top five as numbered badges; non-matching sites only with "Show non-matching" (faint grey).
 * No score from sites.json.
 * Local state: the info card (what was clicked), custom pins (customPins.ts) and the camera flight.
 * Custom pins and clicked points never change `selectedSiteId` (docs/10 §"Coordenadas personalizadas").
 * Lighting follows the Mission Clock: Sun direction from @/ephem (sunLight.ts); with no ephemeris
 * for the date it falls back to a fixed light and says so.
 *
 * Mouse: left-drag moves, right-drag rotates, wheel zooms. A click (no drag) on a site pin selects
 * it (click again or ✕ to deselect); on bare ground it shows that point's coordinates.
 *
 * Note: every drei <Html> stays mounted and is shown/hidden through its style. Unmounting an
 * <Html> under React 19 throws "removeChild … not a child of this node" and breaks the tree.
 */
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useNavigate } from 'react-router';
import { AstronautControl, SurfacePicker, type SurfaceBridgeApi } from './GlobeSurfaceBridge';
import { Html, OrbitControls, Stars, useGLTF, useTexture } from '@react-three/drei';
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  MOUSE,
  Matrix4,
  Object3D,
  Quaternion,
  SRGBColorSpace,
  SphereGeometry,
  Sprite,
  Vector3,
} from 'three';
import { useAppStore, useData } from '@/core';
import { GlobeCard, type CardContent } from './GlobeCard';
import { PinForm } from './PinForm';
import { useCustomPins } from './customPins';
import { latLonToVec3, vec3ToLatLon } from './geo';
import { flightAt, planFlight, type Flight } from './flight';
import { useSunDirection } from './sunLight';
import { NIGHT_FILL, useNightLayer } from './nightLayer';
import { Terminator } from './DayNight';
import { usePinSelection } from './pinSelection';
import { LayersMenu } from './LayersMenu';
import { PatchTrigger, PolarPatch, SunLight } from './PolarPatch';
import { ActiveLegend } from '@/layers';
import { GlobalHeat } from './LayerOverlays'; // Javi: whole-Moon heat maps of active layers
import { EXAGGERATION_LABEL, PatchControls } from './PatchControls';
import { loadTerrain, patchOn, useTerrain, useTerrainLift, type LiftFn } from './terrainStore';
import { OUTCOME_COLORS, loadHistoricSites, useHistoric } from './historicSites';
import { useRequirements } from './requirementsStore';
import { useCandidates } from './useCandidates';
import { meetsText } from './missionStats';
import {
  FLIGHT_MS,
  easeInOut,
  standPose,
  useStreetViewFlight,
  type StreetViewRequest,
} from './streetViewFlight';

const TEXTURE_URL = `${import.meta.env.BASE_URL}textures/lroc_color_poles_4k.jpg`;
const PIN_ALTITUDE = 1.002;
/** Pin radius per unit of camera–surface distance, so pins separate when zooming in. */
const PIN_SIZE = 0.012;
const CUSTOM_PIN_COLOR = new Color('#8cc4ff');
/** Sites that miss a requirement: faint grey, so they give context without competing. */
const MISS_PIN_COLOR = new Color('#9aa0aa');
/** Past-landing lander (GLB). Its height is ~2.27 units, the same as the old pyramid cone. */
const LANDER_URL = `${import.meta.env.BASE_URL}models/past_landing_lander.glb`;
/** Emissive share of each non-accent material's base colour, so the lander reads on the night side. */
const LANDER_EMISSIVE = 0.3;
useGLTF.preload(LANDER_URL);
/** Sites that meet every requirement. */
const CANDIDATE_PIN_COLOR = new Color('#f2c55c');
const POLE_MARKER_MIN_DISTANCE = 2;
const POLE_VIEW = { lat: -89, distance: 1.3 };
/** Camera distance from the Moon's centre after flying to a pin added by coordinates. */
const PIN_VIEW_DISTANCE = 1.4;
const INITIAL_CAMERA = latLonToVec3(-30, 0, 3);
/** Degrees the cut sphere keeps past the terrain edge, so no gap opens between them. */
const CAP_OVERLAP_DEG = 0.05;
/** Light used when there is no ephemeris for the Mission Clock date. */
const FIXED_LIGHT_DIR = new Vector3(4, 1.5, 3).normalize().toArray();
/** Camera never closer than this to the Moon's centre (surface = 1). */
const MIN_CAMERA_RADIUS = 1.01;
/** Mouse speed multiplier (1 = three.js default). Lower = slower, finer control. */
const MOUSE_SPEED = 0.5;
/** Left drag moves (pans), right drag rotates, wheel/middle zooms. */
const MOUSE_BUTTONS = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
/** Pointer travel (px) above which a press counts as a drag, not a click. */
const CLICK_TOLERANCE_PX = 4;

type Controls = ComponentRef<typeof OrbitControls>;
type FlightRef = RefObject<Vector3 | null>;
type Focus =
  | { kind: 'site'; id: string }
  | { kind: 'custom'; id: string }
  | { kind: 'historic'; id: string }
  | { kind: 'point'; lat: number; lon: number }
  | null;
type Hover = { kind: 'site' | 'custom'; id: string } | null;

const ORIGIN = new Vector3();

/** Stops DOM events in overlays from reaching the R3F canvas (which would raycast the Moon). */
const stop = (e: SyntheticEvent) => e.stopPropagation();

export default function GlobeCanvas() {
  const [cameraStart] = useState(() => {
    const point = useAppStore.getState().selectedPoint;
    return point ? latLonToVec3(point.lat, point.lon, 3) : INITIAL_CAMERA;
  });
  const navigate = useNavigate();
  const surfaceApiRef = useRef<SurfaceBridgeApi | null>(null);
  const [placingAstronaut, setPlacingAstronaut] = useState(false);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPlacingAstronaut(false);
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, []);
  const flightRef = useRef<Vector3 | null>(null);
  const controlsRef = useRef<Controls>(null);
  const [textureReady, setTextureReady] = useState(false);
  const now = useAppStore((s) => s.currentTimeUTC);
  // DESIGN.md: Normal mode keeps one main action; pinning by coordinates is an Expert tool.
  const expert = useAppStore((s) => s.proMode);
  const sun = useSunDirection(now);
  const sunDir = sun.dir;
  const nightOn = useNightLayer((s) => s.on);
  const exaggerated = useTerrain((s) => patchOn(s) && s.exaggeration === 2);

  const sites = useData((s) => s.sites);
  const { evaluations, topRank } = useCandidates();
  const pins = useCustomPins((s) => s.pins);
  const addPin = useCustomPins((s) => s.addPin);
  const removePin = useCustomPins((s) => s.removePin);
  const historic = useHistoric((s) => s.sites);
  const historicVisible = useHistoric((s) => s.visible);

  // Past landings: load once; on failure the switch shows "unavailable" and the globe carries on.
  useEffect(() => {
    void loadHistoricSites();
  }, []);

  const [focus, setFocus] = useState<Focus>(() => {
    const point = useAppStore.getState().selectedPoint;
    if (point && useAppStore.getState().selectedSiteId === 'free')
      return { kind: 'point', ...point };
    const id = useAppStore.getState().selectedSiteId;
    return id ? { kind: 'site', id } : null;
  });

  // Follow selections made elsewhere (list, search box) and deselections.
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (s.selectedSiteId === prev.selectedSiteId) return;
        const id = s.selectedSiteId;
        setFocus((f) => (id ? { kind: 'site', id } : f?.kind === 'site' ? null : f));
      }),
    [],
  );

  const card = useMemo<CardContent | null>(() => {
    if (!focus) return null;
    const pastOf = (id: string) =>
      historicVisible ? (historic.find((h) => h.id === id) ?? null) : null;
    if (focus.kind === 'point') return focus;
    if (focus.kind === 'site') {
      const e = evaluations?.find((x) => x.site.id === focus.id);
      if (e) {
        const miss = e.checks.find((c) => c.status === 'fail');
        return {
          kind: 'site',
          site: e.site,
          rank: topRank.get(e.site.id) ?? null,
          summary: meetsText(e),
          note: miss?.text ?? null,
          past: pastOf(e.site.id),
        };
      }
      // Selected elsewhere (list, 2D map) with no requirement active.
      const site = sites?.find((s) => s.id === focus.id);
      return site
        ? { kind: 'site', site, rank: null, summary: null, note: null, past: pastOf(site.id) }
        : null;
    }
    if (focus.kind === 'historic') {
      if (!historicVisible) return null; // layer switched off: no card for a marker that is not drawn
      const h = historic.find((x) => x.id === focus.id);
      return h ? { kind: 'historic', site: h } : null;
    }
    const pin = pins.find((p) => p.id === focus.id);
    return pin ? { kind: 'custom', pin } : null;
  }, [focus, evaluations, topRank, sites, pins, historic, historicVisible]);

  const onSiteClick = (id: string) => {
    const { selectedSiteId, selectSite } = useAppStore.getState();
    if (selectedSiteId !== id) selectSite(id);
    else if (focus?.kind === 'site' && focus.id === id) selectSite(null);
    else setFocus({ kind: 'site', id }); // selected, but the card showed something else
  };

  // Past landings open their own card; they are not candidates, so selectSite is never called.
  const onHistoricClick = (id: string) =>
    setFocus((f) => (f?.kind === 'historic' && f.id === id ? null : { kind: 'historic', id }));

  const onCustomClick = (id: string) =>
    setFocus((f) => (f?.kind === 'custom' && f.id === id ? null : { kind: 'custom', id }));

  // The right-hand card shows the statistics of the selected own pin.
  const focusedPinId = focus?.kind === 'custom' ? focus.id : null;
  useEffect(() => {
    usePinSelection.getState().setPinId(focusedPinId);
    return () => usePinSelection.getState().setPinId(null);
  }, [focusedPinId]);

  const closeCard = () => {
    if (focus?.kind === 'site') useAppStore.getState().selectSite(null);
    else setFocus(null);
  };

  const createPin = (lat: number, lon: number, name?: string) => {
    const pin = addPin({ lat, lon, name });
    setFocus({ kind: 'custom', id: pin.id });
    return pin;
  };

  const onSurfaceClick = (lat: number, lon: number) => {
    if (placingAstronaut) {
      setPlacingAstronaut(false);
      surfaceApiRef.current?.enter({ lat, lon });
    } else setFocus({ kind: 'point', lat, lon });
  };

  return (
    <div
      className="relative size-full overflow-hidden bg-black"
      role="region"
      aria-label="3D Moon globe with candidate landing sites. Left-drag to move, right-drag to rotate, scroll to zoom, click the ground for coordinates."
    >
      <Canvas
        camera={{ position: cameraStart, fov: 45, near: 0.001, far: 200 }}
        dpr={[1, 2]}
        shadows
      >
        <color attach="background" args={['#000000']} />
        {/* No atmosphere: almost no fill light, so the night side is dark (unless the Day / night layer is on). */}
        {nightOn ? (
          <ambientLight color={NIGHT_FILL.color} intensity={NIGHT_FILL.intensity} />
        ) : (
          <ambientLight intensity={sunDir ? 0.04 : 0.35} />
        )}
        <Terminator sun={sunDir} />
        <SunLight direction={sunDir ?? FIXED_LIGHT_DIR} intensity={sunDir ? 2.6 : 2} />
        <Stars radius={60} depth={30} count={3000} factor={3} saturation={0} fade />
        <Suspense fallback={<PlaceholderMoon />}>
          <Moon onReady={() => setTextureReady(true)} onSurfaceClick={onSurfaceClick} />
        </Suspense>
        {/* Javi: global heat map (grid/global_1deg.bin) for active sunlight / Earth layers. */}
        <GlobalHeat />
        <Pins focus={focus} onSiteClick={onSiteClick} onCustomClick={onCustomClick} />
        <HistoricMarkers
          focusId={focus?.kind === 'historic' ? focus.id : null}
          onClick={onHistoricClick}
        />
        {focus?.kind === 'point' && <PointMarker lat={focus.lat} lon={focus.lon} />}
        <CardAnchor
          card={card}
          onClose={closeCard}
          onCreatePin={(lat, lon) => createPin(lat, lon)}
          onDeletePin={(id) => {
            removePin(id);
            setFocus(null);
          }}
        />
        <PolarPatch onSurfaceClick={onSurfaceClick} clickTolerancePx={CLICK_TOLERANCE_PX} />
        <PatchTrigger />
        <PoleMarker flightRef={flightRef} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          mouseButtons={MOUSE_BUTTONS}
          screenSpacePanning
          enableDamping
          dampingFactor={0.08}
          minDistance={1.01}
          maxDistance={5}
          zoomSpeed={MOUSE_SPEED}
        />
        <CameraRig flightRef={flightRef} controlsRef={controlsRef} />
        <SurfacePicker apiRef={surfaceApiRef} onEnter={navigate} />
      </Canvas>
      <AstronautControl
        apiRef={surfaceApiRef}
        armed={placingAstronaut}
        onArmed={setPlacingAstronaut}
      />
      <div className="absolute top-2 left-2 flex flex-col items-start gap-2">
        {expert && (
          <PinForm
            onAdd={({ name, lat, lon }) => {
              createPin(lat, lon, name);
              // Fly above the new pin (avoid the exact pole, where the orbit is undefined).
              const safeLat = Math.max(-89.5, Math.min(89.5, lat));
              flightRef.current = new Vector3(...latLonToVec3(safeLat, lon, PIN_VIEW_DISTANCE));
            }}
          />
        )}
        <PatchControls />
      </div>
      <div className="absolute bottom-2 left-2 z-[60]">
        <LayersMenu hasSun={!!sunDir} expert={expert} />
      </div>
      {/* Javi: legend of the active map layers (Expert only, like the layers panel). */}
      {expert && <ActiveLegend className="pointer-events-none absolute top-2 right-2" />}
      {exaggerated && (
        <div
          role="note"
          className="pointer-events-none absolute bottom-2 left-[72px] rounded-[2px] bg-black/70 px-2 py-1 text-[11px] text-white"
        >
          {EXAGGERATION_LABEL}
        </div>
      )}
      {sun.status === 'no_ephemeris' && (
        <div
          role="status"
          className="pointer-events-none absolute right-2 bottom-2 rounded-[2px] bg-black/70 px-2 py-1 text-[11px] text-white"
        >
          No ephemeris for this date · fixed lighting
        </div>
      )}
      {!textureReady && (
        <div
          role="status"
          className="text-ink-muted pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px]"
        >
          Loading Moon texture…
        </div>
      )}
    </div>
  );
}

/** Grey sphere shown while the Moon texture loads (also used by CinematicCanvas). */
export function PlaceholderMoon() {
  return (
    <mesh>
      <sphereGeometry args={[1, 64, 32]} />
      <meshStandardMaterial color="#3a3a3a" roughness={1} />
    </mesh>
  );
}

/** Textured Moon sphere (also used by CinematicCanvas). */
export function Moon({
  onReady,
  onSurfaceClick,
}: {
  onReady: () => void;
  onSurfaceClick: (lat: number, lon: number) => void;
}) {
  const texture = useTexture(TEXTURE_URL, (t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
  });
  useEffect(onReady, [onReady]);
  // While the polar terrain is loaded, cut the textured sphere's cap south of the patch edge
  // (with a sliver of overlap) so it never shows through the terrain.
  const patchReady = useTerrain(patchOn);
  const latLimit = useTerrain((s) => s.header?.lat_limit ?? -80);
  const geometry = useMemo(() => {
    const thetaLength = patchReady ? ((90 - latLimit + CAP_OVERLAP_DEG) * Math.PI) / 180 : Math.PI;
    const g = new SphereGeometry(1, 128, 64, 0, Math.PI * 2, 0, thetaLength);
    if (thetaLength < Math.PI) {
      // SphereGeometry stretches v over thetaLength; put it back to the full texture's latitude.
      const uv = g.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - ((1 - uv.getY(i)) * thetaLength) / Math.PI);
      uv.needsUpdate = true;
    }
    return g;
  }, [patchReady, latLimit]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      userData={{ lunarSurface: true }}
      onClick={(e) => {
        if (e.delta > CLICK_TOLERANCE_PX) return; // it was a drag (pan/rotate)
        const [lat, lon] = vec3ToLatLon(e.point.x, e.point.y, e.point.z);
        onSurfaceClick(lat, lon);
      }}
    >
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

const rankTextures = new Map<number, CanvasTexture>();

/** Gold disc with the top-5 rank number, drawn once per rank. */
function rankTexture(rank: number): CanvasTexture {
  let t = rankTextures.get(rank);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f2c55c';
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#1c1915';
    g.stroke();
    g.fillStyle = '#1c1915';
    g.font = 'bold 38px Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(rank), 32, 35);
    t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    rankTextures.set(rank, t);
  }
  return t;
}

/** True when a surface point faces the camera (not hidden behind the globe). */
function facesCamera(point: Vector3, camera: Vector3): boolean {
  return point.dot(camera) > point.lengthSq();
}

/** Marker anchor just above the ground: on the polar terrain where it is loaded, else the sphere. */
function surfacePoint(lat: number, lon: number, lift: LiftFn): Vector3 {
  return new Vector3(...latLonToVec3(lat, lon, PIN_ALTITUDE + lift(lat, lon)));
}

function Pins({
  focus,
  onSiteClick,
  onCustomClick,
}: {
  focus: Focus;
  onSiteClick: (id: string) => void;
  onCustomClick: (id: string) => void;
}) {
  const { evaluations, topRank, loading } = useCandidates();
  const showNonMatching = useRequirements((s) => s.showNonMatching);
  const pins = useCustomPins((s) => s.pins);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const [hover, setHover] = useState<Hover>(null);

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hover]);

  const setHovered = (kind: 'site' | 'custom', id: string, over: boolean) =>
    setHover((h) => (over ? { kind, id } : h?.kind === kind && h.id === id ? null : h));

  // Hover label, unless the card already shows that pin.
  const focusedId = focus && focus.kind !== 'point' ? focus.id : null;
  let label: { lat: number; lon: number; text: string } | null = null;
  if (hover && hover.id !== focusedId) {
    if (hover.kind === 'site') {
      const e = evaluations?.find((x) => x.site.id === hover.id);
      if (e) {
        const rank = topRank.get(e.site.id);
        const text = e.candidate
          ? `${rank ? `#${rank} ` : ''}${e.site.name}`
          : `${e.site.name} · ${meetsText(e).toLowerCase()}`;
        label = { lat: e.site.lat, lon: e.site.lon, text };
      }
    } else {
      const p = pins.find((x) => x.id === hover.id);
      if (p) label = { lat: p.lat, lon: p.lon, text: p.name };
    }
  }

  return (
    <group>
      {evaluations
        // Wait for every timeseries: no gold flash of sites that have not been checked yet.
        ?.filter((e) => !loading && (e.candidate || showNonMatching))
        .map(({ site, candidate }) => (
          <Pin
            key={site.id}
            lat={site.lat}
            lon={site.lon}
            color={candidate ? CANDIDATE_PIN_COLOR : MISS_PIN_COLOR}
            opacity={candidate ? 1 : 0.3}
            rank={topRank.get(site.id)}
            selected={site.id === selectedSiteId}
            onClick={() => onSiteClick(site.id)}
            onHover={(over) => setHovered('site', site.id, over)}
          />
        ))}
      {pins.map((pin) => (
        <Pin
          key={pin.id}
          lat={pin.lat}
          lon={pin.lon}
          color={CUSTOM_PIN_COLOR}
          opacity={1}
          diamond
          selected={focus?.kind === 'custom' && focus.id === pin.id}
          onClick={() => onCustomClick(pin.id)}
          onHover={(over) => setHovered('custom', pin.id, over)}
        />
      ))}
      <HoverLabel label={label} />
    </group>
  );
}

function Pin({
  lat,
  lon,
  color,
  opacity,
  selected,
  diamond = false,
  rank,
  onClick,
  onHover,
}: {
  lat: number;
  lon: number;
  color: Color;
  opacity: number;
  selected: boolean;
  diamond?: boolean;
  /** 1–5: drawn as a numbered badge instead of a dot. */
  rank?: number;
  onClick: () => void;
  onHover: (over: boolean) => void;
}) {
  const pin = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const badge = useRef<Sprite>(null);
  const lift = useTerrainLift();
  const position = useMemo(() => surfacePoint(lat, lon, lift), [lat, lon, lift]);

  useEffect(() => {
    pin.current?.lookAt(0, 0, 0);
    ring.current?.lookAt(0, 0, 0);
  }, [selected, position]);

  useFrame(({ camera }) => {
    const distance = Math.max(camera.position.length() - 1, 0.005);
    const s = PIN_SIZE * distance * (selected ? 1.6 : 1);
    pin.current?.scale.setScalar(s);
    ring.current?.scale.setScalar(s);
    badge.current?.scale.setScalar(s * 2.6);
  });

  return (
    <>
      <mesh
        ref={pin}
        position={position}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation(); // never reaches the Moon underneath
          if (e.delta > CLICK_TOLERANCE_PX) return;
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        {diamond ? <octahedronGeometry args={[1.3, 0]} /> : <sphereGeometry args={[1, 16, 12]} />}
        <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
      </mesh>
      {rank !== undefined && (
        // Badge only: clicks go to the pin mesh underneath (sprites without handlers are not hit-tested).
        <sprite ref={badge} position={position}>
          <spriteMaterial map={rankTexture(rank)} toneMapped={false} />
        </sprite>
      )}
      {selected && (
        <mesh ref={ring} position={position}>
          <ringGeometry args={[1.6, 2.1, 32]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} side={DoubleSide} />
        </mesh>
      )}
    </>
  );
}

/** Small white ring where the ground was clicked. */
function PointMarker({ lat, lon }: { lat: number; lon: number }) {
  const ring = useRef<Mesh>(null);
  const lift = useTerrainLift();
  const position = useMemo(() => surfacePoint(lat, lon, lift), [lat, lon, lift]);
  useEffect(() => {
    ring.current?.lookAt(0, 0, 0);
  }, [position]);
  useFrame(({ camera }) => {
    ring.current?.scale.setScalar(PIN_SIZE * Math.max(camera.position.length() - 1, 0.005));
  });
  return (
    <mesh ref={ring} position={position}>
      <ringGeometry args={[0.6, 1, 24]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} side={DoubleSide} />
    </mesh>
  );
}

/** Always-mounted hover label; hidden when there is none or it is behind the globe. */
function HoverLabel({ label }: { label: { lat: number; lon: number; text: string } | null }) {
  const div = useRef<HTMLDivElement>(null);
  const lift = useTerrainLift();
  const position = useMemo(
    () => (label ? surfacePoint(label.lat, label.lon, lift) : new Vector3()),
    [label?.lat, label?.lon, lift], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useFrame(({ camera }) => {
    if (!div.current) return;
    div.current.style.display = label && facesCamera(position, camera.position) ? '' : 'none';
  });

  return (
    <Html position={position} style={{ pointerEvents: 'none' }} zIndexRange={[20, 10]}>
      <div
        ref={div}
        style={{ display: 'none' }}
        className="ml-2 -translate-y-1/2 rounded-[2px] border border-white/25 bg-black/85 px-1.5 py-0.5 text-[12px] whitespace-nowrap text-white"
      >
        {label?.text}
      </div>
    </Html>
  );
}

/**
 * Past landings: small triangular pyramids pointing away from the surface, coloured by outcome.
 * Shape differs from candidate pins (spheres) and custom pins (diamonds). The hover label stays mounted.
 */
function HistoricMarkers({
  focusId,
  onClick,
}: {
  focusId: string | null;
  onClick: (id: string) => void;
}) {
  const sites = useHistoric((s) => s.sites);
  const visible = useHistoric((s) => s.visible);
  const status = useHistoric((s) => s.status);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const shown = visible && status === 'ready';
  // Where a candidate pin is already drawn (same id), skip the triangle so the pin stays clickable;
  // the candidate's card shows the past landing instead.
  const { evaluations, loading } = useCandidates();
  const showNonMatching = useRequirements((s) => s.showNonMatching);
  const pinned = useMemo(
    () =>
      new Set(
        loading
          ? []
          : (evaluations ?? []).filter((e) => e.candidate || showNonMatching).map((e) => e.site.id),
      ),
    [evaluations, loading, showNonMatching],
  );

  // Hidden markers never fire pointer-out, so the cursor also depends on the layer being shown.
  useEffect(() => {
    if (!hoverId || !shown) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hoverId, shown]);

  const hovered =
    shown && hoverId && hoverId !== focusId ? sites.find((s) => s.id === hoverId) : null;
  const label = hovered
    ? {
        lat: hovered.lat,
        lon: hovered.lon,
        text: `${hovered.name} · ${hovered.date_utc.slice(0, 4)}`,
      }
    : null;

  return (
    <group>
      {shown &&
        sites
          .filter((h) => !pinned.has(h.id))
          .map((h) => (
            <HistoricMarker
              key={h.id}
              lat={h.lat}
              lon={h.lon}
              color={OUTCOME_COLORS[h.outcome]}
              selected={h.id === focusId}
              onClick={() => onClick(h.id)}
              onHover={(over) => setHoverId((cur) => (over ? h.id : cur === h.id ? null : cur))}
            />
          ))}
      <HoverLabel label={label} />
    </group>
  );
}

const UP = new Vector3(0, 1, 0);

function HistoricMarker({
  lat,
  lon,
  color,
  selected,
  onClick,
  onHover,
}: {
  lat: number;
  lon: number;
  color: string;
  selected: boolean;
  onClick: () => void;
  onHover: (over: boolean) => void;
}) {
  const group = useRef<Group>(null);
  const lift = useTerrainLift();
  const position = useMemo(() => surfacePoint(lat, lon, lift), [lat, lon, lift]);

  useEffect(() => {
    // Local +Y (the pyramid's axis) along the outward normal.
    group.current?.quaternion.setFromUnitVectors(UP, position.clone().normalize());
  }, [position]);

  useFrame(({ camera }) => {
    const distance = Math.max(camera.position.length() - 1, 0.005);
    group.current?.scale.setScalar(PIN_SIZE * distance * (selected ? 1.6 : 1.1));
  });

  return (
    <group ref={group} position={position}>
      <LanderOrCone color={color} />
      {/* Invisible click target: the old cone's footprint, so small markers stay easy to press. */}
      <mesh
        position={[0, 1.2, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation(); // never reaches the Moon underneath
          if (e.delta > CLICK_TOLERANCE_PX) return;
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        <coneGeometry args={[1, 2.4, 3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.6, 2.1, 32]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} side={DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Clones the cached GLB scene for one marker. Materials are cloned too (the cache is never mutated);
 * geometry stays shared with the cache, so only these materials need disposing.
 */
function buildLander(source: Object3D, outcomeColor: string) {
  const root = source.clone(true);
  const owned = new Map<Material, MeshStandardMaterial>();
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    // Clicks and hover go to the invisible cone, so the 34 model meshes are never ray-tested.
    mesh.raycast = () => null;
    const original = mesh.material as MeshStandardMaterial;
    let copy = owned.get(original);
    if (!copy) {
      copy = original.clone();
      if (copy.name === 'outcome_accent') {
        copy.color.set(outcomeColor);
        copy.emissive.set(outcomeColor);
      } else {
        copy.emissive.copy(copy.color).multiplyScalar(LANDER_EMISSIVE);
      }
      owned.set(original, copy);
    }
    mesh.material = copy;
  });
  return { root, materials: [...owned.values()] };
}

/** Plain cone shown while the lander model loads, or instead of it if the file cannot be loaded. */
function LanderCone({ color }: { color: string }) {
  return (
    <mesh position={[0, 1.2, 0]} raycast={() => null}>
      <coneGeometry args={[1, 2.4, 3]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** A failed model load must never take the whole globe down (it would fall back to the 2D map). */
class LanderBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LanderOrCone({ color }: { color: string }) {
  const cone = <LanderCone color={color} />;
  return (
    <LanderBoundary fallback={cone}>
      <Suspense fallback={cone}>
        <HistoricLander color={color} />
      </Suspense>
    </LanderBoundary>
  );
}

/** The lander model for one past-landing marker, standing on the origin with +Y as its axis. */
function HistoricLander({ color }: { color: string }) {
  const { scene } = useGLTF(LANDER_URL);
  const lander = useMemo(() => buildLander(scene, color), [scene, color]);
  useEffect(() => () => lander.materials.forEach((m) => m.dispose()), [lander]);
  return <primitive object={lander.root} />;
}

/** Always-mounted anchor for the info card next to the clicked pin or point. */
function CardAnchor({
  card,
  onClose,
  onCreatePin,
  onDeletePin,
}: {
  card: CardContent | null;
  onClose: () => void;
  onCreatePin: (lat: number, lon: number) => void;
  onDeletePin: (id: string) => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const coords = card
    ? card.kind === 'site' || card.kind === 'historic'
      ? card.site
      : card.kind === 'custom'
        ? card.pin
        : card
    : null;
  const lat = coords?.lat ?? 0;
  const lon = coords?.lon ?? 0;
  const lift = useTerrainLift();
  const position = useMemo(() => surfacePoint(lat, lon, lift), [lat, lon, lift]);

  useFrame(({ camera }) => {
    if (!wrapper.current) return;
    wrapper.current.style.display = card && facesCamera(position, camera.position) ? '' : 'none';
  });

  return (
    <Html position={position} zIndexRange={[40, 30]}>
      <div
        ref={wrapper}
        style={{ display: 'none', transform: 'translate(14px, -50%)' }}
        onPointerDown={stop}
        onPointerUp={stop}
        onClick={stop}
        onWheel={stop}
      >
        {card && (
          <GlobeCard
            content={card}
            onClose={onClose}
            onCreatePin={onCreatePin}
            onDeletePin={onDeletePin}
          />
        )}
      </div>
    </Html>
  );
}

function PoleMarker({ flightRef }: { flightRef: FlightRef }) {
  const { active, loading, candidates } = useCandidates();
  const wrapper = useRef<HTMLDivElement>(null);
  const position = useMemo(() => new Vector3(...latLonToVec3(-90, 0, 1.02)), []);
  // With no requirement no sites are shown, so the marker just says "South Pole".
  const matching = active && !loading ? candidates.filter((e) => e.site.lat <= -80).length : null;

  useFrame(({ camera }) => {
    if (!wrapper.current) return;
    const show =
      camera.position.length() > POLE_MARKER_MIN_DISTANCE && facesCamera(position, camera.position);
    wrapper.current.style.display = show ? '' : 'none';
  });

  return (
    <Html position={position} center zIndexRange={[30, 20]}>
      <div ref={wrapper} style={{ display: 'none' }} onPointerDown={stop} onPointerUp={stop}>
        <button
          type="button"
          className="btn whitespace-nowrap"
          onClick={(e) => {
            e.stopPropagation();
            flightRef.current = new Vector3(); // azimuth filled in by CameraRig
            void loadTerrain(); // the polar terrain loads on demand
          }}
        >
          {matching === null ? 'South Pole' : `South Pole · ${matching} matching`}
        </button>
      </div>
    </Html>
  );
}

/** Flies the camera (to the pole or a new pin), scales speeds with altitude, keeps it outside. */
function CameraRig({
  flightRef,
  controlsRef,
}: {
  flightRef: FlightRef;
  controlsRef: RefObject<Controls | null>;
}) {
  const camera = useThree((s) => s.camera);
  const siteFlight = useRef<{ flight: Flight; elapsed: number } | null>(null);

  // Any selection of a site (list, globe pin, header finder) flies the camera to it.
  useEffect(() => {
    const fly = (id: string | null) => {
      if (!id) return;
      const site = useData.getState().sites?.find((x) => x.id === id);
      if (!site) return;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const flight = planFlight(
        camera.position.toArray() as [number, number, number],
        latLonToVec3(site.lat, site.lon),
      );
      flightRef.current = null;
      if (reduced) {
        siteFlight.current = null;
        const end = flightAt(flight, flight.duration).position;
        camera.position.set(...end);
        controlsRef.current?.target.set(0, 0, 0);
        controlsRef.current?.update();
        return;
      }
      siteFlight.current = { flight, elapsed: 0 };
    };
    // An observed point already sets cameraStart when returning from Street View.
    // Otherwise fly to a selected site as soon as the catalogue is loaded.
    let pending: (() => void) | null = null;
    const initial = useAppStore.getState().selectedSiteId;
    if (initial && !useAppStore.getState().selectedPoint) {
      if (useData.getState().sites) fly(initial);
      else
        pending = useData.subscribe((d) => {
          if (!d.sites) return;
          pending?.();
          pending = null;
          const app = useAppStore.getState();
          if (app.selectedSiteId === initial && !app.selectedPoint) fly(initial);
        });
    }
    const unsub = useAppStore.subscribe((s, prev) => {
      if (s.selectedSiteId !== prev.selectedSiteId) fly(s.selectedSiteId);
    });
    return () => {
      pending?.();
      unsub();
    };
  }, [camera, controlsRef, flightRef]);

  const lift = useTerrainLift();
  const svRequest = useStreetViewFlight((s) => s.request);
  /** "Stand here" flight in progress: start pose and clock. */
  const svFlight = useRef<{
    req: StreetViewRequest;
    startMs: number;
    from: Vector3;
    fromTurn: Quaternion;
  } | null>(null);

  useEffect(() => {
    const setActive = useStreetViewFlight.getState().setGlobeActive;
    setActive(true);
    return () => setActive(false);
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!svRequest || !controls) return;
    flightRef.current = null; // the street view flight wins over any other flight
    controls.enabled = false;
    svFlight.current = {
      req: svRequest,
      startMs: performance.now(),
      from: camera.position.clone(),
      fromTurn: camera.quaternion.clone(),
    };
  }, [svRequest, camera, controlsRef, flightRef]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancel = () => {
      flightRef.current = null;
      siteFlight.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controlsRef, flightRef]);

  useFrame((_, dt) => {
    const sv = svFlight.current;
    if (sv) {
      const e = easeInOut((performance.now() - sv.startMs) / FLIGHT_MS);
      const { lat, lon } = sv.req;
      const pose = standPose(lat, lon, lift(lat, lon), sv.from.toArray());
      const end = new Vector3(...pose.position);
      // Along the globe (direction and radius separately), never through it.
      const radius = sv.from.length() + (end.length() - sv.from.length()) * e;
      camera.position.lerpVectors(sv.from.clone().normalize(), end.clone().normalize(), e);
      camera.position.setLength(radius);
      // Turn from the globe view to a level look at the horizon with the local up as "up"
      // (lookAt with the world +Y would turn the view upside down near the south pole).
      const endTurn = new Quaternion().setFromRotationMatrix(
        new Matrix4().lookAt(end, new Vector3(...pose.target), end.clone().normalize()),
      );
      camera.quaternion.slerpQuaternions(sv.fromTurn, endTurn, e);
      if (e >= 1) {
        svFlight.current = null;
        useStreetViewFlight.getState().clear();
        if (sv.req.onArrive) sv.req.onArrive();
        else useAppStore.getState().setMode('streetview');
      }
      return; // controls and the minimum radius stay out of the way while flying down
    }
    const target = flightRef.current;
    const sf = siteFlight.current;
    if (target) siteFlight.current = null;
    else if (sf) {
      sf.elapsed += Math.min(dt, 0.05);
      const { position, done } = flightAt(sf.flight, sf.elapsed);
      camera.position.set(...position);
      // Hand the orbit target back to the Moon's centre so orbiting after landing does not jump.
      controlsRef.current?.target.lerp(ORIGIN, done ? 1 : 1 - Math.exp(-dt * 8));
      if (done) siteFlight.current = null;
    }
    if (target) {
      if (target.lengthSq() === 0) {
        // Pole: keep the current azimuth so the globe tilts down instead of spinning.
        const lon = (Math.atan2(-camera.position.z, camera.position.x) * 180) / Math.PI;
        target.set(...latLonToVec3(POLE_VIEW.lat, lon, POLE_VIEW.distance));
      }
      const k = 1 - Math.exp(-dt * 3);
      camera.position.lerp(target, k);
      // Re-centre on the Moon after any panning, so the flight ends looking at the target.
      controlsRef.current?.target.lerp(ORIGIN, k);
      if (camera.position.distanceTo(target) < 0.002) flightRef.current = null;
    }
    const controls = controlsRef.current;
    if (controls) {
      const altitude = camera.position.length() - 1;
      controls.rotateSpeed = MOUSE_SPEED * Math.min(1, Math.max(0.05, altitude * 0.6));
      controls.panSpeed = MOUSE_SPEED * Math.min(1, Math.max(0.05, altitude * 0.8));
      // Panning moves the orbit target; keep it inside the Moon so the globe stays in view.
      if (controls.target.length() > 1) controls.target.setLength(1);
    }
    // Panning can push the camera towards the surface: never let it go inside.
    if (camera.position.length() < MIN_CAMERA_RADIUS) camera.position.setLength(MIN_CAMERA_RADIUS);
  });

  return null;
}
