import { StreetView } from '@/streetview/StreetView';

export default function StreetViewPage() {
  return (
    <div className="flex flex-col gap-3">
      <section className="box">
        <div className="box-head">Street View</div>
        <div className="space h-[800px] p-3">
          <StreetView />
        </div>
      </section>
    </div>
  );
}
