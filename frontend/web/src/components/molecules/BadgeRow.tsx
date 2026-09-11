/* Kaynak: Keşfet POC artboard P6 — profil sayaçları + rozetler. Sunucu yalnız SAYAR, rozet istemcide türer. */
import { BADGES, badgesFor, type StatsDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { HandNote, Overline } from "../atoms";
import { BADGE_ICONS } from "../../lib/badgeIcons";

export default function BadgeRow({ stats }: { stats: StatsDto | undefined }) {
  const { t } = useTranslation();
  const plansMet = stats?.plansMet ?? 0;
  const streak = stats?.metStreakWeeks ?? 0;
  const earned = badgesFor(stats);
  // Spec §11.6: açtığın · buluşma · hafta seri — `friendsMet` artık çizilmez.
  const counters: [number, string][] = [
    [stats?.sessionsHosted ?? 0, t("profile.statHosted")],
    [plansMet, t("profile.statMet")],
    [streak, t("profile.statStreak")],
  ];
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-3 rounded-card border border-line bg-card px-1.5 py-3.5 text-center shadow-sh1">
        {counters.map(([value, label], i) => (
          <div key={label} className={`flex flex-col gap-px${i ? " border-l border-line" : ""}`}>
            <span className="font-head text-[1.625rem] font-extrabold tabular-nums">{value}</span>
            <span className="text-[0.75rem] text-ink2">{label}</span>
          </div>
        ))}
      </div>
      <Overline>{t("profile.badges")}</Overline>
      <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
        {BADGES.map((b) => {
          const on = earned.includes(b.id);
          const have = b.of === "met" ? plansMet : streak;
          const Icon = BADGE_ICONS[b.id];
          return (
            <li key={b.id} data-earned={String(on)}
              className={`flex flex-col items-center gap-1.5 rounded-card border border-line bg-card px-2.5 py-3.5 text-center shadow-sh1${on ? "" : " opacity-50"}`}>
              <span aria-hidden className={`flex h-[3.125rem] w-[3.125rem] items-center justify-center rounded-full text-[1.5rem] ${
                on
                  ? "border-[1.5px] border-ink bg-hl text-ink shadow-[2px_3px_0_rgba(39,32,59,0.18)]"
                  : "border-[1.5px] border-dashed border-line-in bg-sand text-ink3"
              }`}>
                <Icon />
              </span>
              <p className="m-0 font-head text-[0.875rem] font-bold">{t(`badge.${b.id}.title`)}</p>
              <span className="text-[0.75rem] leading-snug text-ink2">
                {on
                  ? t(`badge.${b.id}.hint`)
                  : t(b.of === "met" ? "badge.progressMet" : "badge.progressStreak", { have, goal: b.goal, count: b.goal - have })}
              </span>
            </li>
          );
        })}
      </ul>
      <HandNote center size="sm">{t("profile.badgesHand")}</HandNote>
    </div>
  );
}
