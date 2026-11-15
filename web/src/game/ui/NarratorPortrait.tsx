/**
 * Who talks: a Historical mission's narrator (astronaut or spacecraft portrait), falling back to
 * Dr. Regolith while the art does not exist yet; Dr. Regolith in South Pole mode.
 */
import { narratorImage, type Narrator } from '../historic/data';
import { scientistImage, type Mood } from './assets';
import { GameImage } from './GameImage';
import { PixelScientist } from './PixelScientist';

export function NarratorPortrait({
  narrator,
  mood,
  className,
}: {
  narrator: Narrator | null;
  mood: Mood;
  className?: string;
}) {
  if (!narrator) return <PixelScientist mood={mood} className={className} />;
  return (
    <GameImage
      src={narratorImage(narrator)}
      alt={`${narrator.name}, ${narrator.role}`}
      className={`${className ?? ''} object-contain [image-rendering:pixelated]`}
      fallback={
        <GameImage
          src={scientistImage(mood)}
          alt={`${narrator.name}, ${narrator.role}`}
          className={`${className ?? ''} object-contain [image-rendering:pixelated]`}
        />
      }
    />
  );
}
