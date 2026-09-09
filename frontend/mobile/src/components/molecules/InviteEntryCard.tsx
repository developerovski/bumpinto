/* Kaynak: artboard P2 · Oturumlar (boş) — "Bir davet linkin mi var?" kartı. */
import { parseInvite } from "@bumpinto/shared";
import { router } from "expo-router";
import { QrCodeIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { api } from "../../lib/api";
import { colors } from "../../theme";
import { AppText, Button, Card, IconButton, Input } from "../atoms";

/**
 * Kod ya da link ile katılım — TEK çözümleyici (`parseInvite`, shared).
 *
 * Link yapıştırıldıysa uç ÇAĞRILMAZ: slug zaten elimizde, gereksiz bir istek atmayız.
 * Kod girildiyse `by-code` slug'a çevirir; kod yanlışsa satırın altında tek cümle çıkar —
 * ayrı bir hata ekranına atmak, beş harf yanlış yazan kullanıcıya fazla ceza.
 */
export default function InviteEntryCard() {
  const { t } = useTranslation();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(text: string) {
    const invite = parseInvite(text);
    if (!invite) {
      setError(t("code.invalid"));
      return;
    }
    setError(null);
    if (invite.kind === "slug") {
      router.push(`/j/${invite.slug}`);
      return;
    }
    setBusy(true);
    try {
      const preview = await api.sessionByCode(invite.code);
      if (!preview.slug) throw new Error("no slug");
      router.push(`/j/${preview.slug}`);
    } catch {
      setError(t("code.notFound"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <AppText variant="h3">{t("code.label")}</AppText>
      <View style={s.row}>
        <Input
          testID="invite-input"
          value={raw}
          onChangeText={setRaw}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={t("code.hint")}
          placeholder={t("code.hint")}
          invalid={!!error}
          containerStyle={s.input}
          onSubmitEditing={() => void submit(raw)}
        />
        <IconButton
          label={t("code.scan")}
          onPress={() => router.push("/(sheets)/scan")}
          icon={<QrCodeIcon size={20} color={colors.ink} />}
        />
      </View>
      {error ? (
        <AppText variant="muted" accessibilityLiveRegion="polite" style={s.error}>
          {error}
        </AppText>
      ) : null}
      <Button
        small
        kind="white"
        disabled={busy}
        title={t("code.join")}
        style={s.cta}
        onPress={() => void submit(raw)}
      />
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  input: { flex: 1 },
  error: { color: colors.flameDeep, marginTop: 6 },
  cta: { marginTop: 10 },
});
