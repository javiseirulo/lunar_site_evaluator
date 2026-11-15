/** "Try with class" button for the game's top-left corner: pick teacher or student. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';

export function ClassEntry() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="btn h-8 gap-1.5 px-3 text-[11px]"
      >
        <GraduationCap className="size-4" aria-hidden /> Try with class
      </button>
      {open && (
        <div className="mission-pixel absolute top-full left-0 z-20 mt-1 flex w-52 flex-col border-4 border-black bg-navy-800">
          <Link
            to="/class"
            className="hover:bg-warn border-b-2 border-black px-3 py-2 font-mono text-[12px] font-bold uppercase hover:text-black"
          >
            I&apos;m the teacher
          </Link>
          <Link
            to="/join"
            className="hover:bg-warn px-3 py-2 font-mono text-[12px] font-bold uppercase hover:text-black"
          >
            I&apos;m a student
          </Link>
        </div>
      )}
    </div>
  );
}
