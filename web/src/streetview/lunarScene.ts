/** Cesium is owned and disposed by the Street View component, never by the shared store. */
import type { SkySample } from '@/core';
import { DEFAULT_OBSERVER_HEIGHT_M, limitLook, skyDirection } from './geometry';

export interface Observer {
  lat: number;
  lon: number;
}

export interface LunarScene {
  look: (headingDelta: number, pitchDelta: number) => void;
  resetLook: () => void;
  setHeight: (height: number) => void;
  setSky: (sample: SkySample | null) => void;
  destroy: () => void;
}

export async function createLunarScene(
  container: HTMLElement,
  observer: Observer,
  token: string,
  signal: AbortSignal,
  onGround: (height: number) => void,
  onRenderError: () => void,
): Promise<LunarScene> {
  // Must be set before Cesium loads, including when served below a URL subpath.
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
    msaaSamples: 1,
    showRenderLoopErrors: false,
  });
  let disposed = false;
  const disposeViewer = () => {
    if (!disposed) {
      disposed = true;
      viewer.destroy();
    }
  };
  signal.addEventListener('abort', disposeViewer, { once: true });
  try {
    viewer.scene.renderError.addEventListener(onRenderError);
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.scene.moon) viewer.scene.moon.show = false;
    viewer.scene.fog.enabled = false;
    viewer.scene.screenSpaceCameraController.enableInputs = false;
    viewer.resolutionScale = Math.min(window.devicePixelRatio, 1.5) / window.devicePixelRatio;
    const position = (height: number) =>
      C.Cartesian3.fromDegrees(observer.lon, observer.lat, height, moon);
    viewer.camera.setView({ destination: position(30_000) });
    const resource = await C.IonResource.fromAssetId(2684829, { accessToken: token });
    if (disposed) throw new DOMException('Cancelled', 'AbortError');
    const tiles = await C.Cesium3DTileset.fromUrl(resource, { maximumScreenSpaceError: 12 });
    if (disposed) {
      tiles.destroy();
      throw new DOMException('Cancelled', 'AbortError');
    }
    viewer.scene.primitives.add(tiles);
    if (!viewer.scene.sampleHeightSupported)
      throw new Error('Terrain height sampling requires WebGL depth textures.');
    const points = await viewer.scene.sampleHeightMostDetailed([
      C.Cartographic.fromDegrees(observer.lon, observer.lat),
    ]);
    if (disposed) throw new DOMException('Cancelled', 'AbortError');
    const ground = points[0]?.height;
    if (ground === undefined || !Number.isFinite(ground)) {
      throw new Error('No surface height was returned for this location.');
    }
    onGround(ground);
    let heightAboveGround = DEFAULT_OBSERVER_HEIGHT_M;
    let pose = { heading: 0, pitch: 0 };
    const renderPose = () => {
      viewer.camera.setView({
        destination: position(ground + heightAboveGround),
        orientation: {
          heading: C.Math.toRadians(pose.heading),
          pitch: C.Math.toRadians(pose.pitch),
          roll: 0,
        },
      });
      viewer.scene.requestRender();
    };
    const look = (headingDelta: number, pitchDelta: number) => {
      pose = limitLook(pose.heading + headingDelta, pose.pitch + pitchDelta);
      renderPose();
    };
    const markers = ['Sun', 'Earth'].map((name, index) =>
      viewer.entities.add({
        name,
        show: false,
        position: position(ground),
        point: { pixelSize: index ? 12 : 10, color: index ? C.Color.LIGHTBLUE : C.Color.YELLOW },
        label: {
          text: name,
          font: '13px sans-serif',
          fillColor: C.Color.WHITE,
          showBackground: true,
          pixelOffset: new C.Cartesian2(0, -20),
        },
      }),
    );
    const canvas = viewer.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Lunar surface: drag to look around, or use the arrow keys.');
    canvas.style.touchAction = 'none';
    let pointer: { id: number; x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pointer) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.focus();
    };
    const move = (event: PointerEvent) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      look((pointer.x - event.clientX) * 0.18, (event.clientY - pointer.y) * 0.18);
      pointer = { id: pointer.id, x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent) => {
      if (pointer?.id === event.pointerId) pointer = null;
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
      }
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('keydown', key);
    const resize = new ResizeObserver(() => {
      if (!disposed) {
        viewer.resize();
        viewer.scene.requestRender();
      }
    });
    resize.observe(container);
    renderPose();
    return {
      look,
      resetLook: () => {
        pose = { heading: 0, pitch: 0 };
        renderPose();
      },
      setHeight: (height) => {
        heightAboveGround = Math.max(0.5, Math.min(20, height));
        renderPose();
      },
      setSky: (sample) => {
        markers.forEach((marker, index) => {
          marker.show = sample !== null;
          if (!sample) return;
          const direction = skyDirection(
            observer.lat,
            observer.lon,
            index ? sample.earth_az : sample.sun_az,
            index ? sample.earth_el : sample.sun_el,
          );
          const origin = position(ground + heightAboveGround);
          const endpoint = C.Cartesian3.add(
            origin,
            C.Cartesian3.multiplyByScalar(
              new C.Cartesian3(direction.x, direction.y, direction.z),
              100_000_000,
              new C.Cartesian3(),
            ),
            new C.Cartesian3(),
          );
          marker.position = new C.ConstantPositionProperty(endpoint);
        });
        if (sample) viewer.clock.currentTime = C.JulianDate.fromIso8601(sample.t_utc);
        viewer.scene.requestRender();
      },
      destroy: () => {
        resize.disconnect();
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
        canvas.removeEventListener('keydown', key);
        signal.removeEventListener('abort', disposeViewer);
        disposeViewer();
      },
    };
  } catch (error) {
    signal.removeEventListener('abort', disposeViewer);
    disposeViewer();
    throw error;
  }
}
