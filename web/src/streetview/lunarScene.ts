/** Street View renderer. Selection/time remain in core. AI-assisted: OpenAI Codex. */
import type { SkySample } from '@/core';
import { DEFAULT_OBSERVER_HEIGHT_M, limitLook, skyDirection } from './geometry';
import {
  canWalk,
  lightingState,
  limitFov,
  MAX_WALK_DISTANCE_M,
  NavigationGestures,
  surfaceDistance,
  wheelFactor,
  SurfaceTap,
  DOUBLE_TAP_MS,
} from './navigation';
import {
  isLandmarkOccluded,
  layoutLabels,
  nearbyLandmarks,
  type LabelLayout,
  type Landmark,
} from './landmarks';
import { DEFAULT_VIEW, type ViewState } from './viewLink';

export interface Observer {
  lat: number;
  lon: number;
}
export interface SceneCallbacks {
  ground: (height: number) => void;
  error: () => void;
  observer: (point: Observer) => void;
  hint: (message: string) => void;
  view: (state: ViewState) => void;
  labels: (labels: LabelLayout[]) => void;
  save: (point: Observer) => void;
}
export interface LunarScene {
  faceBody: (body: 'sun' | 'earth') => void;
  setHeight: (height: number) => void;
  setSky: (sample: SkySample | null) => void;
  setReadingLight: (enabled: boolean) => void;
  setNames: (enabled: boolean) => void;
  relocate: (point: Observer) => Promise<void>;
  destroy: () => void;
}

export async function createLunarScene(
  container: HTMLElement,
  initial: Observer,
  token: string,
  signal: AbortSignal,
  callbacks: SceneCallbacks,
  initialView: ViewState = DEFAULT_VIEW,
): Promise<LunarScene> {
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = new URL(
    `${import.meta.env.BASE_URL}cesium/`,
    window.location.origin,
  ).href;
  const C = await import('cesium');
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const moon = C.Ellipsoid.MOON;
  const viewer = new C.Viewer(container, {
    ellipsoid: moon,
    mapProjection: new C.GeographicProjection(moon),
    globe: false,
    baseLayer: false,
    baseLayerPicker: false,
    geocoder: false,
    sceneModePicker: false,
    animation: false,
    timeline: false,
    homeButton: false,
    fullscreenButton: false,
    navigationHelpButton: false,
    selectionIndicator: false,
    infoBox: false,
    skyBox: false,
    skyAtmosphere: false,
    shouldAnimate: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    msaaSamples: 4,
    useBrowserRecommendedResolution: false,
    showRenderLoopErrors: false,
  });
  let disposed = false;
  let animation = 0;
  const cleanup: (() => void)[] = [];
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animation);
    cleanup.forEach((fn) => fn());
    viewer.destroy();
  };
  signal.addEventListener('abort', dispose, { once: true });
  cleanup.push(() => signal.removeEventListener('abort', dispose));
  try {
    viewer.scene.renderError.addEventListener(callbacks.error);
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.scene.moon) viewer.scene.moon.show = false;
    viewer.scene.backgroundColor = C.Color.BLACK;
    viewer.scene.fog.enabled = false;
    viewer.scene.screenSpaceCameraController.enableInputs = false;
    viewer.resolutionScale = Math.min(window.devicePixelRatio, 2) / window.devicePixelRatio;
    const frustum = viewer.camera.frustum as import('cesium').PerspectiveFrustum;
    frustum.near = 0.1;
    frustum.far = 1e9;
    let observer = { ...initial };
    let ground = 0;
    let height = initialView.height ?? DEFAULT_OBSERVER_HEIGHT_M;
    let fov = limitFov(initialView.fov);
    let pose = limitLook(initialView.heading, initialView.pitch);
    let moving = false;
    let sky: SkySample | null = null;
    let namesEnabled = true;
    let features: Landmark[] = [];
    let anchors: { feature: Landmark; position: import('cesium').Cartesian3 }[] = [];
    let landmarkRevision = 0;
    const position = (p: Observer, altitude: number) =>
      C.Cartesian3.fromDegrees(p.lon, p.lat, altitude, moon);
    const vector = (v: { x: number; y: number; z: number }) => new C.Cartesian3(v.x, v.y, v.z);
    const orientation = (p: Observer) => ({
      direction: vector(skyDirection(p.lat, p.lon, pose.heading, pose.pitch)),
      up: vector(skyDirection(p.lat, p.lon, pose.heading, pose.pitch + 90)),
    });
    const renderPose = () => {
      if (disposed) return;
      // Explicit Moon-fixed vectors avoid orientation inferred in an Earth frame.
      viewer.camera.setView({
        destination: position(observer, ground + height),
        orientation: orientation(observer),
      });
      frustum.fov = C.Math.toRadians(fov);
      viewer.scene.requestRender();
    };
    viewer.camera.setView({
      destination: position(observer, 30_000),
      orientation: orientation(observer),
    });
    const resource = await C.IonResource.fromAssetId(2684829, { accessToken: token });
    if (disposed) throw new DOMException('Cancelled', 'AbortError');
    const tiles = await C.Cesium3DTileset.fromUrl(resource, {
      maximumScreenSpaceError: 1,
      cacheBytes: matchMedia('(pointer: coarse)').matches ? 128 * 1024 * 1024 : 256 * 1024 * 1024,
      maximumCacheOverflowBytes: 128 * 1024 * 1024,
      foveatedScreenSpaceError: false,
      cullRequestsWhileMoving: false,
    });
    if (disposed) {
      tiles.destroy();
      throw new DOMException('Cancelled', 'AbortError');
    }
    viewer.scene.primitives.add(tiles);
    // View-relative fill reveals morphology, including shadows baked into imagery.
    // It is deliberately not a physical solar illumination model.
    const shader = new C.CustomShader({
      lightingModel: C.LightingModel.UNLIT,
      uniforms: {
        u_reading: { type: C.UniformType.FLOAT, value: 1 },
        u_tint: { type: C.UniformType.VEC3, value: new C.Cartesian3(0.94, 0.96, 1) },
      },
      fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        vec3 n = normalize(cross(dFdx(fsInput.attributes.positionEC), dFdy(fsInput.attributes.positionEC)));
        #ifdef HAS_NORMALS
        n = normalize(fsInput.attributes.normalEC);
        #endif
        if (!gl_FrontFacing) n = -n;
        float relief = 0.22 + 0.58 * max(dot(n, normalize(vec3(-0.35, 0.6, 0.7))), 0.0);
        vec3 readable = vec3(relief) * u_tint;
        material.diffuse = mix(material.diffuse, readable, u_reading * 0.9);
      }`,
    });
    tiles.customShader = shader;
    cleanup.push(() => {
      if (!shader.isDestroyed()) shader.destroy();
    });
    if (!viewer.scene.sampleHeightSupported) throw new Error('WebGL depth textures required');
    const withDeadline = async <T>(job: Promise<T>): Promise<T> => {
      let timer = 0;
      try {
        return await Promise.race([
          job,
          new Promise<never>((_, reject) => {
            timer = window.setTimeout(
              () => reject(new Error('Surface sampling timed out')),
              45_000,
            );
          }),
        ]);
      } finally {
        window.clearTimeout(timer);
      }
    };
    const sampleGround = async (points: Observer[]) => {
      // Start the radial ray above the Moon's highest peaks, beyond Cesium's
      // Earth-oriented 9 km default ray origin. The returned height is unchanged.
      const sampled = await withDeadline(
        viewer.scene.sampleHeightMostDetailed(
          points.map((p) => C.Cartographic.fromDegrees(p.lon, p.lat, 30_000)),
        ),
      );
      if (disposed) throw new DOMException('Cancelled', 'AbortError');
      if (sampled.some((p) => !Number.isFinite(p?.height)))
        throw new Error('Surface height unavailable');
      return sampled.map((p) => p!.height);
    };
    ground = (await sampleGround([observer]))[0]!;
    let exactGround = ground;
    callbacks.ground(ground);
    const markers = ['Sun', 'Earth'].map((name, index) =>
      viewer.entities.add({
        name,
        show: false,
        position: position(observer, ground),
        point: { pixelSize: index ? 8 : 7, color: index ? C.Color.LIGHTBLUE : C.Color.YELLOW },
        label: {
          text: name,
          font: '12px sans-serif',
          fillColor: C.Color.WHITE,
          pixelOffset: new C.Cartesian2(0, -18),
          style: C.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
        },
      }),
    );
    const setSky = (sample: SkySample | null) => {
      sky = sample;
      const visibleSky = moving ? null : sample;
      const state = lightingState(visibleSky);
      shader.setUniform(
        'u_tint',
        state === 'night'
          ? new C.Cartesian3(0.67, 0.77, 1)
          : state === 'shadow'
            ? new C.Cartesian3(0.79, 0.85, 1)
            : new C.Cartesian3(0.94, 0.96, 1),
      );
      markers.forEach((marker, index) => {
        marker.show = visibleSky !== null;
        if (!visibleSky) return;
        const d = vector(
          skyDirection(
            observer.lat,
            observer.lon,
            index ? visibleSky.earth_az : visibleSky.sun_az,
            index ? visibleSky.earth_el : visibleSky.sun_el,
          ),
        );
        marker.position = new C.ConstantPositionProperty(
          C.Cartesian3.add(
            position(observer, ground + height),
            C.Cartesian3.multiplyByScalar(d, 1e8, new C.Cartesian3()),
            new C.Cartesian3(),
          ),
        );
      });
      viewer.scene.requestRender();
    };
    const loadAnchors = async () => {
      const revision = ++landmarkRevision;
      anchors = [];
      callbacks.labels([]);
      const nearest = nearbyLandmarks(features, observer);
      if (!nearest.length) return;
      try {
        const points = await withDeadline(
          viewer.scene.sampleHeightMostDetailed(
            nearest.map((f) => C.Cartographic.fromDegrees(f.lon, f.lat, 30_000)),
          ),
        );
        if (disposed || revision !== landmarkRevision) return;
        anchors = nearest.flatMap((feature, i) =>
          Number.isFinite(points[i]?.height)
            ? [{ feature, position: position(feature, points[i]!.height + 2) }]
            : [],
        );
        viewer.scene.requestRender();
      } catch {
        /* Names are optional; a catalogue failure must not hide terrain. */
      }
    };
    void fetch(`${import.meta.env.BASE_URL}data/terrain/lunar-names.json`, { signal })
      .then((response) => {
        if (!response.ok) throw new Error('Names unavailable');
        return response.json();
      })
      .then((data: { features: Landmark[] }) => {
        if (!disposed) {
          features = data.features;
          void loadAnchors();
        }
      })
      .catch(() => {
        if (!disposed)
          callbacks.hint('Place names unavailable. Terrain navigation remains available.');
      });
    let previousLabels = '';
    let lastLabels = 0;
    let labelTimer = 0;
    let previousView = '';
    const renderLabels = () => {
      const now = performance.now();
      if (now - lastLabels < 120) {
        if (!labelTimer)
          labelTimer = window.setTimeout(
            () => {
              labelTimer = 0;
              if (!disposed) viewer.scene.requestRender();
            },
            120 - (now - lastLabels),
          );
        return;
      }
      lastLabels = now;
      const state = { ...pose, fov, height };
      const viewKey = JSON.stringify(state);
      if (viewKey !== previousView) {
        previousView = viewKey;
        callbacks.view(state);
      }
      const points =
        namesEnabled && !moving
          ? anchors.flatMap(({ feature, position: anchor }) => {
              const delta = C.Cartesian3.subtract(
                anchor,
                viewer.camera.positionWC,
                new C.Cartesian3(),
              );
              if (C.Cartesian3.dot(delta, viewer.camera.directionWC) <= 0) return [];
              const projected = C.SceneTransforms.worldToWindowCoordinates(viewer.scene, anchor);
              if (!projected) return [];
              if (
                projected.x < -32 ||
                projected.y < 0 ||
                projected.x >= container.clientWidth + 32 ||
                projected.y >= container.clientHeight
              )
                return [];
              // A feature centre may be hidden by its own near slope. Allow its footprint,
              // while rejecting clearly separate foreground occlusion.
              const distance = C.Cartesian3.magnitude(delta);
              const hit = viewer.scene.pickPositionSupported
                ? viewer.scene.pickPosition(
                    new C.Cartesian2(
                      Math.max(0, Math.min(container.clientWidth - 1, projected.x)),
                      projected.y,
                    ),
                  )
                : undefined;
              if (
                hit &&
                isLandmarkOccluded(
                  distance,
                  C.Cartesian3.distance(viewer.camera.positionWC, hit),
                  feature.diameter_km,
                )
              )
                return [];
              return [{ id: feature.id, name: feature.name, x: projected.x, y: projected.y }];
            })
          : [];
      const labels = layoutLabels(points, container.clientWidth, container.clientHeight);
      const signature = JSON.stringify(labels);
      if (signature !== previousLabels) {
        previousLabels = signature;
        callbacks.labels(labels);
      }
    };
    viewer.scene.postRender.addEventListener(renderLabels);
    cleanup.push(() => {
      window.clearTimeout(labelTimer);
      viewer.scene.postRender.removeEventListener(renderLabels);
    });
    const ringCollection = viewer.scene.primitives.add(new C.PolylineCollection());
    const ring = ringCollection.add({
      show: false,
      positions: [],
      width: 1.5,
      material: C.Material.fromType('Color', { color: C.Color.WHITE.withAlpha(0.55) }),
    });
    // The displayed LOD can temporarily lie above the most-detailed surface.
    // Keep the eye above BOTH meshes while tiles refine; never offset the DEM.
    let groundTimer = 0;
    const followVisibleGround = () => {
      window.clearTimeout(groundTimer);
      groundTimer = window.setTimeout(() => {
        if (disposed || moving) return;
        const displayed = viewer.scene.sampleHeight(
          C.Cartographic.fromDegrees(observer.lon, observer.lat, 30_000),
          [...markers, ringCollection],
        );
        if (displayed === undefined || !Number.isFinite(displayed)) return;
        const safeGround = Math.max(exactGround, displayed);
        if (Math.abs(safeGround - ground) > 0.1) {
          ground = safeGround;
          callbacks.ground(ground);
          renderPose();
        }
      }, 120);
    };
    tiles.loadProgress.addEventListener(followVisibleGround);
    viewer.camera.changed.addEventListener(followVisibleGround);
    cleanup.push(() => {
      window.clearTimeout(groundTimer);
      tiles.loadProgress.removeEventListener(followVisibleGround);
      viewer.camera.changed.removeEventListener(followVisibleGround);
    });
    const canvas = viewer.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      'aria-label',
      'Lunar surface. Drag to look, scroll or pinch to zoom. Click or tap nearby ground to walk. Arrow keys look; plus and minus zoom.',
    );
    canvas.style.touchAction = 'none';
    const gestures = new NavigationGestures();
    const taps = new SurfaceTap();
    let tapTimer = 0;
    cleanup.push(() => window.clearTimeout(tapTimer));
    const pickGround = (clientX: number, clientY: number) => {
      if (moving || disposed || !viewer.scene.pickPositionSupported) return null;
      const bounds = canvas.getBoundingClientRect();
      const world = viewer.scene.pickPosition(
        new C.Cartesian2(clientX - bounds.left, clientY - bounds.top),
      );
      if (!world || !Number.isFinite(world.x + world.y + world.z)) return null;
      const carto = moon.cartesianToCartographic(world);
      const point = {
        lat: C.Math.toDegrees(carto.latitude),
        lon: C.Math.toDegrees(carto.longitude),
      };
      const distance = surfaceDistance(observer, point);
      return { point, world, distance };
    };
    const hover = (x: number, y: number) => {
      const target = pickGround(x, y);
      ring.show = !!target && canWalk(target.distance);
      if (target && ring.show) {
        const radius = Math.max(0.6, Math.min(3, target.distance * 0.025));
        const matrix = C.Transforms.eastNorthUpToFixedFrame(target.world, moon);
        ring.positions = Array.from({ length: 33 }, (_, i) =>
          C.Matrix4.multiplyByPoint(
            matrix,
            new C.Cartesian3(
              radius * Math.cos((i * Math.PI) / 16),
              radius * Math.sin((i * Math.PI) / 16),
              0.25,
            ),
            new C.Cartesian3(),
          ),
        );
      }
      viewer.scene.requestRender();
    };
    const walk = async (x: number, y: number) => {
      const target = pickGround(x, y);
      if (!target || !canWalk(target.distance)) {
        callbacks.hint(`Choose nearby ground, 1–${MAX_WALK_DISTANCE_M} m away.`);
        return;
      }
      const previousSky = sky;
      moving = true;
      ring.show = false;
      setSky(null);
      callbacks.labels([]);
      callbacks.hint('Checking the route…');
      try {
        const geodesic = new C.EllipsoidGeodesic(
          C.Cartographic.fromDegrees(observer.lon, observer.lat),
          C.Cartographic.fromDegrees(target.point.lon, target.point.lat),
          moon,
        );
        const segments = Math.max(4, Math.ceil(target.distance / 5));
        const route = Array.from({ length: segments + 1 }, (_, i) => {
          const p = geodesic.interpolateUsingFraction(i / segments);
          return { lat: C.Math.toDegrees(p.latitude), lon: C.Math.toDegrees(p.longitude) };
        });
        const heights = await sampleGround(route);
        callbacks.observer(target.point); // immediately invalidate the old site's sky
        callbacks.hint(`Moving ${Math.round(target.distance)} m…`);
        const started = performance.now();
        const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000;
        const advance = (now: number) => {
          if (disposed) return;
          const t = duration ? Math.min(1, (now - started) / duration) : 1;
          const smooth = t * t * (3 - 2 * t);
          const index = Math.min(segments - 1, Math.floor(smooth * segments));
          const fraction = smooth * segments - index;
          const p = geodesic.interpolateUsingFraction(smooth);
          observer = { lat: C.Math.toDegrees(p.latitude), lon: C.Math.toDegrees(p.longitude) };
          ground = C.Math.lerp(heights[index]!, heights[index + 1]!, fraction);
          exactGround = ground;
          renderPose();
          if (t < 1) animation = requestAnimationFrame(advance);
          else {
            moving = false;
            setSky(sky);
            callbacks.ground(ground);
            callbacks.hint('Location updated.');
            void loadAnchors();
          }
        };
        animation = requestAnimationFrame(advance);
      } catch {
        if (!disposed) {
          moving = false;
          setSky(previousSky);
          callbacks.hint('Route unavailable. Try another nearby point.');
        }
      }
    };
    const look = (dx: number, dy: number) => {
      if (moving) return;
      pose = limitLook(pose.heading + dx, pose.pitch + dy);
      renderPose();
    };
    const zoom = (factor: number) => {
      if (moving) return;
      fov = limitFov(fov * factor);
      renderPose();
    };
    const down = (event: PointerEvent) => {
      if (moving || !gestures.down(event.pointerId, event.clientX, event.clientY, event.button))
        return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll: true });
      ring.show = false;
    };
    let lastHover = 0;
    const move = (event: PointerEvent) => {
      const gesture = gestures.move(event.pointerId, event.clientX, event.clientY);
      if (gesture?.type === 'look') {
        window.clearTimeout(tapTimer);
        taps.clear();
        const sensitivity = fov / Math.max(200, canvas.clientHeight);
        look(gesture.dx * sensitivity, gesture.dy * sensitivity);
      } else if (gesture?.type === 'zoom') {
        window.clearTimeout(tapTimer);
        taps.clear();
        zoom(gesture.factor);
      } else if (
        !gestures.active &&
        event.pointerType !== 'touch' &&
        performance.now() - lastHover > 50
      ) {
        lastHover = performance.now();
        hover(event.clientX, event.clientY);
      }
    };
    const up = (event: PointerEvent) => {
      const gesture = gestures.up(event.pointerId, event.clientX, event.clientY);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (gesture?.type === 'tap') {
        if (event.pointerType !== 'touch') {
          void walk(gesture.x, gesture.y);
          return;
        }
        window.clearTimeout(tapTimer);
        if (taps.tap(gesture.x, gesture.y, performance.now()) === 'save') {
          const target = pickGround(gesture.x, gesture.y);
          if (target) callbacks.save(target.point);
          else callbacks.hint('Choose visible ground to save a location.');
        } else
          tapTimer = window.setTimeout(() => {
            taps.clear();
            void walk(gesture.x, gesture.y);
          }, DOUBLE_TAP_MS);
      }
    };
    const cancel = () => {
      gestures.cancel();
      ring.show = false;
      viewer.scene.requestRender();
    };
    const context = (event: MouseEvent) => {
      event.preventDefault();
      const target = pickGround(event.clientX, event.clientY);
      if (target) callbacks.save(target.point);
      else callbacks.hint('Choose visible ground to save a location.');
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom(wheelFactor(event.deltaY, event.deltaMode, canvas.clientHeight));
    };
    const key = (event: KeyboardEvent) => {
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-5, 0],
        ArrowRight: [5, 0],
        ArrowUp: [0, 5],
        ArrowDown: [0, -5],
      };
      const delta = directions[event.key];
      if (delta) {
        event.preventDefault();
        look(...delta);
      } else if (['+', '=', '-', '_'].includes(event.key)) {
        event.preventDefault();
        zoom(event.key === '-' || event.key === '_' ? 1.1 : 1 / 1.1);
      }
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('lostpointercapture', cancel);
    canvas.addEventListener('pointerleave', () => {
      ring.show = false;
    });
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('keydown', key);
    canvas.addEventListener('contextmenu', context);
    cleanup.push(() => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', cancel);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('keydown', key);
      canvas.removeEventListener('contextmenu', context);
    });
    const resize = new ResizeObserver(() => {
      if (!disposed) {
        viewer.resize();
        viewer.scene.requestRender();
      }
    });
    resize.observe(container);
    cleanup.push(() => resize.disconnect());
    renderPose();
    return {
      faceBody: (body) => {
        if (!sky || moving) return;
        const target = limitLook(
          body === 'sun' ? sky.sun_az : sky.earth_az,
          body === 'sun' ? sky.sun_el : sky.earth_el,
        );
        const start = { ...pose };
        const delta = ((target.heading - start.heading + 540) % 360) - 180;
        const started = performance.now();
        moving = true;
        const aim = (now: number) => {
          if (disposed) return;
          const t = matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 1
            : Math.min(1, (now - started) / 550);
          const eased = t * t * (3 - 2 * t);
          pose = limitLook(
            start.heading + delta * eased,
            start.pitch + (target.pitch - start.pitch) * eased,
          );
          renderPose();
          if (t < 1) animation = requestAnimationFrame(aim);
          else {
            moving = false;
            setSky(sky);
            callbacks.hint(
              `${body === 'sun' ? 'Sun' : 'Earth'} direction${target.pitch < 0 ? ' · below local horizontal' : ''}.`,
            );
          }
        };
        animation = requestAnimationFrame(aim);
      },
      setHeight: (value) => {
        height = Math.max(0.5, Math.min(20, value));
        if (!moving) renderPose();
        setSky(sky);
      },
      setSky,
      setReadingLight: (enabled) => {
        shader.setUniform('u_reading', enabled ? 1 : 0);
        viewer.scene.requestRender();
      },
      setNames: (enabled) => {
        namesEnabled = enabled;
        lastLabels = 0;
        renderLabels();
      },
      relocate: async (point) => {
        if (
          moving ||
          !Number.isFinite(point.lat + point.lon) ||
          Math.abs(point.lat) > 90 ||
          Math.abs(point.lon) > 180
        )
          return;
        const previousSky = sky;
        moving = true;
        setSky(null);
        callbacks.labels([]);
        callbacks.hint('Locating the new surface…');
        try {
          const altitude = (await sampleGround([point]))[0]!;
          if (disposed) return;
          callbacks.observer(point);
          const finish = () => {
            if (disposed) return;
            observer = { ...point };
            ground = altitude;
            exactGround = altitude;
            moving = false;
            renderPose();
            setSky(sky);
            callbacks.ground(ground);
            callbacks.hint('Location updated.');
            void loadAnchors();
          };
          viewer.camera.flyTo({
            destination: position(point, altitude + height),
            orientation: orientation(point),
            duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2,
            complete: finish,
            cancel: finish,
          });
        } catch {
          if (!disposed) {
            moving = false;
            setSky(previousSky);
            callbacks.hint('Could not locate that surface. Current location kept.');
          }
        }
      },
      destroy: dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
