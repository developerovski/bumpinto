import { personIndexOf, type SessionView } from "@bumpinto/shared";
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  PhoneXIcon,
  SpeakerHighIcon,
  WarningCircleIcon,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isHost, viewerId } from "../../store/sessionStore";
import { useVoiceStore } from "../../store/voiceStore";
import { dockStateOf } from "../../voice/dockState";
import { colors, radius, shadow, space } from "../../theme";
import { AppText, Avatar, Button, IconButton } from "../atoms";

/**
 * Artboard P25 — sesli sohbet hapı. CTA'nın ÜSTÜNDE yüzer (P6/P10/P11/P17); içeriği itmesin
 * diye mutlak konumlu ve `pointerEvents="box-none"`.
 *
 * Yedi hâlin KARARI burada değil `dockStateOf`ta: yedi `if` ekrana dağılsaydı biri değişince
 * diğerleri sessizce ayrışırdı. Bu dosya yalnız o kararı çizer.
 *
 * Mikrofon ön-ekranı BURADA çizilmez — `join()` M-5'in `presentMicConsent()` akışını çağırır
 * (O7 alt sayfası + sistem diyaloğu). İkinci bir izin arayüzü yazmak iki farklı gerekçe metni
 * demekti.
 */
const CTA_CLEARANCE = 72;

/** Artboard 4559: dock TAM DAKİKA yazar, saniye sayacı değil. */
function remainingMinutes(endsAt: string, now: number) {
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 60_000));
}

/** Dakika sayacını canlı tutar.
    İki React Compiler kuralı birden geçerli: saat ÇİZİM SIRASINDA okunamaz (saf değil) ve
    efekt içinde SENKRON `setState` yapılamaz (zincirleme çizim). Bu yüzden ilk tazeleme sıfır
    gecikmeli bir zamanlayıcıya alındı — "aktif olur olmaz tazele" davranışı korunur, kural
    çiğnenmez. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const refresh = () => setNow(Date.now());
    const kick = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 30_000);
    return () => {
      clearTimeout(kick);
      clearInterval(timer);
    };
  }, [active]);
  return now;
}

export default function VoiceDock({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const phase = useVoiceStore((s) => s.phase);
  const muted = useVoiceStore((s) => s.muted);
  const peers = useVoiceStore((s) => s.peers);
  const endedReason = useVoiceStore((s) => s.endedReason);
  const micBlocked = useVoiceStore((s) => s.micBlocked);
  const micDenied = useVoiceStore((s) => s.micDenied);
  const connectFailed = useVoiceStore((s) => s.connectFailed);
  const join = useVoiceStore((s) => s.join);
  const leave = useVoiceStore((s) => s.leave);
  const start = useVoiceStore((s) => s.start);
  const toggleMute = useVoiceStore((s) => s.toggleMute);
  const toggleSpeaker = useVoiceStore((s) => s.toggleSpeaker);

  const host = isHost(view);
  const me = viewerId(view);
  const endsAt = view.voice?.endsAt ?? null;
  const state = dockStateOf({ hasRoom: !!endsAt, host, phase, endedReason });
  const now = useNow(state === "open" || state === "in");

  if (state === "hidden") return null;
  // SOLO oturumda sesli sohbet yoktur (`voice.errSolo`) — dock hiç çizilmez.
  if (view.sessionType === "SOLO") return null;

  const members = (view.participants ?? []).filter((p) => p.inVoice && p.id !== me);
  const speaking = members.find((p) => p.id && peers[p.id]?.speaking);
  const failed = members.find((p) => p.id && peers[p.id]?.state === "failed");

  const body = () => {
    switch (state) {
      case "closedHost":
        return {
          title: t("voice.title"),
          note: t("voice.startHint"),
          action: <Button small title={t("voice.start")} onPress={() => void start()} style={s.action} />,
        };
      case "open":
        return {
          title: t("voice.members", { count: members.length + 1 }),
          note: endsAt ? t("voice.remainingMin", { min: remainingMinutes(endsAt, now) }) : undefined,
          action: <Button small title={t("voice.join")} onPress={() => void join()} style={s.action} />,
        };
      case "joining":
        return {
          title: t("voice.joining"),
          action: (
            <Button small disabled title={t("voice.join")} onPress={() => undefined} style={s.action} />
          ),
        };
      case "in":
        return {
          title: muted
            ? t("voice.mutedHint")
            : failed
              ? `${failed.displayName ?? "?"} · ${t("voice.peerFailed")}`
              : speaking
                ? t("voice.speakingBy", { name: speaking.displayName ?? "?" })
                : t("voice.inCall"),
          note: endsAt ? t("voice.remainingMin", { min: remainingMinutes(endsAt, now) }) : undefined,
          action: (
            <View style={s.controls}>
              <IconButton
                kind="ghost"
                label={t(muted ? "voice.unmute" : "voice.mute")}
                onPress={toggleMute}
                icon={
                  muted ? (
                    <MicrophoneSlashIcon size={20} color={colors.flameDeep} weight="fill" />
                  ) : (
                    <MicrophoneIcon size={20} color={colors.ink} weight="fill" />
                  )
                }
              />
              <IconButton
                kind="ghost"
                label={t("voice.speaker")}
                onPress={toggleSpeaker}
                icon={<SpeakerHighIcon size={20} color={colors.ink} weight="bold" />}
              />
              <IconButton
                label={t("voice.leave")}
                onPress={leave}
                icon={<PhoneXIcon size={20} color="#fff" weight="fill" />}
                style={s.leave}
              />
            </View>
          ),
        };
      case "error":
        return {
          title: t(
            micBlocked ? "voice.micBlocked" : micDenied ? "voice.micDenied" : "voice.connectFailedTitle",
          ),
          note: connectFailed ? t("voice.connectFailed") : undefined,
          action: micBlocked ? (
            <Button
              small
              kind="white"
              title={t("permission.openSettings")}
              onPress={() => void Linking.openSettings()}
              style={s.action}
            />
          ) : (
            <Button small title={t("voice.retry")} onPress={() => void join()} style={s.action} />
          ),
        };
      case "expired":
        return {
          title: t("voice.ended.TIME_LIMIT"),
          action: host ? (
            <Button small title={t("voice.restart")} onPress={() => void start()} style={s.action} />
          ) : undefined,
        };
      default:
        return { title: t("voice.title") };
    }
  };

  const content = body();

  return (
    <View
      pointerEvents="box-none"
      style={[s.wrap, { bottom: insets.bottom + CTA_CLEARANCE }]}
    >
      <View style={s.pill}>
        {/* Kimler içeride — kişi rengi kimliktir (bir kişi bir renk). Sesi gelmeyen soluk. */}
        <View style={s.avatars}>
          {members.slice(0, 3).map((p) => (
            <Avatar
              key={p.id}
              size="s"
              name={p.displayName ?? "?"}
              tint={personIndexOf(view.participants, p.id)}
              speaking={!!p.id && peers[p.id]?.speaking}
              style={p.id && peers[p.id]?.state === "failed" ? s.faded : undefined}
            />
          ))}
        </View>

        <View style={s.text}>
          <AppText variant="h3" numberOfLines={1}>
            {content.title}
          </AppText>
          {content.note ? (
            <AppText variant="muted" numberOfLines={1} style={s.note}>
              {content.note}
            </AppText>
          ) : null}
        </View>

        {state === "error" ? (
          <WarningCircleIcon size={18} color={colors.amberInk} weight="fill" />
        ) : null}
        {content.action}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: space.screenX, right: space.screenX },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.s2,
  },
  avatars: { flexDirection: "row", alignItems: "center", gap: -6 },
  faded: { opacity: 0.55 },
  text: { flex: 1, minWidth: 0 },
  note: { fontSize: 12 },
  /* Hap içindeki eylem OTOMATİK genişlikte: `Button` varsayılanı tam genişliktir ve dock'ta
     avatarları, kişi sayısını ve kalan süreyi eziyordu (2026-09-09 emülatörde görüldü). */
  action: { width: "auto", flexShrink: 0, paddingHorizontal: 14 },
  controls: { flexDirection: "row", alignItems: "center", gap: 4 },
  leave: { backgroundColor: colors.flameDeep },
});
