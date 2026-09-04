/* Kaynak: artboard Mekanlar 1280 .hdr — katılımcı avatarları + aksiyon (Karıştır) */
import type { ReactNode } from "react";
import type { ParticipantDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Avatar } from "../atoms";

/** Soluk avatar tek başına "hangisi çevrimdışı" sorusunu cevaplamıyor — ad ve durum hover'da
    yazıyla söylenir. Kapsül biçimi harita altındaki `.mcap` etiketiyle aynı ailedendir.
    `online === false` kuralı ParticipantRow ve harita piniyle AYNI; alan yoksa (bilgi henüz
    gelmemiş) kimse haksız yere çevrimdışı gösterilmez. */
export default function AvatarRow(props: { people: ParticipantDto[]; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {props.people.map((p, i) => {
          const away = p.online === false && !p.manual;
          const label = `${p.displayName ?? "?"} · ${t(away ? "waiting.offline" : "waiting.online")}`;
          return (
            // tabIndex: tooltip klavyeyle de açılır (hover tek erişim yolu olamaz).
            <span key={p.id ?? i} className="group relative inline-flex cursor-pointer" tabIndex={0}>
              <span className={away ? "inline-flex opacity-55" : "inline-flex"}>
                <Avatar size="sm" name={p.displayName ?? "?"} index={i} ring />
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-card px-2.5 py-1 text-[0.75rem] font-bold text-ink opacity-0 shadow-sh1 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              >
                {label}
              </span>
              <span className="sr-only">{label}</span>
            </span>
          );
        })}
      </div>
      {props.children}
    </div>
  );
}
