/* Kaynak: artboard Mekanlar 1280 .hdr — katılımcı avatarları + aksiyon (Karıştır) */
import type { ReactNode } from "react";
import type { ParticipantDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { MODE_ICON, MODE_LABEL_KEY } from "../../lib/travelMode";
import { Avatar } from "../atoms";

/** Soluk avatar tek başına "hangisi çevrimdışı" sorusunu cevaplamıyor — ad ve durum hover'da
    yazıyla söylenir. Kapsül biçimi harita altındaki `.mcap` etiketiyle aynı ailedendir.
    `online === false` kuralı ParticipantRow ve harita piniyle AYNI; alan yoksa (bilgi henüz
    gelmemiş) kimse haksız yere çevrimdışı gösterilmez. */
/** `people` KANONİK liste olmalı (`SessionView.participants`) — avatar rengi dizi sırasından
    çıkar ve harita pini, roster satırı, yol çubuğu noktası aynı sırayı okur
    (`lib/personColor.ts`). Filtrelenmiş bir liste geçilirse renkler ekranlar arasında kayar. */
export default function AvatarRow(props: {
  people: ParticipantDto[];
  /** Artboard W3b 390: başlıkta avatar yığını YOK (roster alt şeritte). Çocuklar (ses denetimi)
      basılmaya devam eder — yığın gizlenir, satır değil. */
  peopleLgOnly?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className={`flex gap-1.5${props.peopleLgOnly ? " max-lg:hidden" : ""}`}>
        {props.people.map((p, i) => {
          const away = p.online === false && !p.manual;
          // "Kim hangi araçla geliyor" başlıktaki yığından da okunabilmeli (kullanıcı isteği
          // 2026-09-08) — roster satırı bu bilgiyi zaten taşıyor, avatar yığını taşımıyordu.
          // Ulaşım türü YOKSA hiçbir şey yazılmaz: sunucu varsayılanı (CAR) burada UYDURULMAZ,
          // `ParticipantRow`/`WinnerCard` ile aynı kural.
          const mode = p.travelMode;
          const icons = mode ? MODE_ICON[mode] : [];
          const modeName = mode ? t(MODE_LABEL_KEY[mode].name) : null;
          const status = `${p.displayName ?? "?"} · ${t(away ? "waiting.offline" : "waiting.online")}`;
          const label = modeName ? `${status} · ${modeName}` : status;
          return (
            // tabIndex: tooltip klavyeyle de açılır (hover tek erişim yolu olamaz).
            <span key={p.id ?? i} className="group relative inline-flex cursor-pointer" tabIndex={0}>
              <span className={away ? "inline-flex opacity-55" : "inline-flex"}>
                <Avatar size="sm" name={p.displayName ?? "?"} index={i} ring />
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-card px-2.5 py-1 text-[0.75rem] font-bold text-ink opacity-0 shadow-sh1 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              >
                {status}
                {modeName && (
                  <span className="inline-flex items-center gap-1 font-normal text-ink2">
                    <span aria-hidden>·</span>
                    {/* Çift glifli mod (EBIKE) ilk glifi 9px rozet olarak basar — artboard 1115,
                        `ParticipantRow`/`WinnerCard` ile aynı kural. */}
                    {icons.map((Icon, k) => (
                      <Icon key={k} size={icons.length > 1 && k === 0 ? 9 : 14} aria-hidden />
                    ))}
                    {modeName}
                  </span>
                )}
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
