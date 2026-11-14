import { GamePanel } from '@/game/GamePanel';

export default function GamePage() {
  return (
    <section className="box">
      <div className="box-head">Mission</div>
      <div className="h-[460px] bg-black p-2">
        <GamePanel />
      </div>
    </section>
  );
}
