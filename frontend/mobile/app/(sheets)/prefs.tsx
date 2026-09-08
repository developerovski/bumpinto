import { LANGUAGES, MODE_LABEL_KEY, TRAVEL_MODES, type TravelMode } from "@bumpinto/shared";
import { useLocalSearchParams } from "expo-router";
import { CheckIcon, type Icon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText, Card } from "../../src/components/atoms";
import { ScreenHeader } from "../../src/components/molecules";
import i18n from "../../src/i18n";
import { ACTIVITY_ICON, MODE_ICON } from "../../src/icons";
import { useMeStore } from "../../src/store/meStore";
import { colors, space } from "../../src/theme";
import { goBackOr } from "../../src/lib/nav";

type Field = "language" | "activity" | "travelMode";

const ACTIVITIES = Object.keys(ACTIVITY_ICON) as (keyof typeof ACTIVITY_ICON)[];

const TITLE_KEY: Record<Field, string> = {
  language: "profile.language",
  activity: "profile.defaultActivity",
  travelMode: "profile.defaultTravelMode",
};

export default function PrefsSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ field?: Field }>();
  const field: Field = params.field ?? "language";
  const me = useMeStore((s) => s.me);
  const error = useMeStore((s) => s.error);
  const update = useMeStore((s) => s.update);

  const value =
    field === "language"
      ? (me?.language ?? i18n.resolvedLanguage)
      : field === "activity"
        ? me?.defaultActivity
        : me?.defaultTravelMode;

  async function choose(next: string) {
    const patch =
      field === "language"
        ? { language: next }
        : field === "activity"
          ? { defaultActivity: next as NonNullable<typeof me>["defaultActivity"] }
          : { defaultTravelMode: next as TravelMode };

    if (!(await update(patch))) return;
    if (field === "language") await i18n.changeLanguage(next);
    goBackOr("/profile");
  }

  return (
    <View style={s.sheet}>
      <ScreenHeader
        title={t(TITLE_KEY[field])}
        backLabel={t("common.close")}
        onBack={() => goBackOr("/profile")}
      />
      <ScrollView contentContainerStyle={s.body}>
        <Card padded={false}>
          {optionsFor(field, t).map((o, i) => (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected: o.value === value }}
              onPress={() => void choose(o.value)}
              style={[s.row, i > 0 ? s.divider : null]}
            >
              {o.Icon ? <o.Icon size={18} color={colors.ink2} /> : null}
              <AppText variant="label" style={{ flex: 1 }}>
                {o.label}
              </AppText>
              {o.value === value ? (
                <CheckIcon size={18} color={colors.grass} weight="bold" />
              ) : null}
            </Pressable>
          ))}
        </Card>

        {field === "language" ? (
          <AppText variant="muted" style={s.hint}>
            {t("profile.langHint")}
          </AppText>
        ) : null}

        {error ? (
          <AppText variant="muted" style={{ color: colors.flameDeep, marginTop: 10 }}>
            {t(error)}
          </AppText>
        ) : null}
      </ScrollView>
    </View>
  );
}

type Option = { value: string; label: string; Icon?: Icon };

function optionsFor(field: Field, t: (key: string) => string): Option[] {
  if (field === "language") return LANGUAGES.map((l) => ({ value: l.code, label: l.label }));
  if (field === "activity")
    return ACTIVITIES.map((a) => ({ value: a, label: t(`activity.${a}`), Icon: ACTIVITY_ICON[a] }));
  return TRAVEL_MODES.map((m) => ({
    value: m,
    label: t(MODE_LABEL_KEY[m].name),
    Icon: MODE_ICON[m][0],
  }));
}

const s = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper },
  body: { paddingHorizontal: space.screenX, paddingBottom: 24 },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.cardX,
    gap: 10,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  hint: { marginTop: 12 },
});
