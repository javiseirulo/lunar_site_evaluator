/**
 * 3D Moon globe — owner: Marta (src/globe). v0 of docs/10-plan-tecnico.md §5.
 *
 * Shared state: reads `sites` and timeseries (useData) and `selectedSiteId` (store); writes `selectSite`.
 * Site pins only appear once a mission requirement is active (useCandidates.ts): candidates in gold,
 * the top five as numbered badges; non-matching sites only with "Show non-matching" (faint grey).
 * No score from sites.json.
 * Local state: the info card (what was clicked), custom pins (customPins.ts) and the camera flight.
 * Custom pins and clicked points never change `selectedSiteId` (docs/10 §"Coordenadas personalizadas").
 * Fixed light for now: Sun direction from the timeseries arrives in v2.
 *
 * Mouse: left-drag moves, right-drag rotates, wheel zooms. A click (no drag) on a site pin selects
 * it (click again or ✕ to deselect); on bare ground it shows that point's coordinates.
 *
 * Note: every drei <Html> stays mounted and is shown/hidden through its style. Unmounting an
 * <Html> under React 19 throws "removeChild … not a child of this node" and breaks the tree.
 */
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei';
import {
  CanvasTexture,
  Color,
  DoubleSide,
  MOUSE,
  Mesh,
  SRGBColorSpace,
  Sprite,
  Vector3,
} from 'three';
import { useAppStore, useData } from '@/core';
import { GlobeCard, type CardContent } from './GlobeCard';
import { PinForm } from './PinForm';
import { useCustomPins } from './customPins';
import { latLonToVec3, vec3ToLatLon } from './geo';
import { useRequirements } from './requirementsStore';
import { useCandidates } from './useCandidates';
import { meetsText } from './missionStats';

const TEXTURE_URL = `${import.meta.env.BASE_URL}textures/lroc_color_poles_4k.jpg`;
const PIN_ALTITUDE = 1.002;
/** Pin radius per unit of camera–surface distance, so pins separate when zooming in. */
const PIN_SIZE = 0.012;
const CUSTOM_PIN_COLOR = new Color('#8cc4ff');
/** Sites that miss a requirement: faint grey, so they give context without competing. */
const MISS_PIN_COLOR = new Color('#9aa0aa');
/** Sites that meet every requirement. */
const CANDIDATE_PIN_COLOR = new Color('#f2c55c');
const POLE_MARKER_MIN_DISTANCE = 2;
const POLE_VIEW = { lat: -89, distance: 1.3 };
/** Camera distance from the Moon's centre after flying to a pin added by coordinates. */
const PIN_VIEW_DISTANCE = 1.4;
const INITIAL_CAMERA = latLonToVec3(-30, 0, 3);
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
  | { kind: 'point'; lat: number; lon: number }
  | null;
type Hover = { kind: 'site' | 'custom'; id: string } | null;

const ORIGIN = new Vector3();

/** Stops DOM events in overlays from reaching the R3F canvas (which would raycast the Moon). */
const stop = (e: SyntheticEvent) => e.stopPropagation();

export default function GlobeCanvas() {
  const flightRef = useRef<Vector3 | null>(null);
  const controlsRef = useRef<Controls>(null);
  const [textureReady, setTextureReady] = useState(false);

  const sites = useData((s) => s.sites);
  const { evaluations, topRank } = useCandidates();
  const pins = useCustomPins((s) => s.pins);
  const addPin = useCustomPins((s) => s.addPin);
  const removePin = useCustomPins((s) => s.removePin);

  const [focus, setFocus] = useState<Focus>(() => {
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
        };
      }
      // Selected elsewhere (list, 2D map) with no requirement active.
      const site = sites?.find((s) => s.id === focus.id);
      return site ? { kind: 'site', site, rank: null, summary: null, note: null } : null;
    }
    const pin = pins.find((p) => p.id === focus.id);
    return pin ? { kind: 'custom', pin } : null;
  }, [focus, evaluations, topRank, sites, pins]);

  const onSiteClick = (id: string) => {
    const { selectedSiteId, selectSite } = useAppStore.getState();
    if (selectedSiteId !== id) selectSite(id);
    else if (focus?.kind === 'site' && focus.id === id) selectSite(null);
    else setFocus({ kind: 'site', id }); // selected, but the card showed something else
  };

  const onCustomClick = (id: string) =>
    setFocus((f) => (f?.kind === 'custom' && f.id === id ? null : { kind: 'custom', id }));

  const closeCard = () => {
    if (focus?.kind === 'site') useAppStore.getState().selectSite(null);
    else setFocus(null);
  };

  const createPin = (lat: number, lon: number, name?: string) => {
    const pin = addPin({ lat, lon, name });
    setFocus({ kind: 'custom', id: pin.id });
    return pin;
  };

  return (
    <div
      className="relative size-full overflow-hidden bg-black"
      role="region"
      aria-label="3D Moon globe with candidate landing sites. Left-drag to move, right-drag to rotate, scroll to zoom, click the ground for coordinates."
    >
      <Canvas camera={{ position: INITIAL_CAMERA, fov: 45, near: 0.001, far: 200 }} dpr={[1, 2]}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 1.5, 3]} intensity={2} />
        <Stars radius={60} depth={30} count={3000} factor={3} saturation={0} fade />
        <Suspense fallback={<PlaceholderMoon />}>
          <Moon
            onReady={() => setTextureReady(true)}
            onSurfaceClick={(lat, lon) => setFocus({ kind: 'point', lat, lon })}
          />
        </Suspense>
        <Pins focus={focus} onSiteClick={onSiteClick} onCustomClick={onCustomClick} />
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
      </Canvas>
      <div className="absolute top-2 left-2">
        <PinForm
          onAdd={({ name, lat, lon }) => {
            createPin(lat, lon, name);
            // Fly above the new pin (avoid the exact pole, where the orbit is undefined).
            const safeLat = Math.max(-89.5, Math.min(89.5, lat));
            flightRef.current = new Vector3(...latLonToVec3(safeLat, lon, PIN_VIEW_DISTANCE));
          }}
        />
      </div>
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

function PlaceholderMoon() {
  return (
    <mesh>
      <sphereGeometry args={[1, 64, 32]} />
      <meshStandardMaterial color="#3a3a3a" roughness={1} />
    </mesh>
  );
}

function Moon({
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
  return (
    <mesh
      onClick={(e) => {
        if (e.delta > CLICK_TOLERANCE_PX) return; // it was a drag (pan/rotate)
        const [lat, lon] = vec3ToLatLon(e.point.x, e.point.y, e.point.z);
        onSurfaceClick(lat, lon);
      }}
    >
      <sphereGeometry args={[1, 128, 64]} />
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

function surfacePoint(lat: number, lon: number): Vector3 {
  return new Vector3(...latLonToVec3(lat, lon, PIN_ALTITUDE));
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
  const position = useMemo(() => surfacePoint(lat, lon), [lat, lon]);

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
  const position = useMemo(() => surfacePoint(lat, lon), [lat, lon]);
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
  const position = useMemo(
    () => (label ? surfacePoint(label.lat, label.lon) : new Vector3()),
    [label?.lat, label?.lon], // eslint-disable-line react-hooks/exhaustive-deps
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
    ? card.kind === 'site'
      ? card.site
      : card.kind === 'custom'
        ? card.pin
        : card
    : null;
  const lat = coords?.lat ?? 0;
  const lon = coords?.lon ?? 0;
  const position = useMemo(() => surfacePoint(lat, lon), [lat, lon]);

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

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancel = () => {
      flightRef.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controlsRef, flightRef]);

  useFrame((_, dt) => {
    const target = flightRef.current;
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
