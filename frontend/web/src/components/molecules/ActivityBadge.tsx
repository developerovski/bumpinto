import { useTranslation } from "react-i18next";
import { ACTIVITY_ICONS } from "../../lib/activity";
import { Badge } from "../atoms";

/** Etkinlik rozeti: alev tonu + ikon + çevrilmiş etiket (Lobi/Mekanlar/Solo/Davet ekranları ortak). */
export default function ActivityBadge({ activity }: { activity: string }) {
  const { t } = useTranslation();
  const Icon = ACTIVITY_ICONS[activity];
  return (
    <Badge tone="flame">
      {Icon && <Icon size={14} aria-hidden />}
      {t(`activity.${activity}`)}
    </Badge>
  );
}
