import { Note } from "../atoms";

/** Artboard W9 · Profil istatistik kartı — hafif eğik. */
export default function StatCard({ value, label, tilt }: { value: number; label: string; tilt: -1 | 1 }) {
  return (
    <div
      className={`rounded-card border border-line bg-card p-[1.125rem] text-center shadow-sh1 ${
        tilt === -1 ? "transform-[rotate(-1deg)]" : "transform-[rotate(1deg)]"
      }`}
    >
      <span className="block font-head text-[2rem] font-extrabold tabular-nums">{value}</span>
      <Note>{label}</Note>
    </div>
  );
}
