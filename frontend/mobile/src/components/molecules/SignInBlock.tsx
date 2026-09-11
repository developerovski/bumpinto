import * as AppleAuthentication from "expo-apple-authentication";
import { Link } from "expo-router";
import { AppleLogoIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme";
import { AppText, Button, GoogleLogo } from "../atoms";

/**
 * Landing'in giriş düğmeleri, bir akışın İÇİNDE (plan detayı). Giriş bitince aynı ekranda devam
 * edilir — Landing gibi `/sessions`'a atılmaz, kullanıcı bulunduğu plandan kopmaz (web
 * `SignInBlock onDone` kararı). Sağlayıcı yolu `authStore`'da tek (Google + Apple).
 *
 * `molecules/index`e BİLEREK eklenmez: `authStore`u (Google SDK yapılandırması) içe aktarır ve
 * dizin üzerinden her bileşen testine sızardı.
 */
export default function SignInBlock() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signInApple = useAuthStore((s) => s.signInApple);
  const [appleReady, setAppleReady] = useState(false);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleReady, () => setAppleReady(false));
  }, []);

  const busy = status === "busy";
  return (
    <View style={s.block}>
      <Button
        kind="white"
        title={t("landing.google")}
        icon={<GoogleLogo size={18} />}
        disabled={busy}
        onPress={() => void signIn()}
      />
      {appleReady ? (
        <Button
          kind="white"
          title={t("landing.apple")}
          icon={<AppleLogoIcon size={18} color={colors.ink} weight="fill" />}
          disabled={busy}
          onPress={() => void signInApple()}
        />
      ) : null}
      {error ? (
        <AppText variant="muted" style={s.error}>
          {t(error)}
        </AppText>
      ) : null}
      <AppText variant="muted" style={s.terms}>
        <Trans
          i18nKey="landing.legal"
          components={[
            <Link key="0" href="/account/legal/terms" style={s.link} />,
            <Link key="1" href="/account/legal/privacy" style={s.link} />,
          ]}
        />
      </AppText>
    </View>
  );
}

const s = StyleSheet.create({
  block: { gap: 10 },
  error: { color: colors.flameDeep, textAlign: "center" },
  terms: { textAlign: "center", fontSize: 12 },
  link: { color: colors.flameDeep, textDecorationLine: "underline" },
});
