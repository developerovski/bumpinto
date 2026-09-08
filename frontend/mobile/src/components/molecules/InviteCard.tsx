import * as Clipboard from "expo-clipboard";
import { CheckIcon, CopyIcon, ShareNetworkIcon } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Share, StyleSheet, View } from "react-native";

import { webBase } from "../../lib/api";
import { colors, fonts, space } from "../../theme";
import { AppText, Button, Card, IconButton } from "../atoms";

/**
 * Artboard P6/P7 — TEK SATIR davet kartı: solda link + kod, sağda ikon-only kopyala ve
 * "Paylaş". Flame-wash zemin, `#F6C6D2` kenar (paletin ara tonu, token değil).
 *
 * "Kopyalandı" geri bildirimi kod satırında da basılır: dokunulan öğe onay vermezse kullanıcı
 * gözünü ekranın başka yerinde arıyor.
 *
 * `compact` (P6: link paylaşıldıktan sonra kart küçülür) kod satırını düşürür — oturumda
 * ikinci kişi varsa link zaten iletilmiştir, kod artık bilgi taşımaz.
 */
export default function InviteCard(p: { slug: string; joinCode?: string; sessionName?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const url = `${webBase}/j/${p.slug}`;
  // Kabuk ("https://") ekranda gösterilmez, panoya TAM link gider.
  const shown = url.replace(/^https?:\/\//, "");

  function copy() {
    void Clipboard.setStringAsync(url).then(() => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card style={s.card}>
      <View style={s.text}>
        <AppText variant="over" style={s.overline}>
          {t("lobby.invite")}
        </AppText>
        <AppText style={s.link} numberOfLines={1}>
          {shown}
        </AppText>
        {copied ? (
          <AppText variant="muted" accessibilityLiveRegion="polite" style={s.copied}>
            {t("lobby.copied")}
          </AppText>
        ) : p.compact ? null : (
          <AppText variant="muted">
            {/* `joinCode` YOKSA kod satırı uydurulmaz — yalnız "hesap gerekmez" kalır. */}
            {p.joinCode ? (
              <Trans
                i18nKey="lobby.code"
                values={{ code: p.joinCode }}
                components={[<AppText key="0" variant="num" style={s.code} />]}
              />
            ) : (
              t("lobby.noAccount")
            )}
          </AppText>
        )}
      </View>

      <IconButton
        label={t(copied ? "lobby.copied" : "lobby.copy")}
        onPress={copy}
        icon={
          copied ? (
            <CheckIcon size={18} color={colors.grass} weight="bold" />
          ) : (
            <CopyIcon size={18} color={colors.ink} />
          )
        }
      />
      <Button
        small
        title={t("lobby.share")}
        icon={<ShareNetworkIcon size={16} color="#fff" />}
        onPress={() =>
          void Share.share({
            message: `${t("venues.inviteText", { name: p.sessionName ?? "" })} ${url}`,
          })
        }
        style={s.share}
      />
    </Card>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.flameWash,
    borderColor: "#F6C6D2",
    paddingVertical: space.rowY - 1,
    paddingLeft: 14,
    paddingRight: 10,
  },
  text: { flex: 1, gap: 2, minWidth: 0 },
  overline: { color: colors.flameDeep },
  link: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  code: { color: colors.ink, fontWeight: "700" },
  copied: { color: colors.grass, fontWeight: "700" },
  share: { width: "auto", flexShrink: 0 },
});
