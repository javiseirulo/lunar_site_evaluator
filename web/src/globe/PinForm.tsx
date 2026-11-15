/**
 * "Pin by coordinates" form over the 3D globe — owner: Marta (src/globe).
 */
import { useState, type FormEvent } from 'react';
import { MapPinPlus } from 'lucide-react';
import { Sheet } from './GlobeCard';
import { parseCoordinate } from './geo';

export function PinForm({
  onAdd,
  buttonLabel = 'Pin by coordinates',
  title = 'Pin by coordinates',
  submitLabel = 'Add pin',
}: {
  onAdd: (pin: { name: string; lat: number; lon: number }) => void;
  /** Normal mode uses plainer wording ("Go to coordinates"). */
  buttonLabel?: string;
  title?: string;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [latText, setLatText] = useState('');
  const [lonText, setLonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        className="btn h-[30px] px-2.5 text-[13px]"
        style={{ ['--color-ink' as string]: '#e6edf7' }}
        onClick={() => setOpen(true)}
      >
        <MapPinPlus className="size-3.5" aria-hidden /> {buttonLabel}
      </button>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const lat = parseCoordinate(latText, 'lat');
    const lon = parseCoordinate(lonText, 'lon');
    if (lat === null || lon === null) {
      setError(
        lat === null
          ? 'Latitude must be between -90 and 90 (or e.g. 89.5 S).'
          : 'Longitude must be between -180 and 180 (or e.g. 45 E).',
      );
      return;
    }
    onAdd({ name, lat, lon });
    setName('');
    setLatText('');
    setLonText('');
    setError(null);
    setOpen(false);
  };

  return (
    <Sheet as="form" title={title} onClose={() => setOpen(false)} onSubmit={submit}>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 px-3 pb-3">
        <label htmlFor="pin-name" className="label">
          Name
        </label>
        <input
          id="pin-name"
          className="field h-[30px] min-w-0 text-[13px]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
          maxLength={40}
        />
        <label htmlFor="pin-lat" className="label">
          Lat
        </label>
        <input
          id="pin-lat"
          className="field h-[30px] min-w-0 text-[13px]"
          value={latText}
          onChange={(e) => setLatText(e.target.value)}
          placeholder="-89.5 or 89.5 S"
          inputMode="decimal"
          required
        />
        <label htmlFor="pin-lon" className="label">
          Lon
        </label>
        <input
          id="pin-lon"
          className="field h-[30px] min-w-0 text-[13px]"
          value={lonText}
          onChange={(e) => setLonText(e.target.value)}
          placeholder="45.2 or 45.2 E"
          inputMode="decimal"
          required
        />
        {error && (
          <p className="text-bad col-span-2" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn btn-go col-span-2 h-[30px] justify-self-start text-[13px]"
        >
          {submitLabel}
        </button>
      </div>
    </Sheet>
  );
}
