import {
  activityListLabel,
  meetAtOptions,
  personIndexOf,
  sessionActivities,
  type ParticipantDto,
  type SeatRequestDto,
} from "@bumpinto/shared";
import { CheckCircleIcon, CheckIcon } from "phosphor-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Avatar, Badge, Button, Card, HandNote, Sticker } from "../components/atoms";
import { ScreenHeader, SeatDots } from "../components/molecules";
import { goBackOr } from "../lib/nav";
import { useAuthStore } from "../store/authStore";
import { useSeatRequestsStore } from "../store/seatRequestsStore";
import { useSessionStore } from "../store/sessionStore";
import { colors, space } from "../theme";

/** `.rq` satırı. Bileşen modül düzeyinde: çizim içinde tanımlanan bileşen her çizimde yeni tür olurdu. */
function RequestRow(p: {
  r: SeatRequestDto;
  member: ParticipantDto | undefined;
  people: readonly ParticipantDto[];
  meta: string;
  sticker: string | null;
  locked: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const ok = p.r.status === "APPROVED";
  const name = p.r.displayName ?? "?";
  return (
    <Card style={[s.row, ok ? s.rowOk : null]}>
      {/* Bir kişi = bir renk: onaylı isteyen artık katılımcıdır, rengi roster'daki kanonik dizininden.
          Bekleyen henüz kimse değil — koltuklu birinin rengini ödünç almasın diye nötr (bekleyen) avatar. */}
      {p.member ? (
        <Avatar name={name} tint={personIndexOf(p.people, p.member.id)} />
      ) : (
        <Avatar name={name} waiting />
      )}
      <View style={s.body}>
        <View style={s.nameRow}>
          <AppText variant="h3" style={s.name}>
            {name}
          </AppText>
          {p.sticker ? <Sticker>{p.sticker}</Sticker> : null}
        </View>
        {p.meta ? <AppText variant="muted">{p.meta}</AppText> : null}
        {p.r.note ? (
          <AppText variant="muted" style={s.note}>
            {`“${p.r.note}”`}
          </AppText>
        ) : null}
        {ok ? (
          <View style={s.okLine}>
            <CheckCircleIcon size={14} color={colors.grass} />
            <AppText variant="muted" style={s.okText}>
              {t("seat.approved")}
            </AppText>
          </View>
        ) : (
          <View style={s.actions}>
            <Button
              small
              title={t("seat.approve")}
              hint={name}
              icon={<CheckIcon size={16} color="#fff" weight="bold" />}
              disabled={p.locked}
              onPress={p.onApprove}
              style={s.action}
            />
            <Button
              small
              kind="white"
              title={t("seat.decline")}
              hint={name}
              disabled={p.locked}
              onPress={p.onDecline}
              style={s.action}
            />
          </View>
        )}
      </View>
    </Card>
  );
}

/**
 * Keşfet POC P4 — host'un katılım istekleri (onay = kesin nokta). Lobi'deki girişten itilir;
 * rota `/sessions/…` altında: uçlar HESAP kimliğiyle çalışır, anonim rotalarda değildir.
 *
 * Veride olmayan çizilmez: `SeatRequestDto.minutes` sunucudan hiç gelmez (null) → "~ dk" yok;
 * isteyenin işyeri / "ilk planı" alt satırları API'de yok.
 */
export default function SeatRequestsScreen({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const listSlug = useSeatRequestsStore((s) => s.slug);
  const storedList = useSeatRequestsStore((s) => s.list);
  const busy = useSeatRequestsStore((s) => s.busy);
  const confirmedBy = useSeatRequestsStore((s) => s.confirmedBy);
  const load = useSeatRequestsStore((s) => s.load);
  const approve = useSeatRequestsStore((s) => s.approve);
  const decline = useSeatRequestsStore((s) => s.decline);
  const storedView = useSessionStore((s) => s.view);
  const loadView = useSessionStore((s) => s.loadView);

  // İkisi de YALNIZ bu planınsa: ilk karede depolarda önceki planın verisi durabilir.
  const list = listSlug === slug ? storedList : null;
  const view = storedView?.slug === slug ? storedView : null;
  const authed = status === "in";

  useEffect(() => {
    // Hesap oturumu olmayan host uca GİTMEZ: 401 yenileme kesicisini ve çıkışı tetiklerdi.
    if (authed) void load(slug);
  }, [authed, slug, load]);

  // Derin linkle doğrudan gelindiyse başlık ve roster için görünüm (host hesap koltuğundan okur).
  useEffect(() => {
    if (authed && !view) void loadView(slug);
  }, [authed, view, slug, loadView]);

  const plan = view?.openPlan ?? {};
  const approved = list?.approvedSeats ?? plan.approvedSeats ?? 0;
  const capacity = list?.capacity ?? plan.capacity ?? 0;
  // Geçilen istek sunucuda DECLINED kalır — host'a da gösterilmez; "geç" kimseye görünmez.
  const rows = (list?.requests ?? []).filter((r) => r.status !== "DECLINED");
  const pending = rows.filter((r) => r.status === "PENDING").length;
  const meetAt = plan.meetAt ? new Date(plan.meetAt) : null;
  const when = meetAt
    ? new Intl.DateTimeFormat(lang, meetAtOptions(meetAt, new Date(), "short")).format(meetAt)
    : null;
  const people = view?.participants ?? [];
  const title = view ? view.name || activityListLabel(sessionActivities(view), t, lang) : null;

  /** `.mi` — ilgi alanları · isteyenin kendi yazdığı yer · (varsa) dakika. */
  const meta = (r: SeatRequestDto) =>
    [
      (r.interests ?? []).map((a) => t(`activity.${a}`).toLocaleLowerCase(lang)).join(", "),
      r.locality,
      r.minutes != null ? `~${t("duration.m", { m: r.minutes })}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("seat.requests")}
        backLabel={t("common.back")}
        onBack={() => goBackOr(`/s/${slug}`)}
      />

      <ScrollView
        contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={s.summary}>
          <View style={s.summaryText}>
            {title ? <AppText variant="h3">{title}</AppText> : null}
            {when ? (
              <AppText variant="muted">{t("seat.summary", { when, capacity, approved })}</AppText>
            ) : null}
          </View>
          <View style={s.summaryRight}>
            {pending > 0 ? <Badge tone="flame">{t("seat.newCount", { count: pending })}</Badge> : null}
            <SeatDots approved={approved} capacity={capacity} count={false} />
          </View>
        </Card>

        {list && rows.length === 0 ? <AppText variant="muted">{t("seat.noRequests")}</AppText> : null}

        {rows.map((r, i) => {
          const id = r.id ?? "";
          const member =
            r.status === "APPROVED" ? people.find((p) => p.displayName === r.displayName && !p.host) : undefined;
          return (
            <RequestRow
              key={id || i}
              r={r}
              member={member}
              people={people}
              meta={meta(r)}
              sticker={
                r.status === "APPROVED" && id === confirmedBy
                  ? t("seat.confirmedSticker", { approved, capacity })
                  : null
              }
              locked={busy != null}
              onApprove={() => void approve(slug, id)}
              onDecline={() => void decline(slug, id)}
            />
          );
        })}

        {capacity > approved ? <HandNote>{t("seat.left", { count: capacity - approved })}</HandNote> : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, gap: space.gap },
  summary: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  summaryText: { flex: 1, gap: 3 },
  summaryRight: { alignItems: "flex-end", gap: 6 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderRadius: 18 },
  rowOk: { backgroundColor: colors.grassWash, borderColor: colors.grassLine },
  body: { flex: 1, minWidth: 0, gap: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flexShrink: 1 },
  note: { fontStyle: "italic" },
  okLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  okText: { color: colors.grass, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  action: { flex: 1, width: undefined },
});
