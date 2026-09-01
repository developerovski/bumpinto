import { Avatar } from "@bumpinto/web";

/** W2 · katılımcı listesi — `index` 4 renkli gradyan paletini sırayla dolaşır
    (flame / grass / violet / sun). Baş harf `name`'den türetilir. */
export function PaletteSweep() {
  return (
    <div className="flex items-center gap-3">
      <Avatar name="Mehmet" index={0} />
      <Avatar name="Elif" index={1} />
      <Avatar name="Deniz" index={2} />
      <Avatar name="Burak" index={3} />
    </div>
  );
}

/** W1 · davet başlığındaki halkalı avatar — konik `--story-ring` sarmalayıcı
    + 2px beyaz kenar (JoinIntro ve konumu gelmiş ParticipantRow satırı). */
export function StoryRing() {
  return <Avatar name="Elif" index={1} ring />;
}

/** W2 · `waiting` — konumu henüz gelmemiş katılımcı: kesikli kenar,
    soluk zemin, gradyan yok. Rozeti "Bekliyor" olan satırın avatarı. */
export function Waiting() {
  return <Avatar name="Deniz" waiting />;
}
