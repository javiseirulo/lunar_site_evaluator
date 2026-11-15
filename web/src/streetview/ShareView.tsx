import { useEffect, useState } from 'react';
interface Matrix {
  size: number;
  modules: boolean[][];
}
let qrLoader: Promise<(text: string) => Matrix> | null = null;
function loadQr() {
  if (qrLoader) return qrLoader;
  // A public asset must be loaded as a browser module script. Vite deliberately
  // rejects importing /public JavaScript from the application's source graph.
  qrLoader = new Promise<(text: string) => Matrix>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = `${import.meta.env.BASE_URL}vendor/qrcodegen.js`;
    script.onload = () => {
      const encode = (window as Window & { lunarQrEncode?: (text: string) => Matrix })
        .lunarQrEncode;
      if (encode) resolve(encode);
      else {
        qrLoader = null;
        script.remove();
        reject(new Error('QR module unavailable'));
      }
    };
    script.onerror = () => {
      qrLoader = null;
      script.remove();
      reject(new Error('QR module unavailable'));
    };
    document.head.appendChild(script);
  });
  return qrLoader;
}
export function ShareView({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(url);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true;
    void loadQr()
      .then((encode) => {
        if (active) setMatrix(encode(snapshot));
      })
      .catch(() => {
        if (active) setMessage('QR unavailable. You can still copy the link.');
      });
    return () => {
      active = false;
    };
  }, [open, snapshot]);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(snapshot).hostname);
  return (
    <div className="lunar-share">
      <button
        className="btn"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            setMatrix(null);
            setMessage('');
            setSnapshot(url);
          }
          setOpen(!open);
        }}
      >
        Share view / QR
      </button>
      {open && (
        <div className="lunar-share-panel">
          <p>Captured location, time and camera</p>
          {matrix && (
            <svg
              role="img"
              aria-label="QR code for this lunar view"
              viewBox={`-4 -4 ${matrix.size + 8} ${matrix.size + 8}`}
              shapeRendering="crispEdges"
            >
              <rect x="-4" y="-4" width={matrix.size + 8} height={matrix.size + 8} fill="white" />
              <path
                fill="black"
                d={matrix.modules
                  .flatMap((row, y) =>
                    row.flatMap((dark, x) => (dark ? [`M${x},${y}h1v1h-1z`] : [])),
                  )
                  .join('')}
              />
            </svg>
          )}
          <input
            aria-label="Shared view link"
            value={snapshot}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button
            className="btn"
            onClick={() => {
              if (!navigator.clipboard) {
                setMessage('Select and copy the link above.');
                return;
              }
              void navigator.clipboard
                .writeText(snapshot)
                .then(() => setMessage('Link copied.'))
                .catch(() => setMessage('Select and copy the link above.'));
            }}
          >
            Copy link
          </button>
          <button
            className="btn"
            onClick={() => {
              if (url !== snapshot) setMatrix(null);
              setMessage('');
              setSnapshot(url);
            }}
          >
            Capture current view
          </button>
          {local && (
            <small>
              This localhost link works on this computer. For phones, open a shared deployment or an
              allowed LAN address first.
            </small>
          )}
          <small role="status">{message}</small>
        </div>
      )}
    </div>
  );
}
