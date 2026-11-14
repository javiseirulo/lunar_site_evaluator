import { GamePanel } from '@/game/GamePanel';

export default function GamePage() {
  return (
    <section className="box">
      <div className="box-head">Mission</div>
      <div className="space h-[460px] p-3">
        <GamePanel />
      </div>
    </section>
  );
}
