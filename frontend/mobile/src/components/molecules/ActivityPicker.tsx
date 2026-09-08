import { ACTIVITY_GROUPS, ACTIVITY_GROUP_ORDER, type Activity } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { ACTIVITY_ICON } from "../../icons";
import { colors, space } from "../../theme";
import { AppText, Chip } from "../atoms";

/**
 * Artboard P3 `.grps` / `.grp` / `.chips` — dört grup, her grup `.ov` üstlüğü + sarmalayan
 * çipler. Mobil v3 CSS `.grps`i TEK sütuna indiriyor (`grid-template-columns:1fr`), o yüzden
 * gruplar alt alta akar.
 *
 * Grup verisi `@bumpinto/shared`'tan (`ACTIVITY_GROUPS`) — web ile TEK kaynak; burada yalnız
 * mobil ikon eşlemesi (`ACTIVITY_ICON`) bağlanır.
 */
export default function ActivityPicker(p: {
  value: readonly Activity[];
  onToggle: (a: Activity) => void;
  isLocked: (a: Activity) => boolean;
}) {
  const { t } = useTranslation();

  return (
    <View style={s.groups}>
      {ACTIVITY_GROUP_ORDER.map((group) => (
        <View key={group} style={s.group}>
          <AppText variant="over">{t(`activity.group.${group}`)}</AppText>
          <View style={s.chips}>
            {ACTIVITY_GROUPS[group].map((raw) => {
              const activity = raw as Activity;
              const Icon = ACTIVITY_ICON[activity];
              const on = p.value.includes(activity);
              return (
                <Chip
                  key={activity}
                  label={t(`activity.${activity}`)}
                  on={on}
                  // Sınır dolduğunda seçili OLMAYAN çipler kapanır; seçili olan hep açık
                  // kalır, yoksa kullanıcı seçimini değiştiremez (çıkmaz sokak).
                  disabled={p.isLocked(activity)}
                  onPress={() => p.onToggle(activity)}
                  icon={<Icon size={18} color={on ? colors.flameDeep : colors.ink2} />}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  groups: { gap: space.gap },
  group: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
