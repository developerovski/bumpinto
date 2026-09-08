import { LANGUAGES } from "@bumpinto/shared";
import { CaretDownIcon, GlobeIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import i18n from "../../i18n";
import { colors, radius, shadow, size } from "../../theme";
import { AppText } from "../atoms";

/**
 * Artboard P8/P9/P10 `.lg` + `.pop` — davetli kabuğunun dil düğmesi.
 *
 * Tercih sayfası (`(sheets)/prefs`) DEĞİL: o `/api/me`'ye yazar, yani hesap ister. Davet
 * linkiyle gelen misafirin hesabı yoktur ve ekranı okuyabilmesi gerekir — bu düğme yalnız
 * i18n'i yerel olarak çevirir, sunucuya hiçbir şey yazmaz.
 */
export default function LanguageButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = i18n.resolvedLanguage ?? "tr";

  return (
    <View style={s.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("shell.langAria")}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={s.chip}
      >
        <GlobeIcon size={15} color={colors.ink2} />
        <AppText variant="h3" style={s.code}>
          {current.toUpperCase()}
        </AppText>
        <CaretDownIcon size={13} color={colors.ink2} />
      </Pressable>

      {open ? (
        <View style={s.pop}>
          {LANGUAGES.map((l) => {
            const on = l.code === current;
            return (
              <Pressable
                key={l.code}
                accessibilityRole="radio"
                accessibilityLabel={l.label}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setOpen(false);
                  void i18n.changeLanguage(l.code);
                }}
                style={[s.popRow, on ? s.popRowOn : null]}
              >
                <AppText variant="label" style={on ? { color: colors.flameDeep } : null}>
                  {l.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "relative" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: size.iconButton,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: colors.card,
  },
  code: { fontSize: 13 },
  pop: {
    position: "absolute",
    right: 0,
    top: 46,
    width: 188,
    zIndex: 20,
    backgroundColor: colors.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 6,
    gap: 2,
    ...shadow.s2,
  },
  popRow: { minHeight: size.buttonSm, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10 },
  popRowOn: { backgroundColor: colors.flameWash },
});
