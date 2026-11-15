import { useEffect, useRef, useState, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Sphere, Vector2, Vector3, type Object3D } from 'three';
import { prepareSurfaceLocation, type MoonPoint } from '@/core';
import { vec3ToLatLon } from './geo';
import { standHere } from './streetViewFlight';
import './globeSurface.css';

export interface SurfaceBridgeApi {
  pick: (x: number, y: number) => MoonPoint | null;
  enter: (point: MoonPoint) => void;
}
/** Reuse the existing surface route; only translate a drop into lunar coordinates. */
export function SurfacePicker({
  apiRef,
  onEnter,
}: {
  apiRef: RefObject<SurfaceBridgeApi | null>;
  onEnter: (path: string) => void;
}) {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    apiRef.current = {
      pick: (x, y) => {
        const bounds = gl.domElement.getBoundingClientRect();
        if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
        const ray = new Raycaster();
        ray.setFromCamera(
          new Vector2(
            ((x - bounds.left) / bounds.width) * 2 - 1,
            1 - ((y - bounds.top) / bounds.height) * 2,
          ),
          camera,
        );
        const surfaces: Object3D[] = [];
        scene.traverseVisible((object) => {
          if (object.userData.lunarSurface) surfaces.push(object);
        });
        // Hit Marta's actual polar mesh, including its chosen exaggeration.
        // The sphere is only a fallback while the textured Moon is loading.
        const hit = surfaces.length
          ? ray.intersectObjects(surfaces, false)[0]?.point
          : ray.ray.intersectSphere(new Sphere(new Vector3(), 1), new Vector3());
        if (!hit) return null;
        const [lat, lon] = vec3ToLatLon(hit.x, hit.y, hit.z);
        return { lat, lon };
      },
      enter: (point) => {
        standHere({
          siteId: 'free',
          ...point,
          onArrive: () => onEnter(prepareSurfaceLocation(point)),
        });
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, camera, gl, scene, onEnter]);
  return null;
}
/** Pointer capture supports the same drag/drop on touch and desktop. */
export function AstronautControl({
  apiRef,
  armed,
  onArmed,
  className,
}: {
  apiRef: RefObject<SurfaceBridgeApi | null>;
  armed: boolean;
  onArmed: (armed: boolean) => void;
  className?: string;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [hint, setHint] = useState('Drag the astronaut onto the Moon.');
  return (
    <div className={className ? `globe-surface-control ${className}` : 'globe-surface-control'}>
      {ghost && (
        <img
          className="astronaut-ghost"
          src={`${import.meta.env.BASE_URL}streetview/astronaut-ai.png`}
          alt=""
          style={{ left: ghost.x, top: ghost.y }}
        />
      )}
      <button
        type="button"
        className="astronaut-button"
        aria-label="Place astronaut for Street View"
        aria-pressed={armed}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          start.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (
            start.current &&
            Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 6
          )
            setGhost({ x: e.clientX, y: e.clientY });
        }}
        onPointerUp={(e) => {
          if (!start.current) return;
          const dragged = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 6;
          start.current = null;
          setGhost(null);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          if (!dragged) {
            onArmed(!armed);
            return;
          }
          const point = apiRef.current?.pick(e.clientX, e.clientY);
          if (point) {
            onArmed(false);
            apiRef.current?.enter(point);
          } else setHint('Drop on the visible lunar surface.');
        }}
        onPointerCancel={() => {
          start.current = null;
          setGhost(null);
        }}
        onClick={(e) => {
          if (e.detail === 0) onArmed(!armed);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onArmed(!armed);
          }
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}streetview/astronaut-ai.png`}
          alt=""
          draggable={false}
        />
        <span>AI</span>
      </button>
      <p role="status">{armed ? 'Choose a point on the Moon · Esc to cancel' : hint}</p>
    </div>
  );
}
