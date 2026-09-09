import type { ParticipantDto } from "@bumpinto/shared";
import { router } from "expo-router";
import { MicrophoneIcon, XIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { MODE_ICON } from "../../icons";
import { useVoiceStore } from "../../store/voiceStore";
import { colors, space } from "../../theme";
import { AppText, Avatar, Badge, IconButton } from "../atoms";

/**
 * Oturum katılımcı satırı (O18 / P5 / P6 / P7 / P10 `.srow`). Lobi, Bekle, Bireysel kurulum
 * ve M-8 karar ekranı AYNI satırı kullanır.
 *
 * ENGELLENMİŞ satır kimliği ve konumu GİZLER (Apple 1.2): ad yerine "Engellenen kişi",
 * gri monogram, konum/ulaşım satırı hiç çizilmez. Engelleme tek yönlüdür; karşı taraf
 * engellendiğini görmez, bu yüzden bu gizleme yalnız engelleyenin ekranındadır.
 *
 * ÇEVRİMDIŞI satır solar ve alt satıra tek kelime eklenir — ayrı bir rozet ya da "geç kaldı"
 * damgası YOK (ürünün dil kuralları katılımcıyı suçlayan ifadeyi yasaklar).
 *
 * ÇAPALI oturumda konum vermemek eksiklik DEĞİL: satır hazır görünür, nabız/kesikli avatar
 * çizilmez — kimse bu kişiyi beklemiyor (artboard P7).
 *
 * Uzun basma bildir/engelle alt sayfasını açar — kendisi, engellenmiş ve elle eklenen hariç.
 */
export default function ParticipantRow(p: {
  participant: ParticipantDto;
  slug?: string;
  index?: number;
  self?: boolean;
  /** `SessionView.anchored` — konum beklenmiyor demek. */
  anchored?: boolean;
  /** Bireysel kurulumda elle eklenen noktayı kaldırır (P5 `.icb.gh` X). */
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const person = p.participant;

  /* Sesli sohbet göstergeleri (M-6). Kaynak SUNUCU (`inVoice`) + yerel mesh (konuşuyor mu);
     istemci canlılık TÜRETMEZ. Engellenmiş satırda hiçbiri çizilmez — o satır kimliği zaten
     gizliyor. */
  const speaking = useVoiceStore((s) =>
    p.self ? s.selfSpeaking : person.id ? !!s.peers[person.id]?.speaking : false,
  );
  const inVoice = person.inVoice === true && person.blocked !== true;
  const blocked = person.blocked === true;
  const name = blocked ? t("social.blockedName") : (person.displayName ?? "?");

  // Çapalıda konum vermemek bir eksiklik değil — satır hazır sayılır.
  const noLocationNeeded = p.anchored === true && !person.hasLocation;
  const ready = person.hasLocation === true || noLocationNeeded;
  // `online` SUNUCUDAN gelir; istemci canlılık TÜRETMEZ. Alan yoksa çevrimiçi sayılır —
  // yeni alan gelmeden çizilen görünüm kişiyi haksız yere soluk göstermesin.
  // Elle eklenen noktalar (SOLO) soket açamaz; onlarda hiç gösterilmez.
  //
  // KENDİ satırında presence HİÇ ÇİZİLMEZ (ne nokta, ne "çevrimdışı", ne soluklaştırma):
  // ekrana bakan kişiye "çevrimdışısın" demek anlamsız. Mobilde ayrıca YANLIŞ olurdu —
  // canlı kanal M-6'da açılıyor, o zamana dek sunucu bu istemciyi hiç çevrimiçi görmüyor ve
  // kullanıcı KENDİ satırını soluk, "offline" etiketli görüyordu (2026-09-08 emülatörde).
  const away = person.online === false && !person.manual && !p.self;
  const online = person.online !== false && !person.manual && !p.self;

  // EBIKE iki glif basar (bisiklet + şimşek) — `MODE_ICON` bu yüzden DİZİ döner.
  const mode = person.hasLocation ? person.travelMode : undefined;
  const modeIcons = mode ? MODE_ICON[mode] : [];

  // Alan yoksa metin UYDURULMAZ: `linkOpenedAt` yoksa "Konum bekleniyor…" kalır.
  const place = person.hasLocation
    ? person.locationLabel
    : noLocationNeeded
      ? t(p.self ? "waiting.noLocationNeededSelf" : "waiting.noLocationNeeded")
      : person.linkOpenedAt
        ? t("presence.linkOpened")
        : t("waiting.waitingLocation");

  const openSheet = () => {
    if (p.self || blocked || person.manual || !p.slug || !person.id) return;
    router.push({
      pathname: "/(sheets)/participant",
      params: {
        slug: p.slug,
        participantId: person.id,
        name: person.displayName ?? "",
        place: person.locationLabel ?? "",
      },
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={p.self || blocked || person.manual ? undefined : t("social.longPressHint")}
      onLongPress={openSheet}
      delayLongPress={400}
      style={[s.row, away || blocked ? s.dim : null]}
    >
      {/* Engellenmiş satırda avatar NÖTR: kişinin rengi kimliğidir, onu da göstermeyiz. */}
      <Avatar
        name={blocked ? "·" : name}
        tint={p.index ?? 0}
        online={blocked ? undefined : online || undefined}
        ring={!blocked && ready}
        waiting={!blocked && !ready}
        speaking={!blocked && speaking}
      />

      <View style={s.text}>
        <AppText variant="label" style={s.name}>
          {name}
          {p.self ? <AppText variant="muted"> {t("waiting.you")}</AppText> : null}
        </AppText>
        {blocked ? null : (
          <View style={s.sub}>
            {/* Sesli sohbette olan kişi: küçük mikrofon glifi. Konuşurken flame, sessizken
                nötr — ayrı bir "konuşuyor" ROZETİ yok (rozet çorbası yasağı). */}
            {inVoice ? (
              <MicrophoneIcon
                size={13}
                color={speaking ? colors.flameDeep : colors.ink3}
                weight="fill"
              />
            ) : null}
            {place ? <AppText variant="muted">{place}</AppText> : null}
            {modeIcons.length > 0 ? (
              <>
                <AppText variant="muted">·</AppText>
                {modeIcons.map((Mode, i) => (
                  <Mode
                    key={i}
                    size={modeIcons.length > 1 && i > 0 ? 9 : 14}
                    color={colors.ink2}
                  />
                ))}
                {person.midpointMinutes != null ? (
                  <AppText variant="num" style={s.minutes}>
                    {t("travel.min", { min: person.midpointMinutes })}
                  </AppText>
                ) : null}
              </>
            ) : null}
            {away ? (
              <>
                <AppText variant="muted">·</AppText>
                <AppText variant="muted">{t("waiting.offline")}</AppText>
              </>
            ) : null}
          </View>
        )}
      </View>

      {blocked ? (
        <Badge>{t("social.blockedRow")}</Badge>
      ) : (
        <>
          {/* Artboard P6 1107: "Kuran" bir ROL, "Hazır/Bekliyor" bir DURUM — biri diğerini
              gizlemez, ikisi birlikte basılır. */}
          {person.manual ? <Badge>{t("newSession.manual")}</Badge> : null}
          {person.host ? <Badge>{t("waiting.host")}</Badge> : null}
          <Badge tone={ready ? "grass" : "amber"}>
            {t(ready ? "waiting.ready" : "waiting.waitingBadge")}
          </Badge>
        </>
      )}

      {p.onRemove ? (
        <IconButton
          kind="ghost"
          label={t("newSession.remove", { name })}
          onPress={p.onRemove}
          icon={<XIcon size={16} color={colors.ink2} />}
        />
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: space.rowY,
    paddingHorizontal: space.cardX,
  },
  dim: { opacity: 0.55 },
  text: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontWeight: "700" },
  sub: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  minutes: { color: colors.ink2 },
});
