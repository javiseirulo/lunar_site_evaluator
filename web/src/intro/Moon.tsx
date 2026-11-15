import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { buildSphere, shadeInto, type SphereBuffers, type TextureData } from './moonSphere';

/** Imperative handle so the scroll loop can move the terminator without re-rendering React. */
export interface MoonHandle {
  setSunLon: (deg: number) => void;
}

// View from the south: the pole sits low on the disc, which is the point of this tool.
const VIEW_LAT = -35;
const VIEW_LON = 0;
// Redraw only when the phase moved this many degrees; a full redraw is ~1M pixels.
const MIN_STEP_DEG = 0.35;

let texturePromise: Promise<TextureData> | null = null;

function loadTexture(): Promise<TextureData> {
  texturePromise ??= new Promise<TextureData>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('2d canvas unavailable'));
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      resolve({ data: d.data, width: d.width, height: d.height });
    };
    img.onerror = () => {
      texturePromise = null;
      reject(new Error('Moon texture failed to load'));
    };
    img.src = `${import.meta.env.BASE_URL}landing/moon-2k.jpg`;
  });
  return texturePromise;
}

export function Moon({
  pixels,
  ref,
  className,
}: {
  /** Canvas resolution in device pixels (the CSS size is set by the parent). */
  pixels: number;
  ref?: Ref<MoonHandle>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const s = useRef({
    buf: null as SphereBuffers | null,
    image: null as ImageData | null,
    sun: -100,
    drawn: Number.NaN,
    raf: 0,
  });

  const draw = useCallback(() => {
    const st = s.current;
    st.raf = 0;
    const c = canvasRef.current;
    if (!c || !st.buf || !st.image) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    shadeInto(st.buf, st.sun, st.image.data);
    ctx.putImageData(st.image, 0, 0);
    st.drawn = st.sun;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      setSunLon(deg: number) {
        const st = s.current;
        st.sun = deg;
        if (!st.buf || st.raf) return;
        if (Math.abs(deg - st.drawn) < MIN_STEP_DEG) return;
        st.raf = requestAnimationFrame(draw);
      },
    }),
    [draw],
  );

  useEffect(() => {
    let cancelled = false;
    const st = s.current;
    const c = canvasRef.current;
    if (!c) return;
    c.removeAttribute('data-ready');
    loadTexture()
      .then((tex) => {
        if (cancelled) return;
        c.width = pixels;
        c.height = pixels;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        st.buf = buildSphere(tex, pixels, VIEW_LAT, VIEW_LON);
        st.image = ctx.createImageData(pixels, pixels);
        st.drawn = Number.NaN;
        draw();
        c.dataset.ready = 'true';
      })
      .catch(() => {
        /* No texture: the glow behind the canvas still shows a soft moon-coloured halo. */
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.buf = null;
      st.image = null;
    };
  }, [pixels, draw]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
