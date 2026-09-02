import { useTranslation } from "react-i18next";
import type { MeResponse } from "@bumpinto/shared";
import StatCard from "./StatCard";

/** Artboard W9 · Profil — iki istatistik kartı yan yana, hafif eğik. */
export default function ProfileStats({ stats }: { stats: MeResponse["stats"] }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3.5">
      <StatCard value={stats?.sessionsHosted ?? 0} label={t("profile.hosted")} tilt={-1} />
      <StatCard value={stats?.friendsMet ?? 0} label={t("profile.friends")} tilt={1} />
    </div>
  );
}
