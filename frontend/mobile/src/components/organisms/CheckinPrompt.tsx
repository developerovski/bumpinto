import { BADGES, badgesFor, newBadges, type BadgeId, type SessionView } from "@bumpinto/shared";
import * as Haptics from "expo-haptics";
import { ConfettiIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { api, forgetParticipantToken, hasParticipantToken } from "../../lib/api";
import { statusOf } from "../../lib/apiError";
import { BADGE_ICON } from "../../lib/badgeIcons";
import { markAnswered, wasAnswered } from "../../lib/checkinMark";
import { repairParticipantToken } from "../../lib/participantSession";
import { useAuthStore } from "../../store/authStore";
import { useMeStore } from "../../store/meStore";
import { colors, fonts, radius } from "../../theme";
import { AppText, Avatar, Button, HandNote, Sticker } from "../atoms";
import BottomSheet from "./BottomSheet";

type Phase = "ask" | "busy" | { badge: BadgeId; next: BadgeId | null };

/** `ok` = kaydedildi · `retry` = kaydedilmedi, tekrar sorulabilir · `permanent` = sorulacak bir şey yok. */
type Outcome = "ok" | "retry" | "permanent";

/**
 * Cevabı sunucuya yazar. Check-in katılımcı jetonu ister ve 403 İKİ şey demek olabilir: gerçekten
 * koltuk yok (kalıcı) ya da elimizdeki jeton yok/bayat — sunucu süresi geçmiş jetonu sessizce yok
 * sayar (24 sa TTL; bir gün önceden kurulan planda buluşma o sınırı aşar). İkincisini kalıcı saymak
 * cevabı sunucuya HİÇ yazmadan cihazda "cevaplandı" diye işaretlerdi. Bu yüzden: jeton yoksa önce
 * onarılır (olmazsa tekrar denenebilir); 403'te jeton atılıp onarılır ve BİR KEZ yeniden denenir;
 * yalnız 404 ya da onarımdan SONRA da süren 403 kalıcıdır.
 */
async function sendCheckin(slug: string, view: SessionView, met: boolean): Promise<Outcome> {
  if (!hasParticipantToken(slug) && !(await repairParticipantToken(slug, view))) return "retry";
  try {
    await api.checkin(slug, met);
    return "ok";
  } catch (e) {
    const code = statusOf(e);
    if (code === 404) return "permanent";
    // 409 = sunucuya göre buluşma henüz geçmedi (saat kayması); ağ/5xx — ikisi de tekrar denenebilir.
    if (code !== 403) return "retry";
  }
  forgetParticipantToken(slug);
  if (!(await repairParticipantToken(slug, view))) return "retry";
  try {
    await api.checkin(slug, met);
    return "ok";
  } catch (e) {
    const code = statusOf(e);
    return code === 403 || code === 404 ? "permanent" : "retry";
  }
}

/**
 * Keşfet POC P5 ("Buluştunuz mu?") + P5b (rozet anı) — oturum yönlendiricisinin KARDEŞİ: açık
 * planın buluşması (pencereli planda penceresi) lobi, mekanlar, deste ya da karar aşamasının
 * herhangi birinde geçebilir ve 30 sn'lik tur `meetPassed`'i ekran açıkken çevirebilir.
 *
 * Tek soru, tek dokunuş. Yalnız CEVAP işaretler; kapatmak (karartma/geri) bu açılışlık gizler.
 * Rozet farkı yalnız HESAPLI kullanıcıda: misafir katılımcının sayacı yok.
 */
export default function CheckinPrompt({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const slug = view.slug ?? "";
  /** null = işaret okunuyor: okunmadan sorulmaz (cevaplanmış plan bir kare bile açılmasın). */
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [closed, setClosed] = useState(false);
  const [phase, setPhase] = useState<Phase>("ask");
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    void wasAnswered(slug).then((a) => {
      if (alive) setAnswered(a);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const due =
    !!view.openPlan?.meetPassed && !!view.viewer?.participantId && view.status !== "EXPIRED";
  const close = () => setClosed(true);

  async function answer(met: boolean) {
    setPhase("busy");
    setError(false);
    const auth = useAuthStore.getState();
    const counted = met && auth.status === "in";
    // Rozet farkının "önce"si: profil bu hesabın değilse ya da hiç yoksa ÖNCE yüklenir. Yükleme
    // düşerse fark HESAPLANMAZ — boş "önce" kullanıcının zaten sahip olduğu her rozeti yeni sayardı.
    if (counted) {
      const me = useMeStore.getState().me;
      if (!me || me.id !== auth.userId) await useMeStore.getState().load();
    }
    const baseline = counted ? useMeStore.getState().me : null;

    const outcome = await sendCheckin(slug, view, met);
    if (outcome === "retry") {
      setError(true);
      setPhase("ask");
      return;
    }
    await markAnswered(slug);
    if (outcome === "permanent") {
      close();
      return;
    }

    if (baseline) {
      const before = badgesFor(baseline.stats);
      // `load` çıkışa DÜŞÜRMEZ; hata olursa `me` değişmez ve kutlama da olmaz.
      await useMeStore.getState().load();
      const fresh = useMeStore.getState().me;
      if (fresh && fresh !== baseline) {
        const after = badgesFor(fresh.stats);
        const gained = newBadges(before, after);
        if (gained.length) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPhase({ badge: gained[0], next: BADGES.find((b) => !after.includes(b.id))?.id ?? null });
          return;
        }
      }
    }
    close();
  }

  const busy = phase === "busy";
  const people = view.participants ?? [];

  const celebration = (badge: BadgeId, next: BadgeId | null) => {
    const Icon = BADGE_ICON[badge];
    const body =
      t(`badge.${badge}.hint`) +
      (next ? ` ${t("badge.next", { title: t(`badge.${next}.title`) })}` : "");
    return (
      <View style={s.celebrate}>
        <Sticker style={s.centerSelf}>{t("badge.new")}</Sticker>
        <View style={s.bigBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon size={50} color={colors.ink} />
        </View>
        <AppText style={[s.big, s.centerText]}>{`${t(`badge.${badge}.title`)}!`}</AppText>
        <AppText variant="body" style={[s.lead, s.centerText]}>
          {body}
        </AppText>
        <HandNote>{t("badge.hand")}</HandNote>
        <Button title={t("common.ok")} onPress={close} />
      </View>
    );
  };

  return (
    <BottomSheet visible={due && answered === false && !closed} onClose={close} closeLabel={t("common.close")}>
      {typeof phase === "object" ? (
        celebration(phase.badge, phase.next)
      ) : (
        <>
          <View style={s.head}>
            <View style={s.stack}>
              {/* Kanonik roster sırası: bir kişi = bir renk. */}
              {people.slice(0, 5).map((p, i) => (
                <Avatar
                  key={p.id ?? i}
                  name={p.displayName ?? "?"}
                  tint={i}
                  size="s"
                  ring
                  style={i ? s.stacked : undefined}
                />
              ))}
            </View>
            {view.name ? (
              <AppText variant="over" numberOfLines={1} style={s.flex}>
                {view.name}
              </AppText>
            ) : null}
          </View>
          <AppText style={s.big}>{t("checkin.title")}</AppText>
          <AppText variant="body" style={s.lead}>
            {t("checkin.lead")}
          </AppText>
          {error ? (
            <AppText variant="muted" style={s.error}>
              {t("checkin.error")}
            </AppText>
          ) : null}
          <View style={s.row}>
            <Button
              title={t("checkin.yes")}
              icon={<ConfettiIcon size={18} color="#fff" />}
              disabled={busy}
              onPress={() => void answer(true)}
              style={s.half}
            />
            <Button
              kind="white"
              title={t("checkin.no")}
              disabled={busy}
              onPress={() => void answer(false)}
              style={s.half}
            />
          </View>
          <HandNote>{t("checkin.hand")}</HandNote>
        </>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  stack: { flexDirection: "row" },
  stacked: { marginLeft: -9 },
  flex: { flex: 1 },
  big: { fontFamily: fonts.head, fontSize: 28, lineHeight: 30, color: colors.ink, letterSpacing: -0.4 },
  lead: { color: colors.ink2 },
  error: { color: colors.flameDeep, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, marginTop: 4 },
  half: { flex: 1, width: undefined },
  celebrate: { alignItems: "center", gap: 10 },
  centerSelf: { alignSelf: "center" },
  centerText: { textAlign: "center" },
  bigBadge: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.highlight,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
});
