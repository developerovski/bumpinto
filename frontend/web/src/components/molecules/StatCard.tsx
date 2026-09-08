import { Note } from "../atoms";

/** Artboard W9 · Profil istatistik kartı — hafif eğik. */
export default function StatCard({ value, label, tilt }: { value: number; label: string; tilt: -1 | 1 }) {
  return (
    <div
      // Artboard 390 (2782-2789) dolgu 10 / değer 24px; 1280 (2687-2694) dolgu 18 / değer 32px.
      className={`rounded-card border border-line bg-card p-2.5 text-center shadow-sh1 lg:p-[1.125rem] ${
        tilt === -1 ? "transform-[rotate(-1deg)]" : "transform-[rotate(1deg)]"
      }`}
    >
      <span className="block font-head text-[1.5rem] font-extrabold tabular-nums lg:text-[2rem]">{value}</span>
      <Note>{label}</Note>
    </div>
  );
}
