import {
  fairnessLine,
  fairnessOf,
  initialOf,
  personTint,
  type FairnessLine,
  type FairnessVenue,
  type TravelInfo,
} from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors, fonts, shadow } from "../../theme";
import { AppText } from "../atoms";

/**
 * Artboard `.rg` / `.rg-t` / `.rg-v` / `.rg-g` — dar liste satırında TEK yol göstergesi:
 * bant + baş harf noktaları + "25–35 dk", altında adalet cümlesi.
 *
 * **ROZET ÇORBASI YASAK** (karar dok. §4, GUIDE kural 10): "Sen ~30 dk ▲ · fark 5 dk" rozetleri
 * kalktı; aynı bilgi burada TEK yerde yaşıyor.
 *
 * Dakika aritmetiği `fairnessOf`, cümle `fairnessLine` — ikisi de `@bumpinto/shared`'ta,
 * web ile TEK uygulama. Bu dosyada ikinci bir hesap YOK.
 *
 * Nokta DOLGUSU kimliktir (kişi rengi): "Ayşe" ve "Ahmet" ikisi de "A", baş harf ayırt etmiyor.
 * Aykırı kişi amber KENARLIK, kendi noktan koyu DIŞ halka alır — ikisi de HUE değil BİÇİM
 * taşır, kimlik rengiyle çakışmaz ve üst üste binebilir.
 */

/** İz uçlarında %15 pay — uç noktalar kırpılmasın (artboard %15…%85). */
function pos(minutes: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.min(100, Math.max(0, 15 + (70 * (minutes - min)) / (max - min)));
}

/** Aynı dakikadaki kişiler AYNI yüzdeye düşer ve noktalar birbirini tamamen örter — 2 kişilik
    bir grupta "herkes ~30 dk" satırı TEK nokta gösterirdi, yani ikinci kişi ekranda olmazdı.
    Beraberlikler nokta genişliği kadar simetrik yelpazelenir; sıra `entries` sırasıdır. */
const TIE_GAP = 5.5;

function fanned(entries: { id: string; minutes: number }[], min: number, max: number) {
  const groups = new Map<number, string[]>();
  for (const e of entries) groups.set(e.minutes, [...(groups.get(e.minutes) ?? []), e.id]);
  const left = new Map<string, number>();
  for (const [minutes, ids] of groups) {
    const base = pos(minutes, min, max);
    ids.forEach((id, i) => {
      const offset = (i - (ids.length - 1) / 2) * TIE_GAP;
      left.set(id, Math.min(97, Math.max(3, base + offset)));
    });
  }
  return left;
}

export default function RangeBar(p: { venue: FairnessVenue; travel: TravelInfo }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "tr";
  const f = fairnessOf(p.venue);
  if (!f || f.entries.length === 0) return null;

  const many = f.entries.length > 1;
  const line = fairnessLine(f, p.travel, t);
  const left = fanned(f.entries, f.min, f.max);
  const name = (id: string) => p.travel.names?.[id] ?? p.travel.labels[id] ?? t("travel.friend");
  const value = f.min === f.max
    ? t("travel.min", { min: f.max })
    : t("travel.range", { min: f.min, max: f.max });
  // Noktalar dekoratif — kişi başı dakika ekran okuyucuya BANDIN etiketinden verilir.
  // Cümlede "Sen" kullanılır (`labels`), noktanın harfinde HAM ad (`names`) — biri okunur,
  // diğeri başlıktaki avatarla eşleşmek zorunda.
  const a11y = f.entries
    .map((e) => `${p.travel.labels[e.id] ?? t("travel.friend")} ${t("travel.min", { min: e.minutes })}`)
    .join(", ");

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <View accessibilityLabel={a11y} style={s.track}>
          {/* Herkes eşit dakikadaysa 0 genişlikli bant çizilmez. */}
          {many && f.min !== f.max ? (
            <View
              style={[
                s.span,
                {
                  left: `${pos(f.min, f.min, f.max)}%`,
                  width: `${pos(f.max, f.min, f.max) - pos(f.min, f.min, f.max)}%`,
                  // Bant rengi `line.leadTone`dan — cümleyle TEK kaynak (WCAG 1.4.1: renk
                  // her zaman aynı tondaki metinle eşleşir).
                  backgroundColor: line.leadTone === "amber" ? colors.amber : colors.grass,
                },
              ]}
            />
          ) : null}

          {f.entries.map((e) => {
            const self = p.travel.selfId != null && e.id === p.travel.selfId;
            return (
              <View
                key={e.id}
                testID={`range-dot-${e.id}`}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  s.dot,
                  { left: `${left.get(e.id) ?? pos(e.minutes, f.min, f.max)}%` },
                  e.id === f.outlierId ? s.dotFar : null,
                  self ? s.dotSelf : null,
                ]}
              >
                <LinearGradient
                  colors={[...personTint(p.travel.colors?.[e.id])]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.dotFill}
                />
                <AppText style={s.initial}>{initialOf(name(e.id), locale)}</AppText>
              </View>
            );
          })}
        </View>

        <AppText variant="num" style={s.value}>
          {value}
        </AppText>
      </View>

      <FairnessNote line={line} />
    </View>
  );
}

/**
 * Adalet cümlesi (`.rg-g`) — bant ALTINDAKİ tek satır.
 *
 * `RangeBar` ve `TravelBars` AYNI cümleyi basar; iki kopya ayrışırsa aynı mekan liste
 * satırında "Herkese ~aynı", kart yüzeyinde başka bir şey derdi. Hesap `fairnessLine`
 * (shared), sunum burada — tek yerde.
 */
export function FairnessNote({ line }: { line: FairnessLine }) {
  if (!line.lead && line.rest.length === 0) return null;
  return (
    <AppText variant="muted" style={s.note}>
      {line.lead ? (
        <AppText variant="muted" style={[s.lead, line.leadTone === "amber" ? s.leadFar : null]}>
          {line.lead}
        </AppText>
      ) : null}
      {line.lead && line.rest.length > 0 ? " · " : ""}
      {line.rest.join(" · ")}
    </AppText>
  );
}

const DOT = 18;

const s = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 22 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.track },
  span: { position: "absolute", top: 0, height: 6, borderRadius: 3 },
  dot: {
    position: "absolute",
    top: 3,
    marginTop: -DOT / 2,
    marginLeft: -DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: colors.card,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.s1,
  },
  dotFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  dotFar: { borderColor: colors.amber },
  dotSelf: { borderColor: colors.ink },
  initial: { fontFamily: fonts.head, fontSize: 9, color: "#fff" },
  value: { minWidth: 64, textAlign: "right" },
  note: { fontSize: 12 },
  lead: { color: colors.ink, fontWeight: "700" },
  leadFar: { color: colors.amberInk },
});
