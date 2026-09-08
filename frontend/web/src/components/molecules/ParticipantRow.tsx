/* Kaynak: ui.css .row / .field / .label / .a-m2 / .muted + W2 satır ölçüleri */
import { DotsThree, Microphone } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { MODE_ICON, MODE_LABEL_KEY } from "../../lib/travelMode";
import { useVoiceStore } from "../../store/voiceStore";
import { Avatar, Badge } from "../atoms";

/** WinnerCard'daki kuralla aynı — geçersiz ISO'da satır hiç çizilmez. */
function hhmm(iso: string, locale: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Artboard W2 · .srow — avatar + ad/alt satır + rozet(ler).
    Artboard v3 (W3 1107–1108): kuran satırında "Kuran" rozeti durum rozetini GİZLEMEZ, ikisi
    birlikte basılır — "Kuran" bir rol, "Hazır/Bekliyor" bir durum.
    Alt satır: "{{şehir}} · <ikon> ~{{dk}} dk" — ikon ve dakika `travelMode`/`midpointMinutes`
    alanları ZATEN katılımcı nesnesinin üstünde (B-7:T1, üretilmiş tipte), ayrı prop olarak
    THREAD edilmez. Geliş animasyonu: `animate-appear` (reduced-motion `@layer base`'te kapalı).
    Çevrimdışı satır SOLUKLAŞTIRILIR ve alt satıra tek kelime eklenir — ayrı bir rozet YOK,
    "geç kaldı" damgası YOK (ürünün dil kuralları katılımcıyı suçlayan ifadeyi yasaklar).
    Ses: `inVoice` görünümden, mikrofon ikonu; konuşma halkası `voiceStore`'dan (K12). */
export default function ParticipantRow(props: {
  participant: ParticipantDto;
  index: number;
  isSelf?: boolean;
  onOptions?: (participant: ParticipantDto) => void;
  /** `SessionView.anchored` — çapalı oturumda merkez host'un seçtiği sabit noktadır, kimsenin
      konumu GEREKMEZ. Bu yüzden konumsuz katılımcı "bekleyen" değil HAZIR sayılır
      (artboard W3d 4020/4113). */
  anchored?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const p = props.participant;
  const mode = p.hasLocation ? p.travelMode : undefined;
  // Çapalıda konum vermemek bir eksiklik değil: satır hazır görünür (halka + yeşil rozet),
  // nabız/kesikli avatar YOK — kimse bu kişiyi beklemiyor.
  const noLocationNeeded = props.anchored === true && !p.hasLocation;
  const ready = p.hasLocation || noLocationNeeded;
  const icons = mode ? MODE_ICON[mode] : [];
  // `online` sunucudan gelir; istemci canlilik TURETMEZ. undefined = bilgi yok, cevrimici say
  // (yeni alan gelmeden once render edilen gorunumler kisiyi haksiz yere solutmasin).
  // Elle eklenen noktalar (SOLO) soket acamaz, onlarda gosterilmez.
  const away = p.online === false && !p.manual;
  const online = p.online !== false && !p.manual;
  const blocked = p.blocked === true;
  // Alan yoksa metin UYDURULMAZ: linkOpenedAt yoksa mevcut "Konum bekleniyor…" kalır.
  const waitingLine = p.hasLocation
    ? p.locationLabel
    : noLocationNeeded
      ? t(props.isSelf ? "waiting.noLocationNeededSelf" : "waiting.noLocationNeeded")
      : p.linkOpenedAt
        ? t("presence.linkOpened")
        : t("waiting.waitingLocation");
  const seen = away && p.lastSeenAt ? hhmm(p.lastSeenAt, i18n.resolvedLanguage ?? i18n.language) : null;
  // K12: konuşma bilgisi ses deposundan (istemcide ölçülür); üyelik görünümden (`inVoice`).
  const speaking = useVoiceStore((s) =>
    props.isSelf ? s.selfSpeaking : !!(p.id && s.peers[p.id]?.speaking),
  );
  const inVoice = !!p.inVoice;
  // Artboard satır dolgusu: 390'da 11px, 1280'de 13px.
  return (
    <div
      className={`flex items-center gap-3 px-4 py-[0.6875rem] lg:py-[0.8125rem] animate-appear${away || blocked ? " opacity-55" : ""}`}
    >
      <span
        className={`relative inline-flex flex-none rounded-full${speaking ? " ring-[3px] ring-grass ring-offset-2 ring-offset-card" : ""}${!ready ? " c-pulse" : ""}`}
      >
        <Avatar
          name={p.displayName ?? "?"}
          index={props.index}
          ring={ready}
          waiting={!ready}
        />
        {online && (
          <i
            data-testid="online-dot"
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card bg-grass"
          />
        )}
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[0.875rem] font-bold">
          {p.displayName}
          {props.isSelf && <span className="font-normal text-ink2"> {t("waiting.you")}</span>}
          {inVoice && (
            <span className="ml-1.5 inline-flex items-center align-middle text-grass">
              <Microphone size={14} aria-hidden />
              <span className="sr-only">{t("voice.inVoice")}</span>
            </span>
          )}
          {speaking && <span className="sr-only">{t("voice.speaking")}</span>}
        </span>
        <span className="flex items-center gap-1.5 text-[0.75rem] text-ink2">
          {waitingLine}
          {icons.length > 0 && (
            <>
              <span aria-hidden>·</span>
              {icons.map((Icon, i) => (
                <Icon key={i} size={14} aria-hidden />
              ))}
              {mode && <span className="sr-only">{t(MODE_LABEL_KEY[mode].name)}</span>}
              {p.midpointMinutes != null && (
                <span className="tabular-nums">{t("travel.min", { min: p.midpointMinutes })}</span>
              )}
            </>
          )}
          {away && (
            <>
              <span aria-hidden>·</span>
              <span>{seen ? t("presence.lastSeen", { time: seen }) : t("waiting.offline")}</span>
            </>
          )}
          {blocked && (
            <>
              <span aria-hidden>·</span>
              <span className="font-bold text-flame-deep">{t("social.blockedRow")}</span>
            </>
          )}
        </span>
      </div>
      {props.onOptions && !props.isSelf && !blocked && (
        <button
          type="button"
          aria-label={t("social.options", { name: p.displayName ?? "?" })}
          className="flex-none rounded-full p-1.5 text-ink2 hover:text-ink"
          onClick={() => props.onOptions?.(p)}
        >
          <DotsThree size={20} weight="bold" aria-hidden />
        </button>
      )}
      {p.host && <Badge tone="neutral">{t("waiting.host")}</Badge>}
      <Badge tone={ready ? "grass" : "amber"}>
        {ready ? t("waiting.ready") : t("waiting.waitingBadge")}
      </Badge>
    </div>
  );
}
