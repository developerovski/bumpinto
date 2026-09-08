import { useTranslation } from "react-i18next";
import type { MeResponse } from "@bumpinto/shared";
import StatCard from "./StatCard";

/** Artboard W9 · Profil — iki istatistik kartı yan yana, hafif eğik. */
export default function ProfileStats({ stats }: { stats: MeResponse["stats"] }) {
  const { t } = useTranslation();
  return (
    // Artboard boşluğu 390'da 10px (2781), 1280'de 14px (2686).
    <div className="grid grid-cols-2 gap-2.5 lg:gap-3.5">
      <StatCard value={stats?.sessionsHosted ?? 0} label={t("profile.hosted")} tilt={-1} />
      <StatCard value={stats?.friendsMet ?? 0} label={t("profile.friends")} tilt={1} />
    </div>
  );
}
