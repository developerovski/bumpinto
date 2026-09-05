import ActivityBadge from "./ActivityBadge";

/** Seçili ilgi alanlarının rozet listesi — Lobi/Bekle/Solo/Mekanlar/Davet ortak. */
export default function ActivityBadges({ activities }: { activities: string[] }) {
  return (
    <>
      {activities.map((a) => (
        <ActivityBadge key={a} activity={a} />
      ))}
    </>
  );
}
