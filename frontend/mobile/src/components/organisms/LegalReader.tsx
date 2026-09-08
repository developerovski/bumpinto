import type { LegalBlock } from "@bumpinto/shared";
import { InfoIcon } from "phosphor-react-native";
import { Fragment } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { colors, radius } from "../../theme";
import { AppText, Card } from "../atoms";

/**
 * O9–O14 okuyucu tipografisi. Metin BLOK VERİSİ olarak gelir (`@bumpinto/shared`), içerik
 * dosyaları stil taşımaz — web `LegalBlocks` ile aynı veriyi aynı sırayla basar, ikisi
 * ayrışamaz.
 */
export default function LegalReader({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <View style={s.stack}>
      {blocks.map((b, i) => {
        if ("h" in b) {
          return (
            <AppText key={i} variant="h2" style={s.h}>
              {b.h}
            </AppText>
          );
        }

        if ("p" in b) {
          // `strong` paragrafın İÇİNDEKİ cümlenin birebir kopyası; bulunamazsa düz basılır
          // (çeviri parçalanmasın diye metin tek dize kalır).
          const cut = b.strong && b.p.includes(b.strong) ? b.p.split(b.strong) : null;
          const tone = b.muted ? s.muted : undefined;
          return (
            <AppText key={i} variant="body" style={tone}>
              {cut ? (
                <>
                  {cut[0]}
                  <AppText variant="body" style={[tone, s.bold]}>
                    {b.strong}
                  </AppText>
                  {cut.slice(1).join(b.strong as string)}
                </>
              ) : (
                b.p
              )}
            </AppText>
          );
        }

        if ("note" in b) {
          return (
            <Card key={i} tone="amber" style={s.note}>
              <InfoIcon size={17} color={colors.amber} weight="fill" />
              <AppText variant="muted" style={s.noteText}>
                {b.note}
              </AppText>
            </Card>
          );
        }

        if ("ul" in b) {
          return (
            <View key={i} style={s.ul}>
              {b.ul.map((item) => (
                <View key={item} style={s.li}>
                  <AppText variant="body" style={s.bullet}>
                    {"•"}
                  </AppText>
                  <AppText variant="body" style={s.liText}>
                    {item}
                  </AppText>
                </View>
              ))}
            </View>
          );
        }

        if ("table" in b) {
          return (
            <Card key={i} padded={false} style={s.table}>
              {b.table.map(([left, right], row) => (
                <Fragment key={left}>
                  {row > 0 ? <View style={s.divider} /> : null}
                  <View style={s.tableRow}>
                    <AppText variant="over" style={s.tableKey}>
                      {left}
                    </AppText>
                    <AppText variant="muted" style={s.tableValue}>
                      {right}
                    </AppText>
                  </View>
                </Fragment>
              ))}
            </Card>
          );
        }

        const [before, label, href] = b.link;
        return (
          <AppText key={i} variant="body">
            {before}
            <AppText variant="body" style={s.link} onPress={() => void Linking.openURL(href)}>
              {label}
            </AppText>
          </AppText>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: 10 },
  h: { marginTop: 6 },
  muted: { color: colors.ink2 },
  bold: { fontWeight: "700" },
  note: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.amberWash },
  noteText: { flex: 1, color: colors.ink },
  ul: { gap: 4 },
  li: { flexDirection: "row", gap: 8 },
  bullet: { color: colors.ink2 },
  liText: { flex: 1 },
  table: { paddingVertical: 4 },
  tableRow: { flexDirection: "row", gap: 12, paddingVertical: 9, paddingHorizontal: 14 },
  tableKey: { width: 108 },
  tableValue: { flex: 1, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: 14 },
  link: { color: colors.flameDeep, textDecorationLine: "underline" },
  radius: { borderRadius: radius.card },
});
