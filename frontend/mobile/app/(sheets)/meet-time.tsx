import { defaultMeetAt, type CalendarEvent } from "@bumpinto/shared";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams } from "expo-router";
import { CalendarPlusIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, ScrollView, StyleSheet, View } from "react-native";

import { AppText, Button } from "../../src/components/atoms";
import { ScreenHeader } from "../../src/components/molecules";
import { webBase } from "../../src/lib/api";
import { shareIcs } from "../../src/lib/calendar";
import { goBackOr } from "../../src/lib/nav";
import { useSessionStore } from "../../src/store/sessionStore";
import { useToastStore } from "../../src/store/toastStore";
import { colors, space } from "../../src/theme";

/**
 * Artboard P20 "Takvime ekle" alt sayfası.
 *
 * Sistemde buluşma saati YOKTUR (§2): sunucu bir saat tutmaz, bu yüzden kullanıcıya SORULUR.
 * Öneri karar anı + 1 saat, tam saate yuvarlı (`defaultMeetAt`, web `MeetTimeDialog` ile aynı
 * fonksiyon). Uydurma bir saatle sessizce etkinlik yaratmak, kullanıcıyı yanlış saatte bir
 * yere göndermek olurdu.
 *
 * Android'de picker MODALDIR (kendi diyaloğunu açar), iOS'ta satır içi `compact` kontroldür —
 * bu yüzden Android'de düğmeyle açılır, iOS'ta doğrudan çizilir.
 */
export default function MeetTimeSheet() {
  const { t } = useTranslation();
  const { slug = "", venueId = "" } = useLocalSearchParams<{ slug?: string; venueId?: string }>();
  const view = useSessionStore((s) => s.view);
  const push = useToastStore((s) => s.push);

  const venue = (view?.venues ?? []).find((v) => v.id === venueId);
  const [when, setWhen] = useState(() => defaultMeetAt(view?.decidedAt));
  const [show, setShow] = useState<"date" | "time" | null>(null);
  const [busy, setBusy] = useState(false);

  const back = () => goBackOr(slug ? `/s/${slug}` : "/sessions");

  /** Seçilen parçayı KORUYARAK birleştirir: tarih seçimi saati, saat seçimi tarihi bozmaz. */
  function merge(part: "date" | "time", picked: Date) {
    const next = new Date(when);
    if (part === "date") next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    setWhen(next);
  }

  async function addToCalendar() {
    if (!venue) return;
    setBusy(true);
    try {
      const event: CalendarEvent = {
        uid: `${slug}-${venue.id ?? "venue"}@bumpinto.app`,
        start: when,
        durationMinutes: 90,
        // Oturumun adı OPSİYONEL: adsızken `eventTitle` "Mekan · " diye sarkan bir ayraç
        // bırakıyordu (2026-09-09 cihazda görüldü) — o durumda yalnız mekan adı yazılır.
        title: view?.name
          ? t("calendar.eventTitle", { venue: venue.name ?? "", session: view.name })
          : (venue.name ?? ""),
        location: venue.address ?? venue.name ?? "",
        url: `${webBase}/j/${slug}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const result = await shareIcs(event, slug, t("calendar.add"));
      if (result !== "shared") push("calendar.error", undefined, "flame");
    } finally {
      setBusy(false);
      back();
    }
  }

  const dateText = when.toLocaleDateString();
  const timeText = when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={s.sheet}>
      <ScreenHeader title={t("calendar.title")} backLabel={t("common.close")} onBack={back} />
      <ScrollView contentContainerStyle={s.body}>
        <AppText variant="muted">{t("calendar.hint")}</AppText>

        {Platform.OS === "ios" ? (
          <View style={s.pickers}>
            <View style={s.field}>
              <AppText variant="over">{t("calendar.date")}</AppText>
              <DateTimePicker
                value={when}
                mode="date"
                display="compact"
                accessibilityLabel={t("calendar.date")}
                onChange={(_e, picked) => picked && merge("date", picked)}
              />
            </View>
            <View style={s.field}>
              <AppText variant="over">{t("calendar.time")}</AppText>
              <DateTimePicker
                value={when}
                mode="time"
                display="compact"
                accessibilityLabel={t("calendar.time")}
                onChange={(_e, picked) => picked && merge("time", picked)}
              />
            </View>
          </View>
        ) : (
          <View style={s.pickers}>
            <Button
              small
              kind="white"
              title={`${t("calendar.date")} · ${dateText}`}
              onPress={() => setShow("date")}
              style={s.pickerButton}
            />
            <Button
              small
              kind="white"
              title={`${t("calendar.time")} · ${timeText}`}
              onPress={() => setShow("time")}
              style={s.pickerButton}
            />
            {show ? (
              <DateTimePicker
                value={when}
                mode={show}
                display="default"
                onChange={(_e, picked) => {
                  setShow(null);
                  if (picked) merge(show, picked);
                }}
              />
            ) : null}
          </View>
        )}

        <Button
          title={t("calendar.share")}
          disabled={busy || !venue}
          icon={<CalendarPlusIcon size={18} color="#fff" weight="bold" />}
          onPress={() => void addToCalendar()}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper },
  body: { paddingHorizontal: space.screenX, paddingBottom: 32, gap: 14 },
  pickers: { gap: 10 },
  field: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerButton: { width: "100%" },
});
